import { NextRequest, NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { cacheHeaders } from "@/lib/cache";

const MAX_RESPONSE_BYTES = 256 * 1024; // 256KB — batas ukuran body preview

/**
 * Proteksi SSRF (fix S1): tolak URL yang mengarah ke IP privat/loopback/
 * link-local/metadata cloud. Berikut daftar blokir:
 * - 127.0.0.0/8, ::1            (loopback)
 * - 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 (private)
 * - 169.254.0.0/16, fe80::/10   (link-local — termasuk 169.254.169.254 metadata)
 * - 0.0.0.0/8                   (this network)
 * - 100.64.0.0/10               (CGNAT)
 * - fc00::/7                    (ULA)
 */
function isBlockedIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 0) return true;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  if (isIP(ip) === 6) {
    const lower = ip.toLowerCase();
    // IPv4-mapped IPv6 (::ffff:127.0.0.1 / ::ffff:7f00:1) — parse IPv4
    // yang dikemas dan blokir juga. Ini bypass yang sering dipakai untuk
    // menembus blokir IPv4 (fix lanjutan S1).
    if (lower.startsWith("::ffff:")) {
      const rest = lower.slice(7);
      const dotted = rest.match(/^(\d{1,3}(?:\.\d{1,3}){3})$/);
      if (dotted) return isBlockedIp(dotted[1]);
      const hex = rest.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
      if (hex) {
        const hi = parseInt(hex[1], 16);
        const lo = parseInt(hex[2], 16);
        return isBlockedIp(`${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`);
      }
      return true; // Format mapped tak dikenal — tolak
    }
    if (lower === "::1") return true;
    if (lower.startsWith("fe80")) return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    // IPv4-compatible/embedded IPv6 (mis. ::127.0.0.1, ::ffff:0:127.0.0.1,
    // 2001:db8::192.168.1.1) — ekstrak dotted-quad di akhir lalu blokir
    const embedded = lower.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
    if (embedded) return isBlockedIp(embedded[1]);
    return false;
  }
  return true; // Bukan IP valid — anggap berbahaya
}

/** Cek apakah hostname aman (bukan IP privat & DNS tidak mengarah ke IP privat). */
async function isHostnameBlocked(hostname: string): Promise<boolean> {
  // localhost & variannya
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return true;

  // Jika hostname berupa IP literal — cek langsung
  if (isIP(hostname)) return isBlockedIp(hostname);

  // Jika hostname DNS — resolve & cek SEMUA alamatnya (antisipasi DNS rebinding)
  try {
    const addresses = await lookup(hostname, { all: true });
    return addresses.some((addr) => isBlockedIp(addr.address));
  } catch {
    return true; // Gagal resolve — tolak
  }
}

/** Baca body response dengan batas maksimum (S8 — cegah memory exhaustion). */
async function readBodyLimited(res: Response, maxBytes: number): Promise<string | null> {
  const contentLength = Number(res.headers.get("content-length") || 0);
  if (contentLength > maxBytes) return null;

  if (!res.body) return null;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let result = "";
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes) return null;
      result += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  return result + decoder.decode();
}

interface OgData {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  url: string;
}

function parseOgMeta(html: string, url: string): OgData {
  const getMeta = (prop: string): string | null => {
    const patterns = [
      new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${prop}["']`, 'i'),
      new RegExp(`<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${prop}["']`, 'i'),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const title =
    getMeta("og:title") ||
    getMeta("twitter:title") ||
    html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ||
    null;

  const description =
    getMeta("og:description") ||
    getMeta("twitter:description") ||
    getMeta("description") ||
    null;

  const image =
    getMeta("og:image") ||
    getMeta("twitter:image") ||
    null;

  const siteName =
    getMeta("og:site_name") ||
    null;

  return {
    title: title?.trim() || null,
    description: description?.trim() || null,
    image: image?.trim() || null,
    siteName: siteName?.trim() || null,
    url,
  };
}

export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimit(getRateLimitKey(req, "link-preview"), { max: 30, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "auth.tooManyRequests" },
        { status: 429 }
      );
    }

    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "error.urlRequired" }, { status: 400 });
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
      if (!["http:", "https:"].includes(targetUrl.protocol)) {
        return NextResponse.json({ error: "error.urlProtocolRequired" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "error.invalidUrl" }, { status: 400 });
    }

    // Blokir SSRF: IP privat/loopback/link-local/metadata (fix S1)
    if (await isHostnameBlocked(targetUrl.hostname)) {
      return NextResponse.json({ error: "error.invalidUrl" }, { status: 400 });
    }

    const res = await fetch(targetUrl.toString(), {
      signal: AbortSignal.timeout(5000),
      redirect: "manual", // Jangan ikuti redirect otomatis — cegah redirect ke IP privat
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PamerProjectBot/1.0; +https://pamerproject.com)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    // Redirect manual — validasi tiap hop agar tidak berakhir di IP privat
    let currentUrl = targetUrl;
    for (let hop = 0; hop < 5 && res.status >= 300 && res.status < 400; hop++) {
      const location = res.headers.get("location");
      if (!location) break;
      const next = new URL(location, currentUrl);
      if (!["http:", "https:"].includes(next.protocol) || (await isHostnameBlocked(next.hostname))) {
        return NextResponse.json({ error: "error.invalidUrl" }, { status: 400 });
      }
      currentUrl = next;
      const nextRes = await fetch(next.toString(), {
        signal: AbortSignal.timeout(5000),
        redirect: "manual",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; PamerProjectBot/1.0; +https://pamerproject.com)",
          "Accept": "text/html,application/xhtml+xml",
        },
      });
      if (nextRes.ok) {
        const html = await readBodyLimited(nextRes, MAX_RESPONSE_BYTES);
        if (html === null) return NextResponse.json({ og: null }, { headers: cacheHeaders(60) });
        const og = parseOgMeta(html, next.toString());
        return NextResponse.json({ og }, { headers: cacheHeaders(300) });
      }
      if (!nextRes.body) break;
      // Lanjut ke hop berikutnya
      Object.assign(res, nextRes);
    }

    if (!res.ok) {
      return NextResponse.json({ og: null }, { headers: cacheHeaders(60) });
    }

    const html = await readBodyLimited(res, MAX_RESPONSE_BYTES);
    if (html === null) return NextResponse.json({ og: null }, { headers: cacheHeaders(60) });
    const og = parseOgMeta(html, currentUrl.toString());

    return NextResponse.json({ og }, { headers: cacheHeaders(300) });
  } catch {
    return NextResponse.json({ og: null });
  }
}
