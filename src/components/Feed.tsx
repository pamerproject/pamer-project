"use client";

import { Fragment, useCallback, useEffect, useReducer, useState } from "react";
import { useTranslation } from "@/lib/lang";
import { getTimeAgo } from "@/lib/helpers";
import { useInfiniteScroll, usePaginatedFetch } from "@/lib/hooks";
import FeedItem from "./FeedItem";
import AdsCard from "./AdsCard";

interface PostUser {
  id: string;
  name: string | null;
  username: string;
  avatar: string | null;
}

interface PostCounts {
  comments: number;
  likes: number;
}

interface ProjectInfo {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  tags: string[];
  image: string | null;
  liveUrl: string | null;
  repoUrl: string | null;
}

interface Post {
  id: string;
  slug: string | null;
  type: string;
  content: string;
  image: string | null;
  images?: string[];
  linkUrl?: string | null;
  githubUrl?: string | null;
  createdAt: string;
  pinned?: boolean;
  user: PostUser;
  project?: ProjectInfo | null;
  _count: PostCounts;
}

const TABS_KEYS = ["project", "cerita", ""] as const;

export default function Feed() {
  const { t, lang } = useTranslation();
  const [refreshCount, setRefreshCount] = useReducer((c: number) => c + 1, 0);
  const [activeTab, setActiveTab] = useState("project");

  // Listen for custom event from MulaiPamerModal
  useEffect(() => {
    const handlePostCreated = () => setRefreshCount();
    window.addEventListener("post-created", handlePostCreated);
    return () => window.removeEventListener("post-created", handlePostCreated);
  }, []);

  const fetchPosts = useCallback(async (skip: number, take: number): Promise<Post[]> => {
    const params = new URLSearchParams({ skip: String(skip), take: String(take) });
    if (activeTab) params.set("type", activeTab);
    const res = await fetch(`/api/posts?${params}`);
    if (!res.ok) throw new Error(t("home.loadFailed"));
    const data = await res.json();
    return data.posts || [];
  }, [activeTab, t]);

  const tabIndex = TABS_KEYS.findIndex((key) => key === activeTab);
  const resetKey = refreshCount + tabIndex * 10000;

  const { items: posts, loading, loadingMore, hasMore, error, loadMore } =
    usePaginatedFetch<Post>({ fetchFn: fetchPosts, resetKey });

  // loading || loadingMore agar observer reconnect saat initial load selesai
  const { sentinelRef } = useInfiniteScroll(loadMore, hasMore, loading || loadingMore);

  return (
    <div className="space-y-2.5 md:space-y-4">
      {/* Tab filter */}
      <div className="flex border-b border-[var(--card-border)]">
        {TABS_KEYS.map((key) => {
          const tabKey = key || "semua";
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`relative flex-1 px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === key
                  ? "text-[var(--brand)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {t("home.tab" + tabKey.charAt(0).toUpperCase() + tabKey.slice(1))}
              {activeTab === key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand)]" />
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-2.5 md:space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="card-app animate-pulse rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded-md bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800" />
                  <div className="h-3 w-20 rounded-md bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
                </div>
              </div>
              <div className="mt-4 space-y-2.5">
                <div className="h-4 w-full rounded-md bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800" />
                <div className="h-4 w-5/6 rounded-md bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
                <div className="h-4 w-2/3 rounded-md bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
              </div>
            </div>
          ))}
        </div>
      ) : error && posts.length > 0 ? (
        <div className="card-app rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
          Gagal memuat postingan lainnya
        </div>
      ) : posts.length === 0 ? (
        <div className="card-app rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-light)]">
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
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold">{t("feed.noPosts")}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {activeTab === "cerita"
              ? t("profile.noCeritaDesc", { name: "" })
              : activeTab === "project"
                ? t("project.noProjectsDesc")
                : t("project.noProjectsDesc")}
          </p>
        </div>
      ) : (
        <>
          {posts.map((post, index) => {
            const timeAgo = getTimeAgo(post.createdAt, t, lang);
            return (
              <Fragment key={post.id}>
                {/* Iklan Hostinger — disisipkan setiap 10 feed (project & cerita) */}
                {index > 0 && index % 10 === 0 && <AdsCard />}
                <FeedItem
                  id={post.id}
                  slug={post.slug}
                  type={post.type}
                  name={post.user.name || post.user.username}
                  username={post.user.username}
                  time={timeAgo}
                  content={post.content}
                  images={post.images || (post.image ? [post.image] : undefined)}
                  linkUrl={post.linkUrl}
                  githubUrl={post.githubUrl}
                  avatar={post.user.avatar || undefined}
                  likes={post._count.likes}
                  comments={post._count.comments}
                  project={post.project || undefined}
                  pinned={post.pinned}
                />
              </Fragment>
            );
          })}

          {hasMore && (
            <div ref={sentinelRef} className="h-4" />
          )}

          {loadingMore && (
            <div className="flex items-center justify-center py-4">
              <svg className="h-5 w-5 animate-spin text-[var(--muted)]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}
        </>
      )}
    </div>
  );
}


