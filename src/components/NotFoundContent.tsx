"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "@/lib/lang";

export default function NotFoundContent() {
  const { t, lang } = useTranslation();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      {/* Illustration — GIF Cry (unoptimized: GIF animasi GIPHY) */}
      <div className="relative mb-8">
        <div className="mx-auto h-32 w-32 overflow-hidden rounded-full border-4 border-[var(--card)] shadow-lg">
          <Image
            src="https://media.giphy.com/media/0eMumU6VJ01GPh9MI0/giphy.gif"
            alt=""
            width={128}
            height={128}
            unoptimized
            className="h-full w-full object-cover"
          />
        </div>
        {/* Question mark overlay */}
        <div className="absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-lg font-bold text-white shadow-lg">
          ?
        </div>
      </div>

      {/* Error code */}
      <h1 className="text-7xl font-black tracking-tight text-[var(--foreground)]">
        4
        <span className="text-[var(--brand)]">0</span>
        4
      </h1>

      {/* Message */}
      <h2 className="mt-4 text-2xl font-bold text-[var(--foreground)]">
        {t("error.notFound")}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">
        {lang === "id"
          ? "Halaman yang kamu cari mungkin sudah dihapus, dipindahkan, atau tidak pernah ada. Coba periksa kembali URL-nya."
          : "The page you're looking for might have been removed, moved, or never existed. Try checking the URL again."}
      </p>

      {/* Actions */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[var(--brand-hover)] hover:shadow-md active:scale-[0.97]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          {lang === "id" ? "Kembali ke Beranda" : "Back to Home"}
        </Link>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-6 py-3 text-sm font-medium text-[var(--foreground)] shadow-sm transition-all hover:border-[var(--brand)] hover:text-[var(--brand)] active:scale-[0.97]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
          {lang === "id" ? "Kembali" : "Go Back"}
        </button>
      </div>

      {/* Decorative elements */}
      <div className="mt-12 flex items-center gap-2 text-xs text-[var(--muted)]/40">
        <span className="h-px w-8 bg-[var(--card-border)]" />
        <span>pamerproject.com</span>
        <span className="h-px w-8 bg-[var(--card-border)]" />
      </div>
    </div>
  );
}
