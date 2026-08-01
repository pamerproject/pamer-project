"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/lang";
import { translateApiError } from "@/lib/helpers";
import ErrorAlert from "@/components/ui/ErrorAlert";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(translateApiError(data.message, t) || t("auth.sendFailed"));
      }

      setSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("auth.errorOccurred");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-12 max-w-2xl px-4 md:mt-20">
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-sm md:p-12">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-light)]">
            <svg className="h-7 w-7 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">{t("auth.forgotPasswordTitle")}</h1>
          <p className="mt-1.5 text-sm text-[var(--muted)]">
            {t("auth.forgotPasswordDesc")}
          </p>
        </div>

        {sent ? (
          /* ── Success state ─────────────────────────── */
          <div className="mt-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="text-lg font-bold">{t("auth.checkEmail")}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {t("auth.checkEmailDesc")} <strong>{email}</strong>.
              <br />
              {t("auth.linkValidHour")}
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand)] hover:underline"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              {t("auth.backToLoginPage")}
            </Link>
          </div>
        ) : (
          /* ── Form ──────────────────────────────────── */
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && <ErrorAlert message={error} />}

            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                {t("auth.email")}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={t("auth.emailPlaceholder")}
                className="mt-1.5 block w-full rounded-xl border border-[var(--card-border)] px-4 py-3 text-sm outline-none transition-all placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-bold text-white transition-all hover:bg-[var(--brand-hover)] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t("auth.sending")}
                </>
              ) : (
                t("auth.sendResetLink")
              )}
            </button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-sm text-[var(--muted)] hover:text-[var(--brand)]"
              >
                {t("auth.backToLogin")}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
