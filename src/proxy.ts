import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "node:crypto";

/**
 * Middleware untuk CSRF protection, security headers, & auth guard.
 *
 * AUTH GUARD:
 * - User yang belum login hanya bisa akses halaman utama (/), /login, /register, /forgot-password
 * - Semua halaman lain (projects, freelance, detail post, dll) redirect ke /
 *
 * STRATEGI CSRF:
 * - Cek Origin/Referer header pada state-changing methods (POST, PUT, PATCH, DELETE)
 * - Jika Origin ada tapi bukan same-origin → tolak (403)
 * - Jika Origin tidak ada (mobile apps, curl, dll) → izinkan (fallback)
 */

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Skip CSRF check untuk route autentikasi (next-auth handle sendiri)
const CSRF_EXEMPT_PATHS = ["/api/auth/"];

// Halaman publik yang bisa diakses tanpa login
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  // Alur reset password & verifikasi email — user yang klik link dari email
  // SEDANG TIDAK LOGIN, jadi halaman ini wajib publik (fix B1).
  "/reset-password",
  "/verify-email",
  "/check-email",
  // Halaman statis (About, Privacy, Terms, Contact) — konten dikelola admin
  "/about",
  "/privacy",
  "/terms",
  "/contact",
];

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) return true;
  return PUBLIC_PATHS.some((p) => {
    // "/" harus exact — prefix-match akan membuat semua halaman publik
    if (p === "/") return pathname === "/";
    // Prefix match agar /reset-password/[token] & /verify-email?token=... ikut publik
    return pathname === p || pathname.startsWith(p + "/");
  });
}

function getAllowedHosts(): Set<string> {
  const hosts = new Set([
    "localhost:3000",
    "127.0.0.1:3000",
  ]);
  const nexauthUrl = process.env.NEXTAUTH_URL;
  if (nexauthUrl) {
    try {
      hosts.add(new URL(nexauthUrl).host);
    } catch {}
  }
  return hosts;
}

function isExempt(path: string): boolean {
  return CSRF_EXEMPT_PATHS.some((exempt) => path.startsWith(exempt));
}

const allowedHosts = getAllowedHosts();

function isAllowedOrigin(origin: string, host: string): boolean {
  try {
    const originHost = new URL(origin).host;
    return allowedHosts.has(originHost) || originHost === host;
  } catch {
    return false;
  }
}

function isAllowedReferer(referer: string, host: string): boolean {
  try {
    const refererHost = new URL(referer).host;
    return allowedHosts.has(refererHost) || refererHost === host;
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  // Nonce per-request untuk CSP — diteruskan ke layout lewat header x-nonce
  // agar Next.js menambahkan nonce ke inline script miliknya sendiri dan kita
  // bisa menandai inline script custom di layout (fix S3).
  const nonce = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  const { pathname } = request.nextUrl;
  const method = request.method;

  // ── Auth Guard ────────────────────────────────────────
  if (!isPublicPath(pathname)) {
    const sessionCookie =
      request.cookies.get("next-auth.session-token") ||
      request.cookies.get("__Secure-next-auth.session-token");
    if (!sessionCookie) {
      // Cek juga callbackUrl dari next-auth (untuk form POST login)
      const redirectUrl = new URL("/", request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // ── Security Headers untuk SEMUA routes ──────────────
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "0");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // ⛔ Content-Security-Policy — cegah XSS & injection
  // - 'self' untuk asal domain sendiri
  // - 'unsafe-inline' untuk style karena Tailwind CSS & inline styles
  // - script pakai NONCE per-request di production (bukan 'unsafe-inline') —
  //   inline script dark mode & milik Next.js diberi nonce oleh framework
  // - 'unsafe-eval' hanya di development (React/Turbopack butuh eval() untuk debugging)
  // - https: untuk gambar & media dari sumber eksternal
  // - blob: & data: untuk upload preview & inline SVG
  // - https://www.youtube-nocookie.com untuk YouTube embed
  // - https://fonts.googleapis.com https://fonts.gstatic.com untuk font
  // - https://*.r2.cloudflarestorage.com untuk gambar dari R2
  const scriptSrc = process.env.NODE_ENV === "production"
    ? `'self' 'nonce-${nonce}'`
    : "'self' 'unsafe-inline' 'unsafe-eval'";

  response.headers.set(
    "Content-Security-Policy",
    `default-src 'self'; ` +
    `script-src ${scriptSrc}; ` +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' https: blob: data:; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "frame-src 'self' https://www.youtube-nocookie.com; " +
    "connect-src 'self' https:; " +
    "media-src 'self' https: blob:; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'"
  );

  // 🔒 HSTS — paksa HTTPS (hanya untuk production)
  // max-age=31536000 = 1 tahun, includeSubDomains, preload
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // ── CSRF Protection (hanya untuk API routes) ─────────
  if (pathname.startsWith("/api/") && STATE_CHANGING_METHODS.has(method) && !isExempt(pathname)) {
    const host = request.headers.get("host") || "localhost:3000";
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");

    if (origin && !isAllowedOrigin(origin, host)) {
      return new NextResponse(
        JSON.stringify({ message: "CSRF validation failed" }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            "X-Content-Type-Options": "nosniff",
          },
        }
      );
    }

    if (!origin && referer && !isAllowedReferer(referer, host)) {
      return new NextResponse(
        JSON.stringify({ message: "CSRF validation failed" }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            "X-Content-Type-Options": "nosniff",
          },
        }
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api/auth/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)",
  ],
};
