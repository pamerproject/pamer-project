"use client";

import { useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "@/lib/lang";
import { useInfiniteScroll, usePaginatedFetch } from "@/lib/hooks";
import Avatar from "@/components/ui/Avatar";
import renderContent from "@/lib/renderContent";
import { getTimeAgo } from "@/lib/helpers";
import Breadcrumb from "@/components/Breadcrumb";
import { useKeepAtTop } from "@/lib/hooks";

interface TagUser {
  id: string;
  name: string | null;
  username: string;
  avatar: string | null;
}

interface TagCounts {
  comments: number;
  likes: number;
}

interface TagProject {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  image: string | null;
  tags: string[];
  liveUrl: string | null;
  repoUrl: string | null;
  createdAt: string;
  user: TagUser;
  _count: TagCounts;
}

export default function TagsPage() {
  const { t, lang } = useTranslation();
  const params = useParams<{ tag: string }>();
  const tag = decodeURIComponent(params?.tag || "");

  const fetchProjects = useCallback(
    async (skip: number, take: number): Promise<TagProject[]> => {
      const res = await fetch(`/api/tags/${encodeURIComponent(tag)}?skip=${skip}&take=${take}`);
      if (!res.ok) throw new Error(t("error.failedToLoad"));
      const data = await res.json();
      return data.projects || [];
    },
    [tag, t]
  );

  const {
    items: projects,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
  } = usePaginatedFetch<TagProject>({ fetchFn: fetchProjects });

  const { sentinelRef } = useInfiniteScroll(
    loadMore,
    hasMore,
    loading || loadingMore
  );

  const setBackBarEl = useKeepAtTop(false);

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div ref={setBackBarEl} className="px-4 md:px-0">
        <div className="mb-6 animate-pulse">
          <div className="h-8 w-48 rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800" />
          <div className="mt-2 h-4 w-72 rounded bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="card-app animate-pulse rounded-2xl border border-[var(--card-border)] bg-[var(--card)] overflow-hidden"
            >
              <div className="aspect-video w-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800" />
              <div className="p-4 space-y-3">
                <div className="h-5 w-3/4 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800" />
                <div className="h-3 w-full rounded bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
                <div className="h-3 w-2/3 rounded bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
                <div className="flex gap-2">
                  <div className="h-5 w-14 rounded-full bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
                  <div className="h-5 w-20 rounded-full bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div ref={setBackBarEl} className="px-4 md:px-0">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
          {error}
        </div>
      </div>
    );
  }

  // ── Empty ──
  if (projects.length === 0) {
    return (
      <div ref={setBackBarEl} className="px-4 md:px-0">
        <Breadcrumb
          segments={[
            { label: t("sidebar.home"), href: "/" },
            { label: `${t("tags.title")} #${tag}` },
          ]}
        />
        <div className="mb-6">
          <h1 className="text-2xl font-black tracking-tight md:text-3xl">
            <span className="text-[var(--brand)]">#{tag}</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {t("tags.subtitle", { tag })}
          </p>
        </div>

        <div className="card-app rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-light)]">
            <svg
              className="h-8 w-8 text-[var(--brand)]"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold">{t("tags.noProjects")}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {t("tags.noProjectsDesc", { tag })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={setBackBarEl} className="px-4 md:px-0">
      <Breadcrumb
        segments={[
          { label: t("sidebar.home"), href: "/" },
          { label: `${t("tags.title")} #${tag}` },
        ]}
      />
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">
          <span className="text-[var(--brand)]">#{tag}</span>
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {t("tags.subtitle", { tag })}
        </p>
      </div>

      {/* Grid 2 kolom */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-2">
        {projects.map((project) => {
          const timeAgo = getTimeAgo(project.createdAt, t, lang);
          const primaryImage = project.image;

          return (
            <Link
              key={project.id}
              href={`/project/${project.slug || project.id}`}
              className="group block"
            >
              <article className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)] transition-all hover:border-[var(--brand)] hover:shadow-md">
                {primaryImage ? (
                  <div className="relative aspect-video w-full overflow-hidden">
                    <Image
                      src={primaryImage}
                      alt={project.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-[var(--brand-light)] to-[var(--brand)]/10">
                    <svg
                      className="h-10 w-10 text-[var(--brand)]/40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
                      />
                    </svg>
                  </div>
                )}

                <div className="p-4">
                  <h3 className="text-base font-bold leading-snug text-[var(--foreground)] group-hover:text-[var(--brand)] transition-colors line-clamp-2">
                    {project.title}
                  </h3>

                  {project.description && (
                    <div className="mt-1.5 text-sm leading-relaxed text-[var(--muted)] line-clamp-2">
                      {renderContent(project.description, false)}
                    </div>
                  )}

                  {project.tags && project.tags.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {project.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-[var(--brand-light)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--brand)]"
                        >
                          #{t}
                        </span>
                      ))}
                      {project.tags.length > 3 && (
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-[var(--muted)] dark:bg-gray-800">
                          +{project.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between border-t border-[var(--card-border)] pt-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar
                        src={project.user.avatar}
                        name={project.user.name || project.user.username}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <span className="block truncate text-xs font-medium text-[var(--foreground)]">
                          {project.user.name || project.user.username}
                        </span>
                        <span className="block text-[11px] text-[var(--muted)]">
                          {timeAgo}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="flex items-center gap-1 text-xs text-[var(--muted)]">
                        <svg
                          className="h-3.5 w-3.5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66-.23-.45-.52-.86-.88-1.22L9.46 2.71 8 4.17c-.21.21-.33.48-.33.77v.17l-.95 4.58c-.05.26-.09.52-.09.79v7.42c0 .9.71 1.63 1.6 1.64l7.82.34c.63.03 1.2-.32 1.45-.91l2.5-6.38c.1-.24.16-.5.16-.77z" />
                        </svg>
                        {project._count.likes}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[var(--muted)]">
                        <svg
                          className="h-3.5 w-3.5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z" />
                        </svg>
                        {project._count.comments}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          );
        })}
      </div>

      {/* Sentinel untuk infinite scroll */}
      {hasMore && <div ref={sentinelRef} className="h-4" />}

      {loadingMore && (
        <div className="flex items-center justify-center py-6">
          <svg
            className="h-5 w-5 animate-spin text-[var(--muted)]"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      )}
    </div>
  );
}