"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "@/lib/lang";
import Avatar from "./ui/Avatar";

// ─── Types ───────────────────────────────────────────

type ResultType = "user" | "project" | "post" | "job";

interface SearchResult {
  type: ResultType;
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string | null;
  tags?: string[];
  href: string;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  hasMore: boolean;
}

// ─── Icons per type ──────────────────────────────────

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function ProjectIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}

function PostIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function JobIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m-9.5 5.044v4.25a2.18 2.18 0 00.75 1.662m-9.5-5.912a48.114 48.114 0 00-3.413.387c-1.07.16-1.837 1.094-1.837 2.175v1.946c0 1.079.688 2.047 1.655 2.255l.338.062" />
    </svg>
  );
}

const typeIcons: Record<ResultType, (props: { className?: string }) => React.ReactNode> = {
  user: UserIcon,
  project: ProjectIcon,
  post: PostIcon,
  job: JobIcon,
};

// ─── Badge ────────────────────────────────────────────

function TypeBadge({ type, t }: { type: ResultType; t: (key: string, params?: Record<string, string | number>) => string }) {
  const labelKey = {
    user: "search.typeUser",
    project: "search.typeProject",
    post: "search.typePost",
    job: "search.typeJob",
  }[type];
  const Icon = typeIcons[type];

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-[var(--brand-light)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
      <Icon className="h-3 w-3" />
      {t(labelKey)}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────

function SearchSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-[var(--card-border)]">
      {Array.from({ length: count }).map((_, i) => (
        <div key={`skel-${i}`} className="flex animate-pulse items-start gap-3 px-4 py-3.5">
          {/* Image placeholder */}
          <div className="h-10 w-10 shrink-0 rounded-lg bg-gray-200 dark:bg-gray-700" />
          {/* Text placeholders */}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 flex-1 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="h-3 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── SearchModal ──────────────────────────────────────

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Track request ID untuk mencegah race condition
  const reqIdRef = useRef(0);

  // ── Reset state setiap modal dibuka/tutup ──
  useEffect(() => {
    if (isOpen) {
      // Lock body scroll
      const scrollY = window.scrollY;
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";

      // No auto-focus — user klik sendiri inputnya.
      // Ini hindari iOS keyboard scroll bug sepenuhnya.
      return () => {
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        window.scrollTo(0, scrollY);
      };
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset state pencarian saat modal ditutup
    setQuery("");
    setResults([]);
    setHasMore(false);
    setHasSearched(false);
    setLoading(false);
    setLoadingMore(false);
  }, [isOpen]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  // ── Live search (keep old results while loading) ──
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 3) {
      setResults([]);
      setHasMore(false);
      setHasSearched(false);
      setLoading(false);
      return;
    }

    // Mark loading — tapi JANGAN hapus results, biar tetap kelihatan
    setLoading(true);
    setHasSearched(true);

    const currentReqId = ++reqIdRef.current;

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("Search failed");

      // Kalau request ini sudah tidak relevan (user sudah ketik baru), skip
      if (currentReqId !== reqIdRef.current) return;

      const data: SearchResponse = await res.json();

      // Double-check — hanya update kalau masih request terbaru
      if (currentReqId === reqIdRef.current) {
        setResults(data.results);
        setHasMore(data.hasMore);
        setLoading(false);
      }
    } catch {
      if (currentReqId === reqIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setQuery(val);

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => doSearch(val), 350);
    },
    [doSearch]
  );

  // ── Load more results ──
  const handleLoadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);

    const currentReqId = ++reqIdRef.current;

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&more=true`);
      if (!res.ok) throw new Error("Search failed");
      const data: SearchResponse = await res.json();

      if (currentReqId === reqIdRef.current) {
        setResults(data.results);
        setHasMore(data.hasMore);
        setLoadingMore(false);
      }
    } catch {
      if (currentReqId === reqIdRef.current) {
        setLoadingMore(false);
      }
    }
  }, [loadingMore, query]);

  // ── Infinite scroll (deteksi scroll mendekati bawah) ──
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || loadingMore || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight - scrollTop - clientHeight < 250) {
      handleLoadMore();
    }
  }, [loadingMore, hasMore, handleLoadMore]);

  if (!isOpen) return null;

  // ── Helper: truncate ──
  const truncate = (text: string, max = 80) => {
    if (text.length <= max) return text;
    return text.slice(0, max) + "...";
  };

  // ── Render result item ──
  const renderResult = (item: SearchResult) => {
    const Icon = typeIcons[item.type];

    return (
      <Link
        key={`r-${item.type}-${item.id}`}
        href={item.href}
        onClick={onClose}
        className="group flex items-start gap-3 px-4 py-3.5 transition-all hover:bg-[var(--brand-light)]"
      >
        {/* Image / Avatar */}
        <div className="shrink-0">
          {item.type === "user" ? (
            <Avatar src={item.image} name={item.title} size="sm" />
          ) : (
            <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--background)]">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Icon className="h-5 w-5 text-[var(--muted)]" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-bold text-[var(--foreground)] group-hover:text-[var(--brand)]">
              {truncate(item.title, 60)}
            </span>
            <TypeBadge type={item.type} t={t} />
          </div>
          <p className="mt-0.5 text-xs font-medium text-[var(--muted)]">
            {item.subtitle}
          </p>
          {item.description && (
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)] line-clamp-2">
              {truncate(item.description, 120)}
            </p>
          )}
          {item.tags && item.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {item.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-[var(--brand-light)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--brand)]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Arrow */}
        <svg
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)] opacity-0 transition-all group-hover:opacity-100"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </Link>
    );
  };

  return (
    <div className="fixed inset-0 z-[90] md:flex md:items-start md:justify-center">
      {/* Backdrop — purely visual, NO close-on-click-outside */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-md" />

      {/* Mobile: full screen (absolute inside fixed parent = no iOS scroll bug) — Desktop: centered modal */}
      <div className="absolute inset-0 z-[91] flex flex-col bg-[var(--card)] animate-slide-up
                  md:relative md:inset-x-auto md:top-auto md:bottom-auto md:mt-[10vh] md:w-full md:max-w-2xl md:h-[85dvh] md:overflow-hidden md:animate-fade-in md:rounded-2xl md:border md:border-[var(--card-border)] md:shadow-2xl">
        <div className="flex w-full max-w-2xl flex-col mx-auto flex-1 md:flex-1 md:min-h-0">
          {/* ── Header / Search Input ── */}
          <div className="flex items-center gap-3 border-b border-[var(--card-border)] px-5 py-3 md:px-6 md:py-4">
          <div className="relative flex-1">
            <svg
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder={t("search.placeholder")}
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-[var(--brand)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[var(--brand)]/20"
              maxLength={200}
              autoComplete="off"
              spellCheck={false}
            />
            {/* Subtle loading indicator di input — bukan spinner, tapi strip tipis */}
            {loading && results.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-full bg-[var(--card-border)]">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-[var(--brand)]" />
              </div>
            )}
          </div>

          {/* Close button — SATU-SATUNYA cara tutup modal */}
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition-all hover:bg-[var(--brand-light)] hover:text-[var(--brand)]"
            title={t("search.close")}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Results ── */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700"
        >
          {hasSearched && results.length === 0 && !loading ? (
            /* No results — hanya muncul kalau sudah selesai loading */
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
                <svg className="h-6 w-6 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <p className="text-base font-bold text-[var(--foreground)]">{t("search.noResults")}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{t("search.noResultsDesc")}</p>
            </div>
          ) : !hasSearched ? (
            /* Initial state (no search yet) */
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand-light)] to-blue-100 dark:from-blue-900/20 dark:to-purple-900/20">
                <svg className="h-6 w-6 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-base font-bold text-[var(--foreground)]">{t("search.initialTitle")}</p>
              <p className="mt-1 text-sm text-[var(--muted)] max-w-[280px]">{t("search.initialDesc")}</p>
            </div>
          ) : (
            <>
              {/* Hasil yang sudah ada — tetap kelihatan walaupun loading ulang */}
              {results.length > 0 && (
                <div className="divide-y divide-[var(--card-border)]">
                  {results.map(renderResult)}
                </div>
              )}

              {/* Skeleton untuk first-time search (belum ada hasil sebelumnya) */}
              {loading && results.length === 0 && (
                <SearchSkeleton count={5} />
              )}

              {/* Skeleton untuk "load more" */}
              {loadingMore && (
                <SearchSkeleton count={3} />
              )}

              {/* Load More button */}
              {results.length > 0 && hasMore && !loadingMore && (
                <div className="border-t border-[var(--card-border)] px-4 py-3 text-center">
                  <button
                    onClick={handleLoadMore}
                    className="rounded-lg px-5 py-2 text-xs font-semibold text-[var(--brand)] transition-all hover:bg-[var(--brand-light)]"
                  >
                    {t("search.loadMore")}
                  </button>
                </div>
              )}

              {/* Result count */}
              {results.length > 0 && (
                <div className="border-t border-[var(--card-border)] px-4 py-2 text-center">
                  <p className="text-[11px] text-[var(--muted)]">
                    {results.length} {t("search.results")}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
