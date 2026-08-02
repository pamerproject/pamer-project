"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/lib/lang";
import PostJobModal from "@/components/PostJobModal";
import JobCard from "@/components/JobCard";
import Breadcrumb from "@/components/Breadcrumb";
import { useInfiniteScroll, usePaginatedFetch } from "@/lib/hooks";

/* ─── Types ──────────────────────────────────────────── */

interface LocalJob {
  id: string;
  title: string;
  company: string;
  slug: string | null;
  description: string | null;
  location: string | null;
  type: string | null;
  salary: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  tags: string[];
  contactEmail: string | null;
  url: string | null;
  image: string | null;
  user: {
    id: string;
    username: string;
    name: string | null;
    avatar: string | null;
  };
  postedAt: string;
}



/* ─── Loading Skeleton ───────────────────────────────── */

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card-app animate-pulse rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <div className="flex items-start justify-between">
            <div className="h-5 w-20 rounded-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800" />
            <div className="h-5 w-24 rounded-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800" />
          </div>
          <div className="mt-3 h-5 w-3/4 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800" />
          <div className="mt-1 h-3 w-1/2 rounded bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
          <div className="mt-2 space-y-1.5">
            <div className="h-3 w-full rounded bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
            <div className="h-3 w-5/6 rounded bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
          </div>
          <div className="mt-3 flex gap-1.5">
            <div className="h-5 w-16 rounded-md bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
            <div className="h-5 w-20 rounded-md bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
          </div>
          <div className="mt-3 h-px bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
          <div className="mt-3 flex justify-between">
            <div className="h-3 w-32 rounded bg-gray-100 dark:bg-gray-700" />
            <div className="h-4 w-4 rounded bg-gray-100 dark:bg-gray-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────── */

export default function FreelancePage() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [showPostModal, setShowPostModal] = useState(false);

  const fetchJobsFn = useCallback(async (skip: number, take: number) => {
    const res = await fetch(`/api/jobs?skip=${skip}&take=${take}`);
    if (!res.ok) throw new Error(t("error.failedToLoad"));
    const data = await res.json();
    return data.jobs || [];
  }, [t]);

  const { items: jobs, loading, loadingMore, hasMore, error, loadMore, loadInitial } =
    usePaginatedFetch<LocalJob>({ fetchFn: fetchJobsFn });

  const { sentinelRef } = useInfiniteScroll(loadMore, hasMore, loading || loadingMore);

  const handlePostSuccess = useCallback(() => {
    loadInitial();
  }, [loadInitial]);

  // ── Loading ──
  if (loading) {
    return (
      <div>
        <div className="mb-6 animate-pulse">
          <div className="h-8 w-64 rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800" />
          <div className="mt-2 h-4 w-72 rounded bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
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
        <button onClick={loadInitial} className="mt-4 rounded-xl bg-[var(--brand)] px-6 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-hover)] transition-all">Coba Lagi</button>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb segments={[{ label: t("sidebar.home"), href: "/" }, { label: t("freelance.title") }]} />
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand)]">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight"><span className="text-[var(--brand)]">{t("freelance.title")}</span></h1>
              <p className="mt-0.5 text-sm text-[var(--muted)]">{t("freelance.subtitle")}</p>
            </div>
          </div>
          {session && (
            <button
              onClick={() => setShowPostModal(true)}
              className="flex items-center gap-2 shrink-0 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-[var(--brand-hover)] active:scale-95"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {t("freelance.postJob")}
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-light)]">
            <svg className="h-8 w-8 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
          </div>
          <h2 className="text-lg font-bold">{t("freelance.noJobs")}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{t("freelance.noJobsDesc")}</p>
          {session && (
            <button
              onClick={() => setShowPostModal(true)}
              className="mt-4 rounded-xl bg-[var(--brand)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-hover)] transition-all"
            >
              {t("freelance.postJob")}
            </button>
          )}
          {!session && (
            <p className="mt-4 text-xs text-[var(--muted)]">
              {t("freelance.loginToPost")}
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Job count */}
          <p className="mb-4 text-xs text-[var(--muted)]">{t("freelance.title")} {jobs.length}</p>

          {/* Feed */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-2">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
          {loadingMore && (
            <div className="flex justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--brand)] border-t-transparent" />
            </div>
          )}
          <div ref={sentinelRef} className="h-4" />
        </>
      )}

      {/* Modal */}
      {showPostModal && (
        <PostJobModal onClose={() => setShowPostModal(false)} onSuccess={handlePostSuccess} />
      )}
      
    </div>
  );
}
