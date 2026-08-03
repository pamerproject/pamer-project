"use client";

import { useEffect, useState, useCallback, useMemo, type ReactNode } from "react";
import { useTranslation } from "@/lib/lang";

/* ─── Types ──────────────────────────────────────────── */

interface TechNewsItem {
  id: string;
  title: string;
  description: string;
  url: string;
  image: string | null;
  source: "devto" | "hackernews" | "lokal";
  sourceName: string;
  publishedAt: string;
  tags: string[];
  author: string | null;
  score?: number;
}

type TabId = "global" | "lokal";

/* ─── Helpers ────────────────────────────────────────── */

function timeAgo(dateStr: string, t: (key: string, params?: Record<string, string | number>) => string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return t("timeAgo.justNow");
  if (diff < 3600) return t("timeAgo.minutes", { n: Math.floor(diff / 60) });
  if (diff < 86400) return t("timeAgo.hours", { n: Math.floor(diff / 3600) });
  if (diff < 2592000) return t("timeAgo.days", { n: Math.floor(diff / 86400) });
  return t("timeAgo.months", { n: Math.floor(diff / 2592000) });
}

function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

/** Interleave two arrays: [a1, b1, a2, b2, ...] */
function interleave<T>(a: T[], b: T[]): T[] {
  const result: T[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (i < a.length) result.push(a[i]);
    if (i < b.length) result.push(b[i]);
  }
  return result;
}

/* ─── Confirm Modal ──────────────────────────────────── */

function ConfirmModal({ article, onClose }: { article: TechNewsItem; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-2xl animate-fade-in">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-light)]">
          <svg className="h-6 w-6 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </div>
        <h3 className="text-center text-lg font-bold text-[var(--foreground)]">{t("technews.confirmOpenTitle")}</h3>
        <p className="mt-1 text-center text-sm text-[var(--muted)] line-clamp-2">{article.title}</p>
        <p className="mt-0.5 text-center text-xs text-[var(--muted)]">{t("technews.confirmOpenDesc", { source: article.sourceName })}</p>
        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-[var(--card-border)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-all hover:bg-[var(--brand-light)]">{t("technews.cancel")}</button>
          <button onClick={() => { window.open(article.url, "_blank", "noopener,noreferrer"); onClose(); }} className="flex-1 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[var(--brand-hover)] active:scale-95">{t("technews.confirmOpen")}</button>
        </div>
      </div>
    </>
  );
}

/* ─── Source Badge ───────────────────────────────────── */

function SourceBadge({ source, sourceName }: { source: string; sourceName: string }) {
  if (source === "devto") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.27 12.64c0 .94-.66 1.62-1.5 1.62H4.07v-3.22h1.7c.84 0 1.5.68 1.5 1.6zm.56-3.22v6.44h2.38c1.26 0 2.14-.9 2.14-2.02v-2.4c0-1.12-.88-2.02-2.14-2.02zm5.7 0v6.44h2.39v-2.56h1.38l1.14 2.56h2.59l-1.38-2.84c.77-.32 1.28-1.04 1.28-1.92 0-1.18-.94-2.12-2.12-2.12z" />
        </svg>
        Dev.to
      </span>
    );
  }
  if (source === "hackernews") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-light)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
        </svg>
        HN
      </span>
    );
  }
  // Lokal source — color based on source name
  const colors: Record<string, string> = {
    "DetikInet": "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    "CNN Indonesia Tekno": "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    "Antara Tekno": "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colors[sourceName] || "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
      {sourceName}
    </span>
  );
}

/* ─── Article Card ───────────────────────────────────── */

function ArticleCard({ article, onClick }: { article: TechNewsItem; onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button onClick={onClick} className="group w-full text-left">
      <article className="card-app flex overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)] transition-all hover:border-[var(--brand)] hover:shadow-md active:scale-[0.99]">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden bg-gray-100 sm:h-36 sm:w-36 dark:bg-gray-800">
          {article.image ? (
            <img src={article.image} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : article.source === "hackernews" ? (
            <div className="flex h-full w-full flex-col items-center justify-center bg-[var(--brand-light)]">
              <svg className="h-6 w-6 text-[var(--brand)] sm:h-7 sm:w-7" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
              <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--brand)] sm:text-[10px]">HN</span>
            </div>
          ) : article.source === "lokal" ? (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
              <svg className="h-6 w-6 text-emerald-500 sm:h-7 sm:w-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582" />
              </svg>
              <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{t("technews.indonesia")}</span>
            </div>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
              <svg className="h-7 w-7 text-gray-300 dark:text-gray-600 sm:h-8 sm:w-8" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <SourceBadge source={article.source} sourceName={article.sourceName} />
            <span className="text-[10px] text-[var(--muted)]">{timeAgo(article.publishedAt, t)}</span>
            {article.score !== undefined && article.score > 0 && (
              <span className="ml-auto flex items-center gap-0.5 text-[10px] text-[var(--muted)]">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66-.23-.45-.52-.86-.88-1.22L9.46 2.71 8 4.17c-.21.21-.33.48-.33.77v.17l-.95 4.58c-.05.26-.09.52-.09.79v7.42c0 .9.71 1.63 1.6 1.64l7.82.34c.63.03 1.2-.32 1.45-.91l2.5-6.38c.1-.24.16-.5.16-.77z" />
                </svg>
                {article.score}
              </span>
            )}
          </div>
          <h3 className="mt-1 text-sm font-bold leading-snug text-[var(--foreground)] group-hover:text-[var(--brand)] transition-colors line-clamp-2">{article.title}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)] line-clamp-2">{stripHtml(article.description)}</p>
          {article.author && <span className="mt-1 text-[10px] text-[var(--muted)] truncate">{article.author}</span>}
        </div>
      </article>
    </button>
  );
}

/* ─── Loading Skeleton ───────────────────────────────── */

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card-app animate-pulse overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
          <div className="flex">
            <div className="h-32 w-32 shrink-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 sm:h-40 sm:w-40" />
            <div className="flex-1 space-y-2 p-4">
              <div className="h-4 w-16 rounded bg-gray-100 dark:bg-gray-700" />
              <div className="h-5 w-full rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800" />
              <div className="h-4 w-5/6 rounded bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
              <div className="h-3 w-1/3 rounded bg-gray-100 dark:bg-gray-700" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Tabs (Simple Pill Style) ───────────────────────── */

const tabs: { id: TabId; label: string; icon: ReactNode }[] = [    { id: "global",
    label: "__global__",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582" />
      </svg>
    ),
  },    { id: "lokal",
    label: "__lokal__",
    icon: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
];

function TabBar({ active, onChange, t }: { active: TabId; onChange: (id: TabId) => void; t: (key: string) => string }) {
  return (
    <div className="flex gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all md:text-sm ${
            active === tab.id
              ? "bg-[var(--brand)] text-white shadow-sm"
              : "bg-[var(--card)] text-[var(--muted)] border border-[var(--card-border)] hover:text-[var(--foreground)]"
          }`}
        >
          {tab.icon}
          {tab.label === "__global__" ? t("technews.global") : tab.label === "__lokal__" ? t("technews.lokal") : tab.label}
        </button>
      ))}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────── */

export default function TechNewsPage() {
  const [devtoArticles, setDevtoArticles] = useState<TechNewsItem[]>([]);
  const [hnArticles, setHnArticles] = useState<TechNewsItem[]>([]);
  const [lokalArticles, setLokalArticles] = useState<TechNewsItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const [confirmArticle, setConfirmArticle] = useState<TechNewsItem | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("global");

  const fetchNews = useCallback(async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const isInitial = pageNum === 1;
      const res = await fetch(`/api/technews?page=${pageNum}&lokal=${isInitial}`);
      if (!res.ok) throw new Error(t("error.failedToLoad"));
      const data = await res.json();
      const newDevto = data.devto || [];
      const newHn = data.hackernews || [];
      const newLokal = data.lokal || [];
      if (newDevto.length === 0 && newHn.length === 0) {
        setHasMore(false);
      } else {
        setDevtoArticles((prev) => (append ? [...prev, ...newDevto] : newDevto));
        setHnArticles((prev) => (append ? [...prev, ...newHn] : newHn));
        if (isInitial && !append) {
          setLokalArticles(newLokal);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error.networkError"));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchNews(1, false); }, [fetchNews]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNews(nextPage, true);
  }, [page, fetchNews, loadingMore, hasMore]);

  // ── Filter berdasarkan tab aktif ──
  const displayArticles = useMemo(() => {
    if (activeTab === "lokal") return lokalArticles;
    return interleave(hnArticles, devtoArticles);
  }, [activeTab, devtoArticles, hnArticles, lokalArticles]);

  // ── Loading ──
  if (loading) {
    return (
      <div>
        <div className="mb-6 animate-pulse">
          <div className="h-8 w-56 rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800" />
          <div className="mt-2 h-4 w-80 rounded bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-[var(--foreground)]">{error}</h2>
        <button onClick={() => fetchNews(1, false)} className="mt-4 rounded-xl bg-[var(--brand)] px-6 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-hover)] transition-all">Coba Lagi</button>
      </div>
    );
  }

  // ── Empty ──
  if (devtoArticles.length === 0 && hnArticles.length === 0 && lokalArticles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-light)]">
          <svg className="h-8 w-8 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
          </svg>
        </div>
        <h2 className="text-lg font-bold">Belum ada berita</h2>
        <button onClick={() => fetchNews(1, false)} className="mt-4 rounded-xl bg-[var(--brand)] px-6 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-hover)] transition-all">Muat Ulang</button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand)]">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">TechNews <span className="text-[var(--brand)]">Info</span></h1>
            <p className="mt-0.5 text-sm text-[var(--muted)]">Berita teknologi global &amp; Indonesia</p>
          </div>
        </div>
      </div>

      {/* Simple Pills Tabs */}
      <div className="mb-5">
        <TabBar active={activeTab} onChange={setActiveTab} t={t} />
      </div>

      {/* Feed */}
      <div className="space-y-3">
        {displayArticles.map((article) => (
          <ArticleCard key={article.id} article={article} onClick={() => setConfirmArticle(article)} />
        ))}
      </div>

      {/* Load More — only for global tab */}
      {hasMore && activeTab === "global" && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-8 py-3 text-sm font-semibold text-[var(--foreground)] transition-all hover:border-[var(--brand)] hover:bg-[var(--brand-light)] hover:text-[var(--brand)] active:scale-95 disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Memuat...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
                Lihat Berita Lainnya
              </>
            )}
          </button>
        </div>
      )}

      {loadingMore && <div className="mt-4"><LoadingSkeleton /></div>}

      {/* Footer */}
      <div className="mt-8 border-t border-[var(--card-border)] pt-4 text-center">
        <p className="text-xs text-[var(--muted)]">
          Sumber: <span className="font-medium text-[var(--brand)]">Dev.to</span>,{" "}
          <span className="font-medium text-[var(--brand)]">Hacker News</span>,{" "}
          <span className="font-medium text-emerald-600">DetikInet</span>,{" "}
          <span className="font-medium text-blue-600">CNN Indonesia</span>,{" "}
          <span className="font-medium text-purple-600">Antara News</span>
        </p>
      </div>

      {confirmArticle && <ConfirmModal article={confirmArticle} onClose={() => setConfirmArticle(null)} />}
    </div>
  );
}
