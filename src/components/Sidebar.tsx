"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/lib/lang";

interface TrendingProject {
  rank: number;
  id: string;
  title: string;
  slug: string | null;
  image: string | null;
  tags: string[];
  user: { username: string; avatar: string | null };
  likes: number;
  comments: number;
  engagement: number;
}

const menuItems = [
];

const menuItemsRaw = [
  { key: "home", href: "/", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg> },
  { key: "projects", href: "/projects", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg> },
  { key: "events", href: "/event", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zM6.75 6.75h10.5" /></svg> },
  { key: "technews", href: "/technews", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg> },
  { key: "freelance", href: "/freelance", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" /></svg> },
  { key: "dashboard", href: "/dashboard", adminOnly: true, icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m-18.375 0V5.625m18.375 0c0-.621-.504-1.125-1.125-1.125h-16.5c-.621 0-1.125.504-1.125 1.125m18.375 0c.621 0 1.125.504 1.125 1.125" /></svg> },
];

export default function Sidebar() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const isLoggedIn = !!session?.user;
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN";
  const pathname = usePathname();

  const [trending, setTrending] = useState<TrendingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState<Record<string, number>>({});

  const getLastSeen = (key: string): number => {
    try { return parseInt(localStorage.getItem(`seen_${key}`) || "0", 10); } catch { return 0; }
  };

  const markSeen = (key: string) => {
    try { localStorage.setItem(`seen_${key}`, String(Date.now())); } catch {}
  };

  useEffect(() => {
    let ignore = false;

    const fetchTrending = () =>
      fetch("/api/trending")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!ignore && data?.trending) {
            setTrending(data.trending);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!ignore) setLoading(false);
        });

    const fetchUnread = () => {
      const params = new URLSearchParams();
      const sections = ["beranda", "projects"];
      for (const s of sections) {
        const ts = getLastSeen(s);
        if (ts > 0) params.set(s, String(ts));
      }
      fetch(`/api/unread-counts?${params.toString()}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!ignore && data) setUnread(data);
        })
        .catch(() => {});
    };

    fetchTrending();
    fetchUnread();

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchTrending();
        fetchUnread();
      }
    }, 30000);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <aside className="hidden w-[260px] shrink-0 md:block">
      <div className="fixed top-20 flex h-[calc(100vh-80px)] w-[260px] flex-col gap-1 overflow-y-auto">
        {menuItemsRaw
          .filter((item) => (isLoggedIn || item.href === "/") && (!item.adminOnly || isAdmin))
          .map((item) => {
          const labelKey = "sidebar." + item.key;
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const countKey: Record<string, string> = { "/": "beranda", "/projects": "projects", "/event": "events", "/freelance": "jobs" };
          const itemCount = unread[countKey[item.href] || ""] || 0;
          return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => markSeen(countKey[item.href] || "")}
            className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors ${
              isActive
                ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                : "text-[var(--muted)] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
            }`}
          >
            <span className={isActive ? "text-red-500" : "text-[var(--muted)]"}>{item.icon}</span>
            {t(labelKey)}
            {itemCount > 0 && (
              <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${
                isActive
                  ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
                  : "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
              }`}>
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Link>
          );
        })}

        <div className="my-4 border-t border-[var(--card-border)]" />

        <div className="px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--brand-light)]">
              <svg className="h-3.5 w-3.5 text-[var(--brand)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 6l2.29 2.29-9.88 9.88-4-4L6 13.17 8.41 10.59 11 13.17 16 6m0-4l-6 7-4-4-4 4 6 7 8-11z" />
              </svg>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">{t("sidebar.trending")}</span>
          </div>

          <div className="mt-3 space-y-1">
            {loading ? (
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex animate-pulse items-center gap-2.5 rounded-lg p-2.5"
                  >
                    <div className="h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3.5 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                      <div className="h-2.5 w-1/3 rounded bg-gray-100 dark:bg-gray-700" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-3 w-8 rounded bg-gray-100 dark:bg-gray-700" />
                      <div className="h-3 w-8 rounded bg-gray-100 dark:bg-gray-700" />
                    </div>
                  </div>
                ))}
              </>
            ) : trending.length === 0 ? (
              <p className="py-4 text-center text-xs text-[var(--muted)]">
                {t("sidebar.noTrending")}
              </p>
            ) : (
              <>
                {trending.map((item) => {
                  const rankColors: Record<number, string> = {
                    1: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
                    2: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
                    3: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
                  };
                  const rankBg = rankColors[item.rank] || "bg-[var(--card-border)] text-[var(--muted)]";

                  return (
                    <Link
                      key={item.id}
                      href={`/project/${item.slug || item.id}`}
                      className="group flex items-center gap-2.5 rounded-lg p-2.5 transition-all hover:bg-[var(--brand-light)]"
                    >
                      {/* Rank badge */}
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${rankBg}`}>
                        {item.rank}
                      </span>

                      {/* Title + tag */}
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-[var(--foreground)] transition-colors group-hover:text-[var(--brand)]">
                          {item.title}
                        </span>
                        {item.tags.length > 0 && (
                          <span className="block truncate text-[11px] text-[var(--muted)]">
                            #{item.tags[0]}
                            {item.tags.length > 1 && ` +${item.tags.length - 1}`}
                          </span>
                        )}
                      </div>

                      {/* Comment count */}
                      <div className="flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-[var(--muted)]">
                        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z" />
                        </svg>
                        {item.comments}
                      </div>
                    </Link>
                  );
                })}

                <div className="mt-2 border-t border-[var(--card-border)] pt-2">
                  <Link
                    href="/projects"
                    className="flex items-center justify-center gap-1 rounded-lg border border-[var(--card-border)] px-3 py-2 text-xs font-medium text-[var(--muted)] transition-all hover:border-[var(--brand)] hover:bg-[var(--brand-light)] hover:text-[var(--brand)]"
                  >
                    {t("sidebar.viewAll")}
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-auto border-t border-[var(--card-border)] px-4 pb-6 pt-4">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
            <Link href="/about" className="hover:text-[var(--brand)]">{t("sidebar.about")}</Link>
            <Link href="/privacy" className="hover:text-[var(--brand)]">{t("sidebar.privacy")}</Link>
            <Link href="/terms" className="hover:text-[var(--brand)]">{t("sidebar.terms")}</Link>
            <Link href="/contact" className="hover:text-[var(--brand)]">{t("sidebar.contact")}</Link>
          </div>
          <p className="mt-2 text-xs text-gray-300">{t("sidebar.copyright")}</p>
        </div>
      </div>
    </aside>
  );
}
