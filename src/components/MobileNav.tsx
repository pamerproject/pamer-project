"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/lib/lang";
import Avatar from "./ui/Avatar";

interface NavItem {
  key: string;
  href?: string;
  icon: React.ReactNode;
  action?: "search";
}

const items: NavItem[] = [
  { key: "home", href: "/", icon: <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg> },
  { key: "search", action: "search", icon: <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg> },
  { key: "projects", href: "/projects", icon: <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg> },
  { key: "events", href: "/event", icon: <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zM6.75 6.75h10.5" /></svg> },
  { key: "profile", href: "/u", icon: null },
];

const STORAGE_KEY = {
  story: "pamerproject_seen_story",
  project: "pamerproject_seen_project",
  event: "pamerproject_seen_event",
} as const;

type LatestMap = { story?: string | null; project?: string | null; event?: string | null };

function useLatestContent() {
  const [latest, setLatest] = useState<LatestMap>({});
  const [seen, setSeen] = useState<LatestMap>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let ignore = false;
    fetch("/api/latest")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (ignore || !data) return;
        const next: LatestMap = {
          story: data.latestStory,
          project: data.latestProject,
          event: data.latestEvent,
        };
        setLatest(next);
        setSeen({
          story: localStorage.getItem(STORAGE_KEY.story),
          project: localStorage.getItem(STORAGE_KEY.project),
          event: localStorage.getItem(STORAGE_KEY.event),
        });
        // Kunjungan pertama: seed seen = latest supaya user baru tidak
        // dihujani titik merah pada load pertama.
        (["story", "project", "event"] as const).forEach((key) => {
          if (!localStorage.getItem(STORAGE_KEY[key])) {
            localStorage.setItem(STORAGE_KEY[key], next[key] || "");
          }
        });
        setLoaded(true);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  const markSeen = (key: keyof typeof STORAGE_KEY, ts?: string | null) => {
    localStorage.setItem(STORAGE_KEY[key], ts || "");
    setSeen((prev) => ({ ...prev, [key]: ts }));
  };

  const hasNew = (key: keyof typeof STORAGE_KEY) =>
    loaded && !!latest[key] && latest[key] !== (seen[key] || "");

  return { latest, markSeen, hasNew };
}

export default function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useTranslation();
  const { latest, markSeen, hasNew } = useLatestContent();
  const isLoggedIn = !!session?.user;

  // Tandai tiap konten "sudah dilihat" saat user membuka halamannya
  useEffect(() => {
    if (pathname === "/") markSeen("story", latest.story);
    else if (pathname === "/projects") markSeen("project", latest.project);
    else if (pathname === "/event") markSeen("event", latest.event);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, latest.story, latest.project, latest.event]);

  // Hide nav on detail feed pages (post & project) — replaced by fixed comment bar
  // Also hide when pathname isn't yet available (dynamic import timing guard)
  if (!pathname || /^\/(post|project)\/.+/.test(pathname)) return null;

  const handleSearch = () => {
    window.dispatchEvent(new CustomEvent("open-search"));
  };

  const dotForKey: Record<string, boolean> = {
    home: hasNew("story"),
    projects: hasNew("project"),
    events: hasNew("event"),
  };

  // Bungkus icon + titik merah (kalau ada yang baru)
  const renderIcon = (icon: React.ReactNode, itemKey: string, active: boolean) => (
    <span className="relative flex items-center justify-center">
      <span className={active ? "text-red-500" : ""}>{icon}</span>
      {dotForKey[itemKey] && (
        <span className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-[var(--card)]" />
      )}
    </span>
  );

  const profileHref = isLoggedIn
    ? `/u/${session?.user?.username || session?.user?.name}`
    : "/u";

  const profileNode = isLoggedIn ? (
    <Avatar
      src={session?.user?.image}
      name={session?.user?.name}
      size="xs"
    />
  ) : (
    items[4].icon
  );

  return (
    <nav className="fixed bottom-0 z-50 flex w-full bg-[var(--card)] md:hidden">
      <div className="flex w-full items-center justify-around border-t border-[var(--card-border)] bg-[var(--card)] px-2 pb-[calc(env(safe-area-inset-bottom)+1.75rem)] pt-2">
        {items
          .filter((item) => isLoggedIn || item.href === "/" || item.action === "search")
          .map((item) => {
            const isActive = item.key === "profile"
              ? pathname === "/u" || pathname.startsWith("/u/")
              : item.href
                ? pathname === item.href
                : false;

            // Tombol search — bukan link, dispatch event ke Navbar
            if (item.action === "search") {
              return (
                <button
                  key={item.key}
                  onClick={handleSearch}
                  className="flex flex-col items-center gap-0.5 px-3 py-1 text-[var(--muted)]"
                >
                  {renderIcon(item.icon!, item.key, isActive)}
                  <span className="text-[10px] font-bold">{t("mobileNav." + item.key)}</span>
                </button>
              );
            }

            // Ikon profile — gunakan foto profile user (atau inisial seperti desktop)
            if (item.key === "profile") {
              return (
                <Link
                  key={item.key}
                  href={profileHref}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
                    isActive ? "text-red-500" : "text-[var(--muted)]"
                  }`}
                >
                  {renderIcon(profileNode, item.key, isActive)}
                  <span className="text-[10px] font-bold">{t("mobileNav." + item.key)}</span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href!}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
                  isActive ? "text-red-500" : "text-[var(--muted)]"
                }`}
              >
                {renderIcon(item.icon!, item.key, isActive)}
                <span className="text-[10px] font-bold">{t("mobileNav." + item.key)}</span>
              </Link>
            );
          })}
      </div>
    </nav>
  );
}