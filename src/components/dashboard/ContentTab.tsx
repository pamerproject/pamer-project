"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "@/lib/lang";
import { translateApiError } from "@/lib/helpers";

type PageKey = "about" | "privacy" | "terms" | "contact";

interface PageData {
  key: PageKey;
  title: string;
  content: string;
  updatedAt: string | null;
}

const PAGE_TABS: { key: PageKey; icon: string }[] = [
  { key: "about", icon: "M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" },
  { key: "privacy", icon: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" },
  { key: "terms", icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { key: "contact", icon: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" },
];

export default function ContentTab() {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState<PageKey>("about");
  const [pages, setPages] = useState<Record<string, PageData>>({});

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Muat semua halaman sekali
  useEffect(() => {
    let ignore = false;
    fetch("/api/admin/pages")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (ignore || !d?.pages) return;
        const map: Record<string, PageData> = {};
        for (const p of d.pages as PageData[]) {
          map[p.key] = p;
        }
        setPages(map);
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  // Setiap ganti tab, isi form dari data halaman tersebut (create & edit jadi 1)
  useEffect(() => {
    const page = pages[activeKey];
    setTitle(page?.title || "");
    setContent(page?.content || "");
    setError("");
  }, [activeKey, pages]);

  // Reset status sukses hanya saat ganti tab (bukan saat pages berubah akibat save)
  useEffect(() => {
    setSuccess(false);
  }, [activeKey]);

  // Bersihkan timer saat komponen unmount
  useEffect(
    () => () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      setError(t("contentTab.titleRequired"));
      return;
    }
    if (!content.trim()) {
      setError(t("contentTab.contentRequired"));
      return;
    }

    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const res = await fetch("/api/admin/pages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: activeKey, title, content }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(translateApiError(data.message, t) || t("contentTab.saveFailed"));
      }
      const data = await res.json();
      if (data?.page) {
        setPages((prev) => ({ ...prev, [activeKey]: data.page }));
      }
      setSuccess(true);
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = setTimeout(() => {
        successTimerRef.current = null;
        setSuccess(false);
      }, 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("contentTab.saveFailed"));
    } finally {
      setSaving(false);
    }
  }, [activeKey, title, content, t]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-5 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-24 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl border border-[var(--card-border)] bg-[var(--card)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-[var(--foreground)]">{t("contentTab.title")}</h3>
        <p className="mt-0.5 text-xs text-[var(--muted)]">{t("contentTab.desc")}</p>
      </div>

      {/* Tabs menu jejer */}
      <div className="flex flex-wrap gap-2">
        {PAGE_TABS.map((tab) => {
          const active = activeKey === tab.key;
          const isSaved = !!pages[tab.key]?.title;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveKey(tab.key)}
              className={`relative flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                active
                  ? "border-[var(--brand)] bg-[var(--brand)] text-white shadow-sm"
                  : "border-[var(--card-border)] bg-[var(--card)] text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--foreground)]"
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
              </svg>
              {t(`contentTab.${tab.key}`)}
              {isSaved && (
                <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-white" : "bg-emerald-500"}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Form create & edit jadi satu */}
      <div className="card-app rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-500/15 dark:text-emerald-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t("contentTab.saveSuccess")}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[var(--foreground)]">{t("contentTab.titleLabel")}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("contentTab.titlePlaceholder", { page: t(`contentTab.${activeKey}`) })}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[var(--foreground)]">{t("contentTab.contentLabel")}</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("contentTab.contentPlaceholder")}
              rows={12}
              className="w-full resize-y rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm leading-relaxed text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
            />
            <p className="mt-1 text-[10px] text-[var(--muted)]">{t("contentTab.contentHint")}</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || success}
        className={`w-full rounded-lg py-2.5 text-sm font-bold text-white transition-all disabled:opacity-50 ${
          success ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[var(--brand)] hover:bg-[var(--brand-hover)]"
        }`}
      >
        {success ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t("contentTab.saveSuccess")}
          </span>
        ) : saving ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t("contentTab.saving")}
          </span>
        ) : (
          t("contentTab.save")
        )}
      </button>
    </div>
  );
}
