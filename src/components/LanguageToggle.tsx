"use client";

import { useTranslation } from "@/lib/lang";

export default function LanguageToggle() {
  const { lang, setLang } = useTranslation();

  return (
    <button
      onClick={() => setLang(lang === "id" ? "en" : "id")}
      className="flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs font-bold transition-all hover:border-[var(--brand)] hover:bg-[var(--brand-light)] hover:text-[var(--brand)]"
      title={lang === "id" ? "Switch to English" : "Ganti ke Indonesia"}
    >
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582"
        />
      </svg>
      <span>{lang === "id" ? "EN" : "ID"}</span>
    </button>
  );
}
