"use client";

import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useTranslation } from "@/lib/lang";
import Feed from "@/components/Feed";
import MulaiPamerButton from "@/components/MulaiPamerButton";
import EmailVerifyBanner from "@/components/EmailVerifyBanner";

export default function Home() {
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePostSuccess = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="space-y-2">
      {status === "loading" ? (
        <div className="card-app overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-8 text-center md:rounded-none md:border-0 md:border md:px-8 md:py-12 animate-pulse">
          <div className="mx-auto h-3 w-56 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mx-auto mt-4 h-8 w-72 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mx-auto mt-3 h-3 w-96 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mx-auto mt-6 h-10 w-32 rounded-xl bg-gray-200 dark:bg-gray-700" />
        </div>
      ) : session ? (
        <div className="card-app relative overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-8 text-center md:rounded-3xl md:px-8 md:py-12">
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-[var(--brand)]/5 md:block" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-[var(--brand)]/5 md:block" />

          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand)] md:text-sm">
            {t("home.heroLoggedDesc")}
          </p>

          <h1 className="mt-3 text-2xl font-black leading-tight tracking-tight md:mt-4 md:text-4xl">
            {t("home.heroTitle")}{" "}
            <span className="text-[var(--brand)]">{t("home.heroSubtitle")}</span>{" "}
            {t("home.heroTitleEnd")}
          </h1>

          <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-[var(--muted)] md:mt-3 md:text-sm">
            {t("home.heroDesc")}
          </p>

          <div className="mt-6 flex items-center justify-center md:mt-8">
            <MulaiPamerButton
              onSuccess={handlePostSuccess}
              className="rounded-xl bg-[var(--brand)] px-6 py-2.5 text-xs font-bold text-white transition-all hover:bg-[var(--brand-hover)] active:scale-95 md:px-8 md:py-3 md:text-sm"
            >
              {t("home.mulaiPamer")}
            </MulaiPamerButton>
          </div>
        </div>
      ) : (
        <div className="card-app relative overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-16 text-center md:rounded-3xl md:px-8 md:py-20">
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-[var(--brand)]/5 md:block" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-[var(--brand)]/5 md:block" />

          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-light)]">
            <svg className="h-8 w-8 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>

          <h1 className="text-2xl font-black leading-tight tracking-tight md:text-3xl">
            {t("home.heroTitle")}{" "}
            <span className="text-[var(--brand)]">{t("home.heroSubtitle")}</span>{" "}
            {t("home.heroTitleEnd")}
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">
            {t("home.loginPrompt")}
          </p>

          <div className="mt-6 flex items-center justify-center gap-3 md:mt-8">
            <Link
              href="/login"
              className="rounded-xl bg-[var(--brand)] px-6 py-2.5 text-xs font-bold text-white transition-all hover:bg-[var(--brand-hover)] active:scale-95 md:px-8 md:py-3 md:text-sm"
            >
              {t("home.login")}
            </Link>
            <Link
              href="/register"
              className="rounded-xl border border-[var(--card-border)] px-6 py-2.5 text-xs font-bold text-[var(--foreground)] transition-all hover:bg-[var(--brand-light)] hover:text-[var(--brand)] active:scale-95 md:px-8 md:py-3 md:text-sm"
            >
              {t("home.register")}
            </Link>
          </div>
        </div>
      )}

      <EmailVerifyBanner />
      <Feed key={refreshKey} />
    </div>
  );
}
