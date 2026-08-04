import { NextRequest, NextResponse } from "next/server";

/**
 * Logout route — clear cookie auth, lalu land di home dengan URL unik.
 *
 * Gejala "logout berhasil hanya saat F12 terbuka":
 * - Chrome MENONAKTIFKAN bfcache saat DevTools open
 * - Tanpa DevTools, navigasi ke `/` bisa restore snapshot home yang masih logged-in
 *
 * Strategi:
 * 1. Response 200 HTML (bukan 302) — Set-Cookie + Clear-Site-Data diproses penuh
 * 2. Clear cookie yang BENAR-BENAR ada di request (+ fallback nama umum)
 * 3. location.replace ke `/?logged_out=<ts>` — URL beda = bypass bfcache `/`
 */

function serializeExpiredCookie(
  name: string,
  path: string,
  secure: boolean
): string {
  const isHost = name.startsWith("__Host-");
  const isSecurePrefixed = name.startsWith("__Secure-") || isHost;
  const finalPath = isHost ? "/" : path;
  const finalSecure = isSecurePrefixed || secure;

  const parts = [
    `${name}=`,
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    `Path=${finalPath}`,
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (finalSecure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

/** Cookie yang wajib dicoba di-clear meski tidak terlihat di request */
const FALLBACK_NAMES = [
  "next-auth.session-token",
  "next-auth.callback-url",
  "next-auth.csrf-token",
  "__Secure-next-auth.session-token",
  "__Secure-next-auth.callback-url",
  "__Host-next-auth.csrf-token",
];

function collectCookieNames(req: NextRequest): string[] {
  const names = new Set<string>(FALLBACK_NAMES);

  for (const { name } of req.cookies.getAll()) {
    if (
      name.includes("next-auth") ||
      name.includes("authjs") ||
      name.startsWith("__Secure-next-auth") ||
      name.startsWith("__Host-next-auth") ||
      name.startsWith("__Secure-authjs") ||
      name.startsWith("__Host-authjs")
    ) {
      names.add(name);
    }
  }

  return Array.from(names);
}

function appendClearCookies(response: NextResponse, req: NextRequest) {
  for (const name of collectCookieNames(req)) {
    const paths = name.startsWith("__Host-") ? ["/"] : ["/", "/api/auth"];

    for (const path of paths) {
      // Dual-clear: browser hanya terima varian yang match cookie asli
      response.headers.append(
        "Set-Cookie",
        serializeExpiredCookie(name, path, false)
      );
      response.headers.append(
        "Set-Cookie",
        serializeExpiredCookie(name, path, true)
      );
    }
  }
}

function buildLogoutHtml(dest: string): string {
  const safeDest = dest.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const jsDest = JSON.stringify(dest);

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate" />
  <meta http-equiv="Pragma" content="no-cache" />
  <meta http-equiv="refresh" content="0;url=${safeDest}" />
  <title></title>
  <style>
    body { font-family: system-ui, sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; color: #444; background: #fafafa; }
    /* Spinner loading — bahasa-netral, tanpa teks (mendukung id & en) */
    .spinner { width: 40px; height: 40px; border: 4px solid #e5e7eb; border-top-color: #dc2626; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="spinner" role="status" aria-label="Loading"></div>
  <script>
    try {
      localStorage.setItem(
        "nextauth.message",
        JSON.stringify({ event: "session", data: { trigger: "signout" }, timestamp: Date.now() })
      );
      localStorage.removeItem("nextauth.message");
    } catch (e) {}
    window.location.replace(${jsDest});
  </script>
</body>
</html>`;
}

function buildLogoutResponse(req: NextRequest) {
  const dest = `/?logged_out=${Date.now()}`;

  const response = new NextResponse(buildLogoutHtml(dest), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
      // Secure context (HTTPS / localhost): buang semua cookie origin ini
      "Clear-Site-Data": '"cookies"',
    },
  });

  appendClearCookies(response, req);

  return response;
}

export async function GET(req: NextRequest) {
  return buildLogoutResponse(req);
}

export async function POST(req: NextRequest) {
  return buildLogoutResponse(req);
}
