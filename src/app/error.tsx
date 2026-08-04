"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/lang";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { lang } = useTranslation();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      {/* Illustration */}
      <div className="relative mb-8">
        <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-red-100 to-rose-50 dark:from-red-950/30 dark:to-rose-900/20">
          <svg
            className="h-16 w-16 text-red-400 dark:text-red-500"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
        {/* Exclamation mark overlay */}
        <div className="absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-lg font-bold text-white shadow-lg">
          !
        </div>
      </div>

      {/* Error code */}
      <h1 className="text-7xl font-black tracking-tight text-[var(--foreground)]">
        5
        <span className="text-[var(--brand)]">00</span>
      </h1>

      {/* Message */}
      <h2 className="mt-4 text-2xl font-bold text-[var(--foreground)]">
        {lang === "id" ? "Terjadi Kesalahan" : "Something Went Wrong"}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">
        {lang === "id"
          ? "Maaf, terjadi kesalahan di server kami. Tim kami sudah diberitahu dan akan segera memperbaikinya. Coba lagi sebentar ya."
          : "Sorry, something went wrong on our server. Our team has been notified and will fix it soon. Please try again in a moment."}
      </p>

      {/* Actions */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[var(--brand-hover)] hover:shadow-md active:scale-[0.97]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          {lang === "id" ? "Coba Lagi" : "Try Again"}
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-6 py-3 text-sm font-medium text-[var(--foreground)] shadow-sm transition-all hover:border-[var(--brand)] hover:text-[var(--brand)] active:scale-[0.97]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          {lang === "id" ? "Kembali ke Beranda" : "Back to Home"}
        </Link>
      </div>

      {/* Error digest (debug) */}
      {process.env.NODE_ENV === "development" && error.digest && (
        <p className="mt-6 rounded-lg bg-red-50 px-4 py-2 text-xs text-red-500 dark:bg-red-950/30">
          Error ID: {error.digest}
        </p>
      )}

      {/* Decorative elements */}
      <div className="mt-12 flex items-center gap-2 text-xs text-[var(--muted)]/40">
        <span className="h-px w-8 bg-[var(--card-border)]" />
        <span>pamerproject.com</span>
        <span className="h-px w-8 bg-[var(--card-border)]" />
      </div>
    </div>
  );
}
