"use client";

import { useState, useMemo } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/lib/lang";
import { translateApiError } from "@/lib/helpers";
import { generateUsername } from "@/lib/username";
import ErrorAlert from "@/components/ui/ErrorAlert";

export default function RegisterPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [loading, setLoading] = useState(""); // "google" | "github" | "credentials" | ""
  const [nameInput, setNameInput] = useState("");

  // Preview username — helper bersama dengan backend (generateUsername).
  // Backend memakai base langsung jika tersedia; angka baru ditambah kalau
  // username tersebut sudah dipakai orang lain.
  const previewUsername = useMemo(() => {
    if (!nameInput.trim()) return "";
    return generateUsername(nameInput);
  }, [nameInput]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading("credentials");

    const form = new FormData(e.currentTarget);
    const password = form.get("password") as string;
    const confirmPassword = form.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      setLoading("");
      return;
    }

    if (password.length < 6) {
      setError(t("auth.passwordTooShort"));
      setLoading("");
      return;
    }

    const data = {
      name: form.get("name") as string,
      email: form.get("email") as string,
      password,
    };

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      setError(translateApiError(err.message, t) || t("auth.registerFailed"));
      setLoading("");
      return;
    }

    // Auto-login after register
    const loginRes = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (loginRes?.error) {
      router.push("/login");
    } else {
      // Arahkan ke halaman "verify email" — jangan langsung masuk home
      router.push(`/check-email?email=${encodeURIComponent(data.email)}`);
    }
  }

  const handleSocialSignIn = async (provider: string) => {
    setError("");
    setLoading(provider);
    await signIn(provider, { callbackUrl: "/" });
  };

  return (
    <div className="mx-auto mt-12 max-w-2xl px-4 md:mt-20">
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-sm md:p-12">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-light)]">
            <svg className="h-7 w-7 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">{t("auth.registerTitle")}</h1>
          <p className="mt-1.5 text-sm text-[var(--muted)]">
            {t("auth.haveAccount")}{" "}
            <Link href="/login" className="font-semibold text-[var(--brand)] hover:underline">
              {t("auth.login")}
            </Link>
          </p>
        </div>

        {/* Social Login */}
        <div className="mt-8 space-y-3">
          <button
            onClick={() => handleSocialSignIn("google")}
            disabled={!!loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--card-border)] px-4 py-3 text-sm font-medium transition-all hover:bg-[var(--brand-light)] hover:border-[var(--brand)] disabled:opacity-50"
          >
            {loading === "google" ? (
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            {t("auth.signInWithGoogle")}
          </button>

          <button
            onClick={() => handleSocialSignIn("github")}
            disabled={!!loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--card-border)] px-4 py-3 text-sm font-medium transition-all hover:bg-gray-100 hover:border-gray-400 disabled:opacity-50 dark:hover:bg-gray-800"
          >
            {loading === "github" ? (
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            )}
            {t("auth.signInWithGithub")}
          </button>
        </div>

        {/* Toggle email form button */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowEmailForm(!showEmailForm)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--card-border)] px-4 py-3 text-sm font-medium text-[var(--muted)] transition-all hover:border-[var(--brand)] hover:text-[var(--brand)] hover:bg-[var(--brand-light)]"
          >
            <svg
              className={`h-4 w-4 transition-transform duration-300 ${showEmailForm ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
            {showEmailForm ? t("auth.closeForm") : t("auth.registerWithEmail")}
          </button>
        </div>

        {/* Form (collapsible) */}
        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out ${
            showEmailForm ? 'mt-6 max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <ErrorAlert message={error} />}

            <div>
              <label htmlFor="name" className="block text-sm font-medium">
                {t("auth.name")}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={t("auth.namePlaceholder")}
                className="mt-1.5 block w-full rounded-xl border border-[var(--card-border)] px-4 py-3 text-sm outline-none transition-all placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
              />
              {previewUsername && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  {t("auth.usernamePreview")} <span className="font-mono font-medium text-[var(--brand)]">@{previewUsername}</span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                {t("auth.email")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder={t("auth.emailPlaceholder")}
                className="mt-1.5 block w-full rounded-xl border border-[var(--card-border)] px-4 py-3 text-sm outline-none transition-all placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium">
                {t("auth.password")}
              </label>
              <div className="relative mt-1.5">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder={t("auth.passwordMinChars")}
                  className="block w-full rounded-xl border border-[var(--card-border)] px-4 py-3 pr-12 text-sm outline-none transition-all placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium">
                {t("auth.confirmPassword")}
              </label>
              <div className="relative mt-1.5">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder={t("auth.confirmPlaceholder")}
                  className="block w-full rounded-xl border border-[var(--card-border)] px-4 py-3 pr-12 text-sm outline-none transition-all placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
                  tabIndex={-1}
                >
                  {showConfirm ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!!loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-bold text-white transition-all hover:bg-[var(--brand-hover)] disabled:opacity-50"
            >
              {loading === "credentials" ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t("auth.processing")}
                </>
              ) : (
                t("auth.register")
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
