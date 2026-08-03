"use client";

import { useCallback, useState } from "react";
import { useTranslation } from "@/lib/lang";

/**
 * Tombol Logout — HANYA hard navigation (tanpa signOut() client).
 *
 * Kenapa tidak pakai signOut() dari next-auth/react?
 * - signOut() = fetch() lalu window.location.href = "/"
 * - Tanpa DevTools, `/` sering di-restore dari bfcache (masih state logged-in)
 * - Dengan F12 terbuka, bfcache mati → seolah "logout berhasil"
 * - Race fetch Set-Cookie vs navigasi juga bikin gagal di kecepatan penuh
 *
 * location.replace (bukan href):
 * - Full document navigation ke /api/auth/logout
 * - Tidak menambah history entry (back tidak kembali ke "setengah logout")
 */
export default function SignOutButton() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleLogout = useCallback(() => {
    if (loading) return;
    setLoading(true);

    // Hard navigation — biarkan server clear cookie + anti-bfcache redirect
    window.location.replace("/api/auth/logout");
  }, [loading]);

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--card-border)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition-all hover:bg-[var(--background)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
          />
        </svg>
      )}
      {loading ? t("auth.loggingOut") : t("auth.logout")}
    </button>
  );
}
