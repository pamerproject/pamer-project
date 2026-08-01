import { NextResponse } from "next/server";

/**
 * Cek apakah session user sudah verifikasi email.
 * Dipakai untuk mengunci aksi tulis (like, komentar, buat feed, ikut event, dsb.)
 * bagi akun yang belum konfirmasi email — mereka tetap boleh browsing.
 *
 * Admin selalu diizinkan (akun admin tidak wajib verifikasi email).
 *
 * @param errorKey Key JSON untuk pesan error. Sebagian besar route memakai
 *                 "message", tapi route upload memakai "error".
 *
 * Return: NextResponse error kalau belum terverifikasi, null kalau boleh lanjut.
 */
export function requireVerifiedEmail(
  session: {
    user?: {
      id?: string;
      role?: string;
      emailVerified?: Date | null;
    } | null;
  } | null,
  opts: { errorKey?: string } = {}
): NextResponse | null {
  const { errorKey = "message" } = opts;
  if (!session?.user?.id) {
    return NextResponse.json(
      { [errorKey]: "auth.loginRequired" },
      { status: 401 }
    );
  }
  // Admin selalu boleh melakukan aksi apapun
  if (session.user.role === "ADMIN") return null;
  if (!session.user.emailVerified) {
    return NextResponse.json(
      { [errorKey]: "auth.emailNotVerified" },
      { status: 403 }
    );
  }
  return null;
}
