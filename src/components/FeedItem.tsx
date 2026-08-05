"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/lib/lang";
import { translateApiError } from "@/lib/helpers";
import Avatar from "./ui/Avatar";
import ImageCarousel from "./ui/ImageCarousel";
import renderContent from "@/lib/renderContent";

interface ProjectData {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  tags: string[];
  image: string | null;
}

interface FeedItemProps {
  id: string;
  slug?: string | null;
  type?: string;
  name: string;
  username: string;
  time: string;
  content: string;
  images?: string[];
  linkUrl?: string | null;
  githubUrl?: string | null;
  avatar?: string;
  likes?: number;
  comments?: number;
  project?: ProjectData | null;
  pinned?: boolean;
  refPath?: string;
}

function qs(base: string, refPath?: string): string {
  return refPath ? `${base}${base.includes("?") ? "&" : "?"}ref=${encodeURIComponent(refPath)}` : base;
}

export default function FeedItem({
  id,
  slug,
  type,
  name,
  username,
  time,
  content,
  images,
  linkUrl,
  githubUrl,
  avatar,
  likes = 0,
  comments = 0,
  project,
  pinned,
  refPath,
}: FeedItemProps) {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const isLoggedIn = !!session?.user;

  const hasImages = images && images.length > 0;
  const isProject = type === "project";

  // ── Like (Mantap) ──
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);
  const [likeError, setLikeError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetch(`/api/posts/${id}/like`)
      .then((r) => r.json())
      .then((data) => {
        if (data.liked) setLiked(true);
      })
      .catch(() => {});
  }, [id, isLoggedIn]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      window.location.href = "/login";
      return;
    }
    setLikeError(null);
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!liked);
    setLikeCount(likeCount + (liked ? -1 : 1));
    try {
      const res = await fetch(`/api/posts/${id}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikeCount(data.count);
      } else if (res.status === 401) {
        window.location.href = "/login";
      } else {
        setLiked(prevLiked);
        setLikeCount(prevCount);
        const data = await res.json().catch(() => null);
        setLikeError(translateApiError(data?.message || "error.failedToLoad", t));
      }
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      setLikeError(t("error.failedToLoad"));
    }
  };

  // ── Share ──
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}${isProject && project ? `/project/${project.slug || project.id}` : `/post/${slug || id}`}`;
    const shareData = {
      title: document.title,
      url,
    };
    const nav = navigator as Navigator & {
      share?: (data: { title?: string; url?: string }) => Promise<void>;
    };
    if (typeof nav !== "undefined" && "share" in nav) {
      try { await nav.share(shareData); } catch { /* user cancelled */ }
    } else {
      const clipboard = navigator.clipboard;
      if (clipboard) {
        try {
          await clipboard.writeText(url);
        } catch { /* clipboard not available */ }
      }
    }
  };

  return (
    <article className="card-app border-b border-[var(--card-border)] bg-[var(--card)] px-2 rounded-2xl md:rounded-xl md:border-l md:border-r md:border-t md:px-0">
      {/* Pinned strip — badge elegan di atas card (tanpa outline merah) */}
      {pinned && (
        <div className="flex items-center gap-1.5 border-b border-[var(--card-border)] bg-[var(--brand-light)] px-3 py-2 md:px-4">
          <svg className="h-3.5 w-3.5 shrink-0 text-[var(--brand)]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 6l2.29 2.29-9.88 9.88-4-4L6 13.17 8.41 10.59 11 13.17 16 6m0-4l-6 7-4-4-4 4 6 7 8-11z" />
          </svg>
          <span className="text-xs font-bold text-[var(--brand)]">{t("feed.pinned")}</span>
          <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--muted)]/50" />
          <span className="min-w-0 truncate text-xs text-[var(--muted)]">
            {type === "project" ? t("feed.pinnedByProject") : t("feed.pinnedByStory")}{" "}
            <Link href="/" className="font-semibold text-[var(--brand)] hover:underline">
              {t("brand.name")}
            </Link>
          </span>
        </div>
      )}

      {/* Header: avatar + name + username + time + type badge */}
      <div className="flex items-start gap-2 px-3 pb-6 pt-3 md:gap-3 md:px-4 md:pt-4 md:pb-8">
        {isLoggedIn ? (
          <Link href={`/u/${username}`}>
            <Avatar src={avatar} name={name} size="sm" />
          </Link>
        ) : (
          <Avatar src={avatar} name={name} size="sm" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isLoggedIn ? (
              <Link
                href={`/u/${username}`}
                className="text-sm font-bold truncate hover:text-[var(--brand)] md:text-base"
              >
                {name}
              </Link>
            ) : (
              <span className="text-sm font-bold truncate md:text-base">{name}</span>
            )}
            <span className="text-xs text-[var(--brand)] shrink-0">@{username}</span>
            <span className="text-xs text-[var(--muted)]">·</span>
            <span className="text-xs text-[var(--muted)] shrink-0">{time}</span>
            {type === "project" && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-[var(--brand-light)] px-2 py-0.5 text-[10px] font-bold uppercase leading-tight text-[var(--brand)] tracking-wider shrink-0">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
                {t("feed.projectBadge")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Project card for project type */}
      {isProject && project ? (
        isLoggedIn ? (
        <Link href={qs(`/project/${project.slug || project.id}`, refPath)} className="block">
          <div className="mb-1 px-3 md:px-4">
            {/* Title — above image */}
            <h3 className="text-sm leading-relaxed text-[var(--foreground)] font-bold line-clamp-2">{project.title}</h3>
          </div>

          {/* Project cover image — FULL kiri-kanan (tanpa padding), carousel jika >1 */}
          {(project.image || (images && images.length > 0)) && (
            <div className="-mx-2 w-[calc(100%+1rem)] overflow-hidden md:mx-0 md:w-full">
              {images && images.length > 1 ? (
                <ImageCarousel images={images} maxHeight={300} />
              ) : (
                <Image
                  src={project.image || images![0]}
                  alt={project.title}
                  width={1200}
                  height={675}
                  className="w-full h-auto object-cover"
                  sizes="100vw"
                />
              )}
            </div>
          )}

          <div className="px-3 md:px-4">
            {/* Description */}
            {project.description && (
              <div className="mt-2 text-sm leading-relaxed text-[var(--muted)] line-clamp-3 whitespace-pre-wrap break-words">
                {renderContent(project.description, true)}
              </div>
            )}

            {/* Tags */}
            {project.tags && project.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Action links — same style as cerita (pake span biar ga nested <a>) */}
            {(linkUrl || githubUrl) && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--card-border)] pt-3">
                {linkUrl && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(linkUrl, '_blank', 'noopener,noreferrer');
                    }}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition-all hover:border-[var(--brand)] hover:text-[var(--brand)] hover:shadow-sm"
                  >
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582" />
                    </svg>
                    {t("feed.linkProject")}
                    <svg className="h-3 w-3 shrink-0 opacity-60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                    </svg>
                  </span>
                )}
                {githubUrl && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(githubUrl, '_blank', 'noopener,noreferrer');
                    }}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition-all hover:border-[var(--brand)] hover:text-[var(--brand)] hover:shadow-sm"
                  >
                    <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    {t("feed.linkGithub")}
                    <svg className="h-3 w-3 shrink-0 opacity-60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                    </svg>
                  </span>
                )}
              </div>
            )}
          </div>
        </Link>
        ) : (
          <div className="block">
            <div className="mb-1 px-3 md:px-4">
              <h3 className="text-sm leading-relaxed text-[var(--foreground)] font-bold line-clamp-2">{project.title}</h3>
            </div>
            {(project.image || (images && images.length > 0)) && (
              <div className="-mx-2 w-[calc(100%+1rem)] overflow-hidden md:mx-0 md:w-full">
                {images && images.length > 1 ? (
                  <ImageCarousel images={images} maxHeight={300} />
                ) : (
                  <Image
                    src={project.image || images![0]}
                    alt={project.title}
                    width={1200}
                    height={675}
                    className="w-full h-auto object-cover"
                    sizes="100vw"
                  />
                )}
              </div>
            )}
            <div className="px-3 md:px-4">
              {project.description && (
                <div className="mt-2 text-sm leading-relaxed text-[var(--muted)] line-clamp-3 whitespace-pre-wrap break-words">
                  {renderContent(project.description, true)}
                </div>
              )}
              {project.tags && project.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {project.tags.map((tag) => (
                    <span key={tag} className="rounded-md px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">#{tag}</span>
                  ))}
                </div>
              )}
              {(linkUrl || githubUrl) && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--card-border)] pt-3">
                  {linkUrl && (
                    <span onClick={(e) => { e.stopPropagation(); window.open(linkUrl, '_blank', 'noopener,noreferrer'); }}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition-all hover:border-[var(--brand)] hover:text-[var(--brand)] hover:shadow-sm">
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582" /></svg>
                      {t("feed.linkProject")}
                      <svg className="h-3 w-3 shrink-0 opacity-60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
                    </span>
                  )}
                  {githubUrl && (
                    <span onClick={(e) => { e.stopPropagation(); window.open(githubUrl, '_blank', 'noopener,noreferrer'); }}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition-all hover:border-[var(--brand)] hover:text-[var(--brand)] hover:shadow-sm">
                      <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                      {t("feed.linkGithub")}
                      <svg className="h-3 w-3 shrink-0 opacity-60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        <>
          {/* Image carousel — di ATAS, sama seperti project (carousel aktif jika >1 gambar) */}
          {hasImages && (
            isLoggedIn ? (
              <Link href={qs(`/post/${slug || id}`, refPath)} className="block -mx-2 border-y border-[var(--card-border)] md:mx-0">
                <ImageCarousel images={images!} maxHeight={300} />
              </Link>
            ) : (
              <div className="-mx-2 border-y border-[var(--card-border)] md:mx-0">
                <ImageCarousel images={images!} maxHeight={300} />
              </div>
            )
          )}

          {/* Content text for cerita — di BAWAH gambar */}
          {isLoggedIn ? (
            <Link href={qs(`/post/${slug || id}`, refPath)} className="block">
              <div className="px-3 pt-3 pb-2 md:px-4">
                <div className="text-sm leading-relaxed text-[var(--foreground)] line-clamp-4 whitespace-pre-wrap break-words">
                  {renderContent(content, true)}
                </div>
              </div>
            </Link>
          ) : (
            <div className="px-3 pt-3 pb-2 md:px-4">
              <div className="text-sm leading-relaxed text-[var(--foreground)] line-clamp-4 whitespace-pre-wrap break-words">
                {renderContent(content, true)}
              </div>
            </div>
          )}

          {/* Cerita links */}
          {(linkUrl || githubUrl) && (
            <div className="flex flex-wrap gap-2 border-b border-[var(--card-border)] px-4 py-3">
              {linkUrl && (
                <a
                  href={linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition-all hover:border-[var(--brand)] hover:text-[var(--brand)] hover:shadow-sm"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>                    {t("feed.linkProject")}

                  <svg className="h-3 w-3 shrink-0 opacity-60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                  </svg>
                </a>
              )}
              {githubUrl && (
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition-all hover:border-[var(--brand)] hover:text-[var(--brand)] hover:shadow-sm"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>                    {t("feed.linkGithub")}

                  <svg className="h-3 w-3 shrink-0 opacity-60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                  </svg>
                </a>
              )}
            </div>
          )}
        </>
      )}

      {/* Like error */}
      {likeError && (
        <div className="mx-2 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 md:mx-4 dark:bg-red-950/30 dark:text-red-400">
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {likeError}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1 px-2 py-1.5 md:px-4 md:py-2">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-all md:gap-1.5 md:px-3 md:py-2 md:text-sm ${
            liked
              ? "text-[var(--brand)]"
              : "text-[var(--muted)] hover:bg-red-50 hover:text-[var(--brand)]"
          }`}
        >
          <svg className={`h-4 w-4 ${liked ? "fill-current" : "fill-none"}`} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66-.23-.45-.52-.86-.88-1.22L9.46 2.71 8 4.17c-.21.21-.33.48-.33.77v.17l-.95 4.58c-.05.26-.09.52-.09.79v7.42c0 .9.71 1.63 1.6 1.64l7.82.34c.63.03 1.2-.32 1.45-.91l2.5-6.38c.1-.24.16-.5.16-.77z" />
          </svg>
          {likeCount > 0 && likeCount}
          <span className="hidden md:inline">{t("feed.likes")}</span>
        </button>

        {isLoggedIn ? (
          <Link
            href={qs(isProject && project ? `/project/${project.slug || project.id}` : `/post/${slug || id}`, refPath)}
            className="flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] transition-all hover:text-[var(--brand)]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
            </svg>
            {comments}
            <span className="hidden md:inline">{t("feed.comments")}</span>
          </Link>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); window.location.href = "/login"; }}
            className="flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] transition-all hover:text-[var(--brand)]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
            </svg>
            {comments}
            <span className="hidden md:inline">{t("feed.comments")}</span>
          </button>
        )}

        <button
          onClick={handleShare}
          className="ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-[var(--muted)] hover:bg-gray-100 hover:text-[var(--foreground)] md:gap-1.5 md:px-3 md:py-2 md:text-sm transition-all"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
          </svg>
          <span className="hidden md:inline">{t("feed.share")}</span>
        </button>
      </div>

    </article>
  );
}
