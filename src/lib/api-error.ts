import { NextResponse } from "next/server";

/**
 * Helper untuk membuat response error API yang konsisten.
 *
 * `message` harus berupa translation key (mis. "auth.emailExists") — bukan
 * teks mentah. Client menerjemahkannya lewat `translateApiError` sehingga
 * pengguna ID dan EN selalu mendapat pesan dalam bahasanya masing-masing.
 *
 * Untuk kasus response yang butuh field tambahan (mis. `error`, `success`),
 * gunakan parameter `extra`.
 */
export function apiError(
  message: string,
  status = 400,
  extra: Record<string, unknown> = {}
): NextResponse {
  return NextResponse.json({ message, ...extra }, { status });
}
