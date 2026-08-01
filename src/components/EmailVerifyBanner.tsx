"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/lib/lang";
import { translateApiError } from "@/lib/helpers";

/**
 * Banner yang muncul di atas konten saat user login tapi email belum diverifikasi.
 * Menampilkan tombol "kirim ulang email verifikasi".
 */
export default function EmailVerifyBanner() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  // Admin / belum login / sudah terverifikasi → tidak tampilkan apa-apa
  const user = session?.user as
    | { id?: string; role?: string; emailVerified?: Date | null }
    | undefined;
  if (!user?.id || user.role === "ADMIN" || user.emailVerified) return null;

  const resend = async () => {
    setSending(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(translateApiError(data.message, t) || t("auth.resendFailed"));
      }
      setMessage(t("auth.resendSuccess"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("auth.resendFailed");
      setMessage(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20">
            <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
              {t("auth.verifyBannerTitle")}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-800/80 dark:text-amber-300/70">
              {t("auth.verifyBannerDesc")}
            </p>
            {message && (
              <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                {message}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={resend}
            disabled={sending}
            className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-amber-600 disabled:opacity-50"
          >
            {sending ? t("auth.sending") : t("auth.resendVerify")}
          </button>
        </div>
      </div>
    </div>
  );
}
