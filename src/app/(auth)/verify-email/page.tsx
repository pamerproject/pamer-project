"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/lib/lang";
import { translateApiError } from "@/lib/helpers";

function VerifyEmailContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update } = useSession();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");
  const verifyRanRef = useRef(false);

  const handleVerify = useCallback(async () => {
    if (!token) {
      setError(t("auth.invalidToken"));
      setStatus("error");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(translateApiError(data.message, t) || t("auth.invalidToken"));
      }
      setStatus("success");
      // Refresh session agar emailVerified ter-update
      await update();
      // Paksa fetch ulang session di komponen lain
      window.dispatchEvent(new CustomEvent("session-refresh"));
    } catch (err: unknown) {
      // Verifikasi bisa saja SUDAH sukses di request sebelumnya (token dipakai
      // & dibersihkan), tapi request kedua gagal — mis. StrictMode double-effect
      // atau email scanner yang prefetch link. Refresh session & cek ulang.
      try {
        const refreshed = await update();
        const verified = (refreshed?.user as { emailVerified?: string | Date | null } | undefined)?.emailVerified;
        if (verified) {
          setStatus("success");
          window.dispatchEvent(new CustomEvent("session-refresh"));
          return;
        }
      } catch { /* session refresh gagal — lanjut tampilkan error */ }
      const msg = err instanceof Error ? err.message : t("auth.invalidToken");
      setError(msg);
      setStatus("error");
    }
  }, [token, t, update]);

  useEffect(() => {
    // Cegah verifikasi dijalankan lebih dari sekali per mount — efek bisa
    // terpicu ulang (StrictMode double-invoke di dev, atau `update` session
    // berubah) sehingga token single-use terkirim dua kali.
    if (verifyRanRef.current) return;
    verifyRanRef.current = true;
    handleVerify();
  }, [handleVerify]);

  return (
    <div className="mx-auto mt-12 max-w-2xl px-4 md:mt-20">
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-sm md:p-12">
        <div className="text-center">
          {status === "loading" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-light)]">
                <svg className="h-8 w-8 animate-spin text-[var(--brand)]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight">{t("auth.verifyLoading")}</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">{t("auth.verifyLoadingDesc")}</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight">{t("auth.verifySuccess")}</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">{t("auth.verifySuccessDesc")}</p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--brand-hover)]"
              >
                {t("home.mulaiPamer")}
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight">{t("auth.verifyFailed")}</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">{error}</p>
              <button
                onClick={() => router.push("/")}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--brand-hover)]"
              >
                {t("error.backToHome")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
