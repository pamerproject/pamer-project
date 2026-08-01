import id from "@/lib/lang/id";

/**
 * Parse the Post.image JSON field into structured data.
 * Supports:
 * - JSON object: { imgs: string[], lnk?: string, gh?: string }
 * - JSON array: string[]
 * - Plain URL string (backward compat)
 */
export function parsePostImage(
  image: string | null
): { images: string[]; linkUrl: string | null; githubUrl: string | null } {
  if (!image) return { images: [], linkUrl: null, githubUrl: null };
  try {
    const parsed = JSON.parse(image);
    if (Array.isArray(parsed)) {
      return { images: parsed, linkUrl: null, githubUrl: null };
    }
    if (parsed && typeof parsed === "object") {
      return {
        images: Array.isArray(parsed.imgs) ? parsed.imgs : [],
        linkUrl: parsed.lnk || null,
        githubUrl: parsed.gh || null,
      };
    }
  } catch {
    // Not JSON — plain URL string (backward compat)
  }
  return { images: [image], linkUrl: null, githubUrl: null };
}

/**
 * Format a date string into relative time using translation function.
 */
export function getTimeAgo(dateStr: string, t: (key: string, params?: Record<string, string | number>) => string, lang?: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return t("timeAgo.justNow");
  if (diffMin < 60) return t("timeAgo.minutes", { n: diffMin });
  if (diffHour < 24) return t("timeAgo.hours", { n: diffHour });
  if (diffDay < 7) return t("timeAgo.days", { n: diffDay });
  return new Date(dateStr).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "short",
  });
}

/**
 * Encode position + zoom into a single string for storage.
 * Format: "position:zoom" (e.g., "center:150" or just "center" for default 100%)
 */
export function encodePositionZoom(position: string, zoom: number): string {
  if (zoom === 100) return position; // backward compat
  return `${position}:${zoom}`;
}

/**
 * Decode stored position string into position name & zoom percentage.
 */
export function decodePositionZoom(stored: string): { position: string; zoom: number } {
  if (!stored || !stored.includes(":")) {
    return { position: stored || "center", zoom: 100 };
  }
  const parts = stored.split(":");
  const zoom = parseInt(parts[1], 10);
  return {
    position: parts[0],
    zoom: isNaN(zoom) ? 100 : Math.max(50, Math.min(200, zoom)),
  };
}

/**
 * Map position string to CSS object-position value.
 */
export function getObjPosition(pos: string): string {
  // Support encoded format "position:zoom"
  const { position } = decodePositionZoom(pos);
  if (position === "top") return "center top";
  if (position === "bottom") return "center bottom";
  return "center center";
}

/**
 * Get zoom level from stored position string (default 100%).
 */
export function getZoomLevel(pos: string): number {
  return decodePositionZoom(pos).zoom;
}

/**
 * Valid position values for avatar/cover.
 */
export const VALID_POSITIONS = ["top", "center", "bottom"] as const;
export type Position = (typeof VALID_POSITIONS)[number];

/**
 * Map pesan error dari API (Bahasa Indonesia, format lama) ke translation key.
 * Hanya dipakai sebagai fallback — route baru sudah mengirim translation key
 * langsung (lihat `apiError` di lib/api-error.ts).
 */
const LEGACY_API_ERROR_MAP: Record<string, string> = {
    "Semua field harus diisi": "auth.allFieldsRequired",
    "Format email tidak valid": "auth.invalidEmail",
    "Email sudah terdaftar": "auth.emailExists",
    "Akun berhasil dibuat": "auth.accountCreated",
    "Email harus diisi": "auth.emailRequired",
    "Token dan password harus diisi": "auth.tokenAndPasswordRequired",
    "Token tidak valid atau sudah kadaluarsa": "auth.invalidToken",
    "Password berhasil diubah. Silakan login.": "auth.passwordChanged",
    "Terjadi kesalahan. Silakan coba lagi nanti.": "auth.errorTryAgain",
    "Terjadi kesalahan. Silakan coba lagi.": "auth.errorTryAgain",
    "Terlalu banyak permintaan. Silakan coba lagi nanti.": "auth.tooManyRequests",
    "Terlalu banyak request, coba lagi nanti": "auth.tooManyRequests",
    "Jika email terdaftar, link reset password akan dikirimkan.": "auth.ifEmailRegistered",
    // ── Email Verification ────────────────────────────────
    "Verifikasi email terlebih dahulu": "auth.emailNotVerified",
    "Token verifikasi diperlukan": "auth.verifyTokenRequired",
    "Token verifikasi tidak valid atau sudah kadaluarsa": "auth.verifyInvalidToken",
    "Email berhasil diverifikasi": "auth.verifySuccessMsg",
    "Email sudah terverifikasi": "auth.alreadyVerified",
    "Email verifikasi telah dikirim": "auth.verifySent",
    "Username wajib diisi": "auth.usernameRequired",
    "Password saat ini dan password baru harus diisi": "auth.currentAndNewRequired",
    "Akun ini tidak memiliki password (mungkin login via sosial)": "auth.noPasswordSocialLogin",
    "Password saat ini salah": "auth.wrongCurrentPassword",
    "Posisi avatar tidak valid": "auth.invalidPosition",
    "Posisi cover tidak valid": "auth.invalidPosition",
    "Tidak ada data yang diupdate": "auth.noDataToUpdate",
    "Harus login": "auth.loginRequired",
    "Harus login terlebih dahulu": "auth.loginRequired",
    "User tidak ditemukan": "error.userNotFound",
    "Username tidak cocok": "settings.usernameMismatch",
    "Gagal menghapus akun": "settings.deleteError",
    // ── Comments & Posts ────────────────────────────────
    "Komentar tidak ditemukan": "auth.commentNotFound",
    "Bukan komentar Anda": "auth.notYourComment",
    "Konten tidak boleh kosong": "auth.contentCannotBeEmpty",
    "Komentar tidak boleh kosong": "auth.commentCannotBeEmpty",
    "Hanya pemilik postingan yang bisa menyematkan komentar": "auth.onlyPostOwnerCanPin",
    "Isi minimal teks, gambar, atau link": "auth.contentRequired",
    "Judul project harus diisi": "auth.projectTitleRequired",
    "Postingan tidak ditemukan": "auth.postNotFound",
    "Komentar induk tidak ditemukan": "auth.parentCommentNotFound",
    "Tidak bisa membalas komentar yang sudah merupakan balasan": "auth.cannotReplyToReply",
    "Bukan postinganmu": "auth.notYourPost",
    "Postingan berhasil dihapus": "auth.postDeleted",
    "Project tidak ditemukan": "auth.projectNotFound",
    "Forbidden": "auth.forbidden",
    "Unauthorized": "auth.loginRequired",
    // ── Jobs ────────────────────────────────────────────
    "Judul lowongan wajib diisi": "auth.jobTitleRequired",
    "Nama perusahaan wajib diisi": "auth.companyNameRequired",
    "Lowongan tidak ditemukan": "auth.jobNotFound",
    "Bukan lowongan kamu": "auth.notYourJob",
    "Lowongan berhasil dihapus": "auth.jobDeleted",
    // ── Notifications ───────────────────────────────────
    "Gagal memuat notifikasi": "auth.failedToLoadNotifications",
    "Gagal update notifikasi": "auth.failedToUpdateNotifications",
    "Gagal menghapus notifikasi": "auth.failedToDeleteNotifications",
    // ── Generic catch / fallback ────────────────────────
    "Gagal": "error.failedToLoad",
    "Gagal memuat data": "error.failedToLoad",
    "Gagal memuat postingan": "home.loadFailed",
    "Gagal memuat komentar": "error.failedToLoad",
    "Gagal membuat komentar": "error.failedToLoad",
    "Gagal membuat postingan": "error.failedToLoad",
    "Gagal memuat lowongan": "error.failedToLoad",
    // ── Admin / Pin ─────────────────────────────────────
    "Maksimal 5 project yang bisa disematkan. Lepas sematan salah satu project terlebih dahulu.": "rightSidebar.maxPinnedWarning",
    "Project atau Post id harus diisi dengan type project/post": "settings.pinTypeRequired",
    "Pin dibersihkan": "settings.pinCleared",
    // ── Halaman (Admin) ─────────────────────────────────
    "Halaman tidak dikenal": "contentTab.unknownPage",
    // ── Event ───────────────────────────────────────────
    "Event tidak ditemukan": "event.notFound",
    "Event ini tidak aktif": "event.notActive",
    "Event berhasil dihapus": "event.deletedSuccess",
    "Judul event wajib diisi": "event.createTitleRequired",
    "Deskripsi event wajib diisi": "event.createDescriptionRequired",
    "Durasi event wajib diisi": "event.createDurationRequired",
    // ── Upload (field error) ────────────────────────────
    "Terlalu banyak upload. Tunggu 1 menit.": "settings.tooManyUploads",
    "Penyimpanan (R2) belum dikonfigurasi. Hubungi admin.": "settings.r2NotConfigured",
    "File tidak ditemukan": "settings.fileNotFound",
    "Ukuran file maksimal 512KB": "settings.fileTooBig",
    "Ukuran gambar maksimal 512KB": "settings.photoTooBig",
    "Gagal memproses file": "settings.uploadFailed",
    "Upload gagal. Coba lagi, atau gunakan format yang didukung: JPG, PNG, WebP, GIF, AVIF, PDF, DOC.": "settings.uploadInvalidFormat",
    // ── Link Preview (field error) ──────────────────────
    "Terlalu banyak permintaan": "auth.tooManyRequests",
    "Parameter url wajib diisi": "error.urlRequired",
    "URL harus menggunakan http atau https": "error.urlProtocolRequired",
    "URL tidak valid": "error.invalidUrl",
  };

/**
 * Terjemahkan pesan error dari API ke bahasa aktif.
 *
 * Mendukung dua format:
 * 1. Translation key langsung (mis. "auth.emailExists") — route baru.
 * 2. Teks Bahasa Indonesia lama (mis. "Email sudah terdaftar") — fallback
 *    bagi route/versi lama yang belum di-migrasi.
 *
 * Fallback terakhir: kembalikan message apa adanya.
 */
export function translateApiError(
  message: string,
  t: (path: string, params?: Record<string, string | number>) => string
): string {
  if (isTranslationPath(message)) {
    return t(message);
  }

  const key = LEGACY_API_ERROR_MAP[message];
  return key ? t(key) : message;
}

/**
 * Cek apakah `path` adalah translation key yang valid pada kamus bahasa
 * Indonesia (structure-nya sama dengan EN).
 */
function isTranslationPath(path: string): boolean {
  let node: unknown = id;
  for (const segment of path.split(".")) {
    if (node === null || typeof node !== "object") return false;
    node = (node as Record<string, unknown>)[segment];
  }
  return typeof node === "string";
}
