// Daftar username yang direserved — tidak boleh digunakan user
export const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "root", "superuser", "system",
  "api", "api-v1", "api-v2", "v1", "v2",
  "login", "register", "signup", "signin", "logout",
  "forgot-password", "reset-password",
  "settings", "setting", "config", "configuration",
  "profile", "account", "user", "users",
  "home", "beranda",
  "projects", "project",
  "freelance", "jobs", "job",
  "technews", "tech-news",
  "notifications", "notif",
  "trending", "trend",
  "about", "privacy", "terms", "contact",
  "help", "support", "faq",
  "search", "cari",
  "pamerproject", "pamer",
  "null", "undefined",
  "index", "main", "default",
]);

/**
 * Generate base username dari nama pengguna — MURNI/sinkron, tanpa akses DB,
 * aman dipakai di client (preview form) maupun server.
 *
 * Aturan:
 * - lowercase, buang spasi & karakter aneh, maksimal 15 karakter
 * - fallback "user" bila kosong
 * - bila hasilnya reserved (mis. "admin"), tambah suffix "u" → "adminu"
 *
 * Catatan: fungsi ini TIDAK menjamin keunikan — cek ketersediaan & tambah
 * suffix angka dilakukan oleh `getUniqueUsername()` di `lib/username.server.ts`.
 */
export function generateUsername(name: string): string {
  // Ambil dari name, lowercase, buang karakter aneh
  let base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "");

  // Fallback "user" hanya untuk nama kosong/tak valid — jangan dianggap
  // reserved (jadi hasilnya "user", bukan "useru").
  const isEmpty = !base;
  if (isEmpty) base = "user";
  if (base.length > 15) base = base.slice(0, 15);

  // Jika base ternyata reserved, tambah suffix "u"
  if (!isEmpty && RESERVED_USERNAMES.has(base)) {
    base += "u";
  }

  return base;
}
