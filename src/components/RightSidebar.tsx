"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useTranslation } from "@/lib/lang";
import Link from "next/link";
import renderContent from "@/lib/renderContent";
import EventCountdown from "./EventCountdown";
import { translateApiError } from "@/lib/helpers";

interface PinnedProject {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  image: string | null;
  tags: string[];
  liveUrl: string | null;
  repoUrl: string | null;
}

interface ProfileLink {
  name: string;
  url: string;
}

interface ProfileUserData {
  id: string;
  name: string | null;
  username: string;
  bio: string | null;
  avatar: string | null;
  links: ProfileLink[];
  projects: PinnedProject[];
}

interface SidebarEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  image: string | null;
  badge: string;
  duration: string;
  endsAt: string | null;
  active: boolean;
  participantCount: number;
  joined: boolean;
  createdAt: string;
}

/** Extract username from /u/[username] path, or null if not on a profile page */
function useProfileUsername(): string | null {
  const pathname = usePathname();
  const match = pathname?.match(/^\/u\/([^/]+)$/);
  return match ? match[1] : null;
}

export default function RightSidebar() {
  const { t } = useTranslation();
  const profileUsername = useProfileUsername();
  const { data: session } = useSession();
  const currentUsername = (session?.user as { username?: string } | undefined)?.username;
  const [profileUser, setProfileUser] = useState<ProfileUserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [openMenuProjectId, setOpenMenuProjectId] = useState<string | null>(null);
  const [joiningSlug, setJoiningSlug] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close three-dot menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuProjectId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleUnpinProject = async (project: PinnedProject) => {
    setOpenMenuProjectId(null);
    try {
      const pinUrl = `/api/projects/${project.slug || "_"}/pin${!project.slug ? `?projectId=${project.id}` : ""}`;
      const res = await fetch(pinUrl, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(translateApiError(data.message, t) || t("rightSidebar.unpinFailed"));
      }
      window.dispatchEvent(new CustomEvent("pinned-projects-updated"));
    } catch {
      alert(t("rightSidebar.networkError"));
      window.dispatchEvent(new CustomEvent("pinned-projects-updated"));
    }
  };

  const router = useRouter();

  const handleToggleJoinEvent = async (ev: SidebarEvent) => {
    if (!session?.user?.id) {
      router.push("/login");
      return;
    }
    setJoiningSlug(ev.slug);
    try {
      const res = await fetch(`/api/events/${ev.slug}/join`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(translateApiError(data.message, t) || t("rightSidebar.networkError"));
      }
      window.dispatchEvent(new CustomEvent("events-updated"));
    } catch {
      alert(t("rightSidebar.networkError"));
      window.dispatchEvent(new CustomEvent("events-updated"));
    } finally {
      setJoiningSlug(null);
    }
  };

  const isOwnProfile = !!currentUsername && currentUsername === profileUsername;

  // Refresh when pinned projects are updated
  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1);
    window.addEventListener("pinned-projects-updated", handler);
    return () => window.removeEventListener("pinned-projects-updated", handler);
  }, []);

  // Fetch profile data when on a profile page
  useEffect(() => {
    if (!profileUsername) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset saat keluar halaman profil
      setProfileUser(null);
      return;
    }

    let ignore = false;
    setLoading(true);

    fetch(`/api/users/${profileUsername}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!ignore) {
          setProfileUser(data?.user ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setProfileUser(null);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [profileUsername, refreshKey]);

  const isProfilePage = !!profileUsername;

  const [tags, setTags] = useState<{ tag: string; count: number }[]>([]);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [events, setEvents] = useState<SidebarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const trophyIcon = (
    <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
    </svg>
  );

  const clockIcon = (
    <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.tags) setTags(data.tags);
      })
      .catch(() => {})
      .finally(() => setSidebarLoading(false));
  }, []);

  // Sync daftar event dari API (real)
  useEffect(() => {
    let ignore = false;
    const load = () => {
      fetch("/api/events")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!ignore) setEvents(data?.events || []);
        })
        .catch(() => {})
        .finally(() => {
          if (!ignore) setEventsLoading(false);
        });
    };
    load();
    window.addEventListener("events-updated", load);
    return () => {
      ignore = true;
      window.removeEventListener("events-updated", load);
    };
  }, []);

  // Hanya event aktif yang tampil di sidebar — yang nonaktif disembunyikan
  // (status follow user di DB tetap tersimpan, terlihat saat buka detail event)
  const visibleEvents = events.filter((ev) => ev.active);
  const myEvents = visibleEvents.filter((ev) => ev.joined);
  // 2 event aktif terbaru (by createdAt) tampil di section Events
  const latestEvents = [...visibleEvents]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 2);

  return (
    <aside className="hidden w-[300px] shrink-0 lg:block">
      <div className="fixed top-20 flex h-[calc(100vh-80px)] w-[300px] flex-col gap-4 overflow-y-auto pb-8">
        {/* ── User Info + Bio (profil page only) ──────────── */}
        {isProfilePage && (
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
            {loading ? (
              /* Skeleton */
              <div className="animate-pulse space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-700" />
                  </div>
                </div>
                <div className="h-3 w-full rounded bg-gray-100 dark:bg-gray-700" />
                <div className="h-3 w-3/4 rounded bg-gray-100 dark:bg-gray-700" />
              </div>
            ) : profileUser ? (
              <>
                <div className="flex items-center gap-3">
                  {profileUser.avatar ? (
                    <Image
                      src={profileUser.avatar}
                      alt={profileUser.name || profileUser.username}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover ring-2 ring-white"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand)] text-sm font-bold text-white">
                      {(profileUser.name || profileUser.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/u/${profileUser.username}`}
                      className="block truncate text-sm font-bold hover:text-[var(--brand)]"
                    >
                      {profileUser.name || profileUser.username}
                    </Link>
                    <span className="text-xs text-[var(--brand)]">@{profileUser.username}</span>
                  </div>
                </div>

                {profileUser.bio ? (
                  <div className="mt-2 text-xs leading-relaxed text-[var(--muted)] whitespace-pre-wrap line-clamp-3">
                    {renderContent(profileUser.bio, false)}
                  </div>
                ) : (
                  <p className="mt-2 text-xs italic text-[var(--muted)]">{t("rightSidebar.bioEmpty")}</p>
                )}

                {/* Links */}
                {profileUser.links && profileUser.links.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-[var(--card-border)] pt-3">
                    {profileUser.links.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-[var(--muted)] transition-all hover:bg-[var(--brand-light)] hover:text-[var(--brand)]"
                      >
                        <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                        <span className="truncate">{link.name}</span>
                      </a>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* ── Pinned Projects (profil page only) ──────────── */}
        {isProfilePage && (
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">              <h3 className="flex items-center gap-1.5 text-sm font-bold text-[var(--foreground)]">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </svg>
              {t("rightSidebar.pinnedProjects")}
            </h3>
            {loading ? (
              <div className="mt-3 animate-pulse space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg p-2">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
                      <div className="h-2 w-1/2 rounded bg-gray-100 dark:bg-gray-700" />
                    </div>
                  </div>
                ))}
              </div>
            ) : profileUser && profileUser.projects.length > 0 ? (
              <div className="mt-3 space-y-2">
                {profileUser.projects.map((project) => (
                  <div key={project.id} className="group relative">
                    <Link
                      href={`/project/${project.slug || project.id}`}
                      className="flex items-center gap-2 rounded-lg p-2 transition-all hover:bg-[var(--brand-light)]"
                    >
                      {project.image ? (
                        <Image src={project.image} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--brand)]/20 to-[var(--brand)]/5 text-xs font-bold text-[var(--brand)]">
                          {project.title.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-[var(--foreground)]">
                          {project.title}
                        </span>
                        {project.tags.length > 0 && (
                          <span className="block truncate text-[10px] text-[var(--muted)]">
                            {project.tags.slice(0, 3).join(", ")}
                          </span>
                        )}
                      </div>
                    </Link>
                    {isOwnProfile && (
                      <div className="absolute right-1 top-1 z-20">
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenMenuProjectId(openMenuProjectId === project.id ? null : project.id); }}
                          className="rounded-lg p-1 text-[var(--muted)] opacity-0 transition-all hover:bg-[var(--brand-light)] hover:text-[var(--brand)] group-hover:opacity-100"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                          </svg>
                        </button>
                        {openMenuProjectId === project.id && (
                          <div ref={menuRef} className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)] py-1 shadow-lg" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleUnpinProject(project); }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-50 dark:hover:bg-amber-950/30"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Unpin
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs italic text-[var(--muted)]">{t("rightSidebar.noPinned")}</p>
            )}
          </div>
        )}

        {/* ── Tags ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">            <h3 className="flex items-center gap-1.5 text-sm font-bold text-[var(--foreground)]">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
            {t("rightSidebar.popularTags")}
          </h3>
          {sidebarLoading ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-7 w-20 animate-pulse rounded-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800"
                />
              ))}
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((tagItem) => (
                <Link
                  key={tagItem.tag}
                  href={`/tags/${encodeURIComponent(tagItem.tag)}`}
                  className="rounded-lg border border-[var(--card-border)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted)] transition-all hover:border-[var(--brand)] hover:bg-[var(--brand-light)] hover:text-[var(--brand)]"
                >
                  #{tagItem.tag}
                  <span className="ml-1 text-[10px] text-[var(--muted)] opacity-60">{tagItem.count}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Events yang sedang diikuti ── */}
        {myEvents.length > 0 && (
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-[var(--foreground)]">
              <svg className="h-4 w-4 text-[var(--brand)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 6l2.29 2.29-9.88 9.88-4-4L6 13.17 8.41 10.59 11 13.17 16 6m0-4l-6 7-4-4-4 4 6 7 8-11z" />
              </svg>
              {t("rightSidebar.myEvents")}
            </h3>
            <div className="mt-3 space-y-2">
              {myEvents.map((ev) => (
                <Link
                  key={ev.id}
                  href={`/event/${ev.slug}`}
                  className={`group flex items-center gap-2.5 rounded-lg border border-[var(--card-border)] p-2 transition-all hover:border-[var(--brand)] hover:bg-[var(--brand-light)] ${
                    ev.active ? "" : "opacity-70 grayscale"
                  }`}
                >
                  {ev.image ? (
                    <Image
                      src={ev.image}
                      alt={ev.title}
                      width={40}
                      height={40}
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-light)] text-sm font-bold text-[var(--brand)]">
                      {ev.title.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-[var(--foreground)] group-hover:text-[var(--brand)]">
                      {ev.title}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[var(--muted)]">
                      {clockIcon}
                      {ev.duration}
                    </p>
                    {ev.active && ev.endsAt && (
                      <p className="mt-0.5 text-[10px]">
                        <EventCountdown endsAt={ev.endsAt} />
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      ev.active
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-700/60 dark:text-gray-400"
                    }`}
                  >
                    {ev.active ? t("rightSidebar.following") : t("event.statusInactive")}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Events (2 terbaru) ─────────────────────────── */}
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <Link
            href="/event"
            className="group flex items-center gap-1.5 text-sm font-bold text-[var(--foreground)] transition-colors hover:text-[var(--brand)]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zM6.75 6.75h10.5" />
            </svg>
            {t("rightSidebar.events")}
            <svg className="h-3 w-3 text-[var(--muted)] opacity-0 transition-opacity group-hover:opacity-100" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>

          {eventsLoading ? (
            <div className="mt-3 space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="animate-pulse overflow-hidden rounded-xl border border-[var(--card-border)]"
                >
                  <div className="h-44 w-full bg-gray-200 dark:bg-gray-700" />
                  <div className="space-y-2 p-2.5">
                    <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-3 w-3/4 rounded bg-gray-100 dark:bg-gray-700" />
                  </div>
                </div>
              ))}
            </div>
          ) : latestEvents.length === 0 ? (
            <p className="mt-3 text-xs italic text-[var(--muted)]">{t("event.noEvents")}</p>
          ) : (
            <div className="mt-3 space-y-3">
              {latestEvents.map((ev) => (
                <Link
                  key={ev.id}
                  href={`/event/${ev.slug}`}
                  className={`group relative block overflow-hidden rounded-xl border border-[var(--card-border)] transition-all hover:border-[var(--brand)] hover:bg-[var(--brand-light)] ${
                    ev.active ? "" : "opacity-70 grayscale"
                  }`}
                >
                  {ev.image ? (
                    <Image
                      src={ev.image}
                      alt={ev.title}
                      width={280}
                      height={112}
                      className="h-28 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-28 w-full items-center justify-center bg-gradient-to-br from-[var(--brand)]/20 to-[var(--brand)]/5">
                      <svg className="h-10 w-10 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zM6.75 6.75h10.5" />
                      </svg>
                    </div>
                  )}
                  <div className="p-2.5">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="inline-flex items-center gap-1 rounded-md bg-[var(--brand-light)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--brand)]">
                        {trophyIcon}
                        {ev.badge}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                        {clockIcon}
                        {ev.duration}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs font-bold leading-snug text-[var(--foreground)] line-clamp-2 group-hover:text-[var(--brand)]">
                      {ev.title}
                    </p>
                    {ev.description && (
                      <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)] line-clamp-2">
                        {ev.description}
                      </p>
                    )}
                    {ev.active && ev.endsAt && (
                      <p className="mt-1 text-[10px] font-medium text-[var(--brand)]">
                        <EventCountdown endsAt={ev.endsAt} />
                      </p>
                    )}
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleJoinEvent(ev); }}
                      disabled={joiningSlug === ev.slug}
                      className={`mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${
                        ev.joined
                          ? "border border-[var(--card-border)] bg-[var(--card)] text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
                          : "bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]"
                      }`}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3V15M4.5 6h15M4.5 15h15M6 6v15m-1.5 0h15a.75.75 0 00.75-.75V6.75A.75.75 0 0019.5 6H4.5a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75z" />
                      </svg>
                      {ev.joined ? t("rightSidebar.followingEvent") : t("rightSidebar.followEvent")}
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>



      </div>
    </aside>
  );
}
