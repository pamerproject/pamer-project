"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslation } from "@/lib/lang";
import { checkUrlSafety, type UrlSafetyResult } from "@/lib/urlSafety";

interface OgData {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  url: string;
}

function LinkPreviewCard({ og }: { og: OgData }) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        window.open(og.url, '_blank', 'noopener,noreferrer');
      }}
      className="mt-1.5 flex w-full max-w-full cursor-pointer overflow-hidden rounded-xl bg-[var(--background)] transition-all hover:shadow-sm"
    >
      {og.image && (
        <div className="relative h-24 w-32 shrink-0 overflow-hidden">
          <Image
            src={og.image}
            alt=""
            fill
            className="object-cover"
            sizes="128px"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        </div>
      )}
      <div className="flex min-w-0 flex-col justify-center gap-0.5 px-3 py-2">
        {og.title && (
          <span className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--foreground)]">
            {og.title}
          </span>
        )}
        {og.description && (
          <span className="line-clamp-2 text-xs leading-snug text-[var(--muted)]">
            {og.description}
          </span>
        )}
        <span className="block truncate text-[10px] text-[var(--muted)]">
          {og.siteName || new URL(og.url).hostname}
        </span>
      </div>
    </div>
  );
}

function SafetyWarning({ safety, onProceed }: { safety: UrlSafetyResult; onProceed: () => void }) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const isHigh = safety.severity === "high";

  return (
    <div
      className={`mt-1.5 overflow-hidden rounded-xl border ${
        isHigh
          ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30"
          : "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30"
      }`}
    >
      <div className="flex items-start gap-2.5 p-3">
        <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          isHigh ? "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400" : "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400"
        }`}>
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-bold uppercase tracking-wider ${
            isHigh ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"
          }`}>
            {t("safety.warning")}
          </p>
          <ul className="mt-1 space-y-0.5">
            {safety.warnings.map((w, i) => (
              <li key={i} className={`flex items-start gap-1 text-[11px] ${
                isHigh ? "text-red-600 dark:text-red-400/80" : "text-amber-600 dark:text-amber-400/80"
              }`}>
                <span className="mt-px shrink-0">•</span>
                <span>{t(w)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onProceed(); setDismissed(true); }}
              className={`rounded-lg px-3 py-1 text-[11px] font-bold transition-all ${
                isHigh
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-amber-500 text-white hover:bg-amber-600"
              }`}
            >
              {isHigh ? t("safety.proceedAnyway") : t("safety.ignoreWarning")}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
              className="rounded-lg border border-[var(--card-border)] px-3 py-1 text-[11px] font-medium text-[var(--muted)] transition-all hover:text-[var(--foreground)]"
            >
              {t("chat.cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LinkWithPreview({
  url,
  href,
  className,
}: {
  url: string;
  href: string;
  className: string;
}) {
  const [og, setOg] = useState<OgData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [bypassed, setBypassed] = useState(false);

  const safety = checkUrlSafety(href);
  const showWarning = !safety.safe && !bypassed;

  // Always fetch link preview on mount — warning only affects display, not fetching
  useEffect(() => {
    let ignore = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset state sebelum fetch link preview (pola standar)
    setLoading(true);
    setFetched(false);
    fetch(`/api/link-preview?url=${encodeURIComponent(href)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!ignore && data?.og) {
          setOg(data.og);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) {
          setLoading(false);
          setFetched(true);
        }
      });
    return () => { ignore = true; };
  }, [href]);

  return (
    <span className="inline-block w-full max-w-full">
      <span
        className={className}
        style={{ wordBreak: "break-all", overflowWrap: "break-word" }}
        onClick={(e) => {
          e.stopPropagation();
          window.open(href, "_blank", "noopener,noreferrer");
        }}
      >
        {url}
      </span>
      {showWarning && <SafetyWarning safety={safety} onProceed={() => setBypassed(true)} />}
      {!showWarning && loading && (
        <div className="mt-1.5 w-full max-w-full animate-pulse rounded-xl bg-[var(--background)]">
          <div className="space-y-2 p-3">
            <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-2 w-1/2 rounded bg-gray-100 dark:bg-gray-700" />
          </div>
        </div>
      )}
      {!showWarning && !loading && fetched && og && <LinkPreviewCard og={og} />}
    </span>
  );
}
