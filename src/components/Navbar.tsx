"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/lib/lang";
import Avatar from "./ui/Avatar";
import LanguageToggle from "./LanguageToggle";
import SearchModal from "./SearchModal";

interface NotifItem {
  id: string;
  type: "LIKE" | "COMMENT" | "REPLY" | "VISIT";
  userId: string;
  actorId: string;
  postId: string | null;
  projectId: string | null;
  read: boolean;
  createdAt: string;
  postTitle: string | null;
  postSlug: string | null;
  projectTitle: string | null;
  projectSlug: string | null;
  actor: { id: string; username: string; name: string | null; avatar: string | null };
}

export default function Navbar() {
  const { data: session, update } = useSession();
  const { t } = useTranslation();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  // Dropdown menu situs — hanya muncul di mobile (Home / Freelance / News)
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (notifOpen || menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen, menuOpen]);

  useEffect(() => {
    const handler = () => { update(); };
    window.addEventListener("session-refresh", handler);
    return () => window.removeEventListener("session-refresh", handler);
  }, [update]);

  useEffect(() => {
    if (!session?.user?.id) return;
    let ignore = false;

    const fetchNotifs = () =>
      fetch("/api/notifications")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (ignore) return;
          if (data?.notifications) setNotifications(data.notifications);
          if (data?.unreadCount != null) setUnreadCount(data.unreadCount);
        })
        .catch(() => {});

    fetchNotifs();
    const interval = setInterval(() => {
      if (!document.hidden) fetchNotifs();
    }, 30000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [session?.user?.id]);

  const markAllRead = () => {
    fetch("/api/notifications", { method: "PATCH" }).then(() => {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    });
  };

  const clearAll = () => {
    fetch("/api/notifications", { method: "DELETE" }).then(() => {
      setNotifications([]);
      setUnreadCount(0);
    });
  };

  const sessionUser = session?.user as
    | { id?: string; username?: string; image?: string | null; name?: string | null }
    | undefined;

  const getNotifLink = (n: NotifItem) => {
    if (n.projectSlug) return `/project/${n.projectSlug}`;
    if (n.projectId) return `/project/${n.projectId}`;
    if (n.postSlug) return `/post/${n.postSlug}`;
    if (n.postId) return `/post/${n.postId}`;
    return `/u/${n.actor.username}`;
  };

  const getNotifMessage = (n: NotifItem) => {
    const name = n.actor.name || n.actor.username;
    switch (n.type) {
      case "LIKE":
        return (
          <span>
            <strong>{name}</strong> {t("nav.notifLike")}
            {n.projectTitle ? <strong> {n.projectTitle}</strong> : n.postTitle ? <em> &ldquo;{n.postTitle}&rdquo;</em> : null}
          </span>
        );
      case "COMMENT":
        return (
          <span>
            <strong>{name}</strong> {t("nav.notifComment")}
            {n.projectTitle ? <strong> {n.projectTitle}</strong> : n.postTitle ? <em> &ldquo;{n.postTitle}&rdquo;</em> : null}
          </span>
        );
      case "REPLY":
        return (
          <span>
            <strong>{name}</strong> {t("nav.notifReply")}
            {n.projectTitle ? <strong> {n.projectTitle}</strong> : n.postTitle ? <em> &ldquo;{n.postTitle}&rdquo;</em> : null}
          </span>
        );
      case "VISIT":
        return <span><strong>{name}</strong> {t("nav.notifVisit")}</span>;
    }
  };

  const getNotifIcon = (n: NotifItem) => {
    const color = {
      LIKE: "text-red-500",
      COMMENT: "text-blue-500",
      REPLY: "text-purple-500",
      VISIT: "text-green-500",
      COMMUNITY_POST: "text-orange-500",
      COMMUNITY_LIKE: "text-red-500",
      COMMUNITY_JOIN_APPROVED: "text-green-500",
      COMMUNITY_NEW_MEMBER: "text-blue-500",
      COMMUNITY_JOIN_REQUEST: "text-yellow-500",
      COMMUNITY_MENTION: "text-purple-500",
    }[n.type];
    const cls = `h-3 w-3 ${color}`;
    switch (n.type) {
      case "LIKE":
        return <svg className={cls} fill="currentColor" viewBox="0 0 24 24"><path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66-.23-.45-.52-.86-.88-1.22L9.46 2.71 8 4.17c-.21.21-.33.48-.33.77v.17l-.95 4.58c-.05.26-.09.52-.09.79v7.42c0 .9.71 1.63 1.6 1.64l7.82.34c.63.03 1.2-.32 1.45-.91l2.5-6.38c.1-.24.16-.5.16-.77z" /></svg>;
      case "COMMENT":
        return <svg className={cls} fill="currentColor" viewBox="0 0 24 24"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z" /></svg>;
      case "REPLY":
        return <svg className={cls} fill="currentColor" viewBox="0 0 24 24"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" /></svg>;
      case "VISIT":
        return <svg className={cls} fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>;
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("timeAgo.justNow");
    if (mins < 60) return t("timeAgo.minutes", { n: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t("timeAgo.hours", { n: hrs });
    const days = Math.floor(hrs / 24);
    return t("timeAgo.days", { n: days });
  };

  const [searchOpen, setSearchOpen] = useState(false);

  // Dengarkan event "open-search" dari MobileNav
  useEffect(() => {
    const handler = () => setSearchOpen(true);
    window.addEventListener("open-search", handler);
    return () => window.removeEventListener("open-search", handler);
  }, []);

  // ── Hide-on-scroll (mobile, hanya halaman detail feed) ──
  // Saat scroll ke bawah di halaman detail (post/project/event), navbar ikut
  // naik & menghilang — tombol back sticky di halaman menggantikan posisinya.
  // Pakai `top` (bukan transform) agar dropdown notif yang position:fixed
  // di dalam header tetap ter-anchor ke viewport, bukan ke header.
  const pathname = usePathname();
  const isDetailFeed = /^\/(post|project|event)\/.+/.test(pathname || "");
  const [navbarHidden, setNavbarHidden] = useState(false);

  useEffect(() => {
    if (!isDetailFeed) {
      setNavbarHidden(false);
      return;
    }
    let lastY = window.scrollY;
    const onScroll = () => {
      if (window.innerWidth >= 768) return;
      const y = window.scrollY;
      if (y > lastY && y > 56) setNavbarHidden(true);
      else if (y < lastY) setNavbarHidden(false);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isDetailFeed]);

  return (
    <header
      className={`fixed top-0 z-[60] w-full border-b border-[var(--card-border)] bg-[var(--card)] transition-[top] duration-300 ease-out ${navbarHidden ? "-top-16" : "top-0"}`}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          {/* ── Logo / Site title ───────────────────────── */}
          <div className="relative" ref={menuRef}>
            {/* Mobile: judul jadi tombol dropdown (Home / Freelance / News) */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={t("nav.home")}
              aria-expanded={menuOpen}
              className="flex items-center gap-1.5 text-xl font-extrabold tracking-tight md:hidden"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand)] text-sm text-white">
                P
              </span>
              pamerproject
              <svg
                className={`h-4 w-4 text-[var(--muted)] transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {/* Desktop: judul tetap link ke home */}
            <Link
              href="/"
              className="hidden items-center gap-2 text-xl font-extrabold tracking-tight md:flex"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand)] text-sm text-white">
                P
              </span>
              pamerproject
            </Link>

            {/* Dropdown — hanya mobile */}
            {menuOpen && (
              <div className="absolute left-0 top-full z-[70] mt-2 w-56 overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)] py-1.5 shadow-2xl animate-fade-in md:hidden">
                {[
                  {
                    href: "/",
                    label: t("nav.home"),
                    icon: (
                      <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                      </svg>
                    ),
                  },
                  {
                    href: "/freelance",
                    label: t("nav.freelance"),
                    icon: (
                      <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.25v4.25A2.25 2.25 0 0118 20.75H6a2.25 2.25 0 01-2.25-2.25v-4.25m16.5 0a2.25 2.25 0 00-2.25-2.25H6a2.25 2.25 0 00-2.25 2.25m16.5 0V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v8.25M12 12v.008h.008V12H12zm.008 3.75h.008v.008h-.008v-.008z" />
                      </svg>
                    ),
                  },
                  {
                    href: "/technews",
                    label: t("nav.news"),
                    icon: (
                      <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
                      </svg>
                    ),
                  },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--card-border)]/40"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--card-border)]/40 text-[var(--muted)]">
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="relative hidden md:block">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex w-72 cursor-pointer items-center rounded-full border border-[var(--card-border)] bg-[var(--background)] py-2 pl-10 pr-4 text-sm text-[var(--muted)] outline-none transition-all hover:border-[var(--brand)] hover:bg-[var(--card)]"
            >
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <span className="text-[var(--muted)]">{t("nav.searchPlaceholder")}</span>
            </button>
          </div>


        </div>

        <div className="flex items-center gap-2">
          <LanguageToggle />

          {session && <>
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative rounded-lg p-2 text-[var(--muted)] transition-all hover:bg-[var(--brand-light)] hover:text-[var(--brand)]"
                title={t("nav.notifications")}
              >
                {unreadCount > 0 ? (
                  <svg className="h-5 w-5" fill="currentColor" stroke="none" viewBox="0 0 24 24">
                    <path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                )}
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-[var(--brand)] px-1 text-[9px] font-bold text-white shadow-sm shadow-[var(--brand)]/30">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  {/* Overlay */}
                  <div
                    className="fixed inset-0 z-[70] backdrop-blur-md"
                    onClick={() => setNotifOpen(false)}
                  />

                  {/* Mobile: bottom sheet — Desktop: full modal */}
                  <div
                    className="fixed inset-x-0 bottom-0 top-[10%] z-[71] m-0 w-full animate-slide-up rounded-t-2xl border border-l-0 border-r-0 border-[var(--card-border)] bg-white dark:bg-[#1a1a2e] shadow-2xl
                                md:inset-0 md:top-0 md:flex md:animate-none md:rounded-none md:border-0 md:bg-black/40 dark:md:bg-black/60 md:backdrop-blur-sm"
                  >
                    {/* Desktop: container tengah — solid card */}
                    <div className="mx-auto flex w-full max-w-2xl flex-col md:my-8 md:h-[calc(100vh-64px)] md:rounded-2xl md:border md:border-[var(--card-border)] md:bg-[var(--card)] md:shadow-xl">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-[var(--card-border)] px-5 py-4 md:px-6 md:py-4">
                        <div className="flex items-center gap-3">
                          <h3 className="text-base font-extrabold tracking-tight md:text-lg">{t("nav.notifications")}</h3>
                          {unreadCount > 0 && (
                            <span className="rounded-full bg-[var(--brand)] px-2.5 py-0.5 text-[11px] font-bold text-white">
                              {unreadCount} {t("nav.newNotif")}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllRead}
                              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--brand)] transition-all hover:bg-[var(--brand-light)]"
                            >
                              {t("nav.markRead")}
                            </button>
                          )}
                          <button
                            onClick={() => setNotifOpen(false)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] transition-all hover:bg-[var(--brand-light)] hover:text-[var(--brand)]"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700">
                        {notifications.length > 0 ? (
                          <div className="divide-y divide-[var(--card-border)]">
                            {notifications.map((n) => (
                              <Link
                                key={n.id}
                                href={getNotifLink(n)}
                                onClick={() => setNotifOpen(false)}
                                className={`group relative flex items-start gap-4 px-5 py-4 transition-all hover:bg-[var(--brand-light)] md:px-6 md:py-4 ${!n.read ? "bg-blue-50/60 dark:bg-blue-900/10" : ""}`}
                              >
                                {!n.read && (
                                  <span className="absolute left-0 top-0 h-full w-0.5 bg-[var(--brand)]" />
                                )}

                                <div className="relative shrink-0">
                                  <Avatar src={n.actor.avatar} name={n.actor.name} size="md" />
                                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 border-white dark:border-[#1a1a2e] bg-white dark:bg-[#1a1a2e]">
                                    {getNotifIcon(n)}
                                  </span>
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="text-sm leading-snug text-[var(--foreground)]">
                                    {getNotifMessage(n)}
                                  </p>
                                  <span className="mt-1 block text-xs font-medium text-[var(--muted)]">
                                    {timeAgo(n.createdAt)}
                                  </span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center px-6 py-20 text-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand-light)] to-blue-100 dark:from-blue-900/20 dark:to-purple-900/20 shadow-inner">
                              <svg className="h-7 w-7 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                              </svg>
                            </div>
                            <p className="text-base font-bold text-[var(--foreground)]">
                              {t("nav.noNotif")}
                            </p>
                            <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)] max-w-[260px]">
                              {t("nav.noNotifDesc")}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      {notifications.length > 0 && (
                        <div className="border-t border-[var(--card-border)] px-5 py-3">
                          <button
                            onClick={markAllRead}
                            className="w-full rounded-lg py-2.5 text-center text-sm font-semibold text-[var(--brand)] transition-all hover:bg-[var(--brand-light)] md:text-left md:px-3"
                          >
                            {t("nav.markAllRead")}
                          </button>
                          <button
                            onClick={clearAll}
                            className="w-full rounded-lg py-2.5 text-center text-sm font-medium text-red-500 transition-all hover:bg-red-50 dark:hover:bg-red-950/20 md:text-left md:px-3"
                          >
                            {t("nav.clearAll")}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── Avatar + username ───────────────────────── */}
            <Link
              href={`/u/${sessionUser?.username || sessionUser?.name}`}
              className="flex items-center gap-2 rounded-lg p-1.5 transition-all hover:bg-[var(--brand-light)]"
            >
              <Avatar
                src={sessionUser?.image}
                name={sessionUser?.name}
                size="sm"
              />
              <span className="hidden text-sm font-medium md:inline">
                {sessionUser?.name}
              </span>
            </Link>
          </>}
        </div>
      </div>

      {/* Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
