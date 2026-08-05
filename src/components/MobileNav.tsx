"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/lib/lang";

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
  { key: "profile", href: "/u", icon: <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg> },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useTranslation();
  const isLoggedIn = !!session?.user;

  // Hide nav on detail feed pages (post & project) — replaced by fixed comment bar
  // Also hide when pathname isn't yet available (dynamic import timing guard)
  if (!pathname || /^\/(post|project)\/.+/.test(pathname)) return null;

  const handleSearch = () => {
    window.dispatchEvent(new CustomEvent("open-search"));
  };

  return (
    <nav className="fixed bottom-0 z-50 flex w-full bg-[var(--card)] md:hidden">
      <div className="flex w-full items-center justify-around border-t border-[var(--card-border)] bg-[var(--card)] px-2 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
        {items
          .filter((item) => isLoggedIn || item.href === "/" || item.action === "search")
          .map((item) => {
          const isActive = item.href ? pathname === item.href : false;

          // Tombol search — bukan link, dispatch event ke Navbar
          if (item.action === "search") {
            return (
              <button
                key={item.key}
                onClick={handleSearch}
                className="flex flex-col items-center gap-0.5 px-3 py-1 text-[var(--muted)]"
              >
                {item.icon}
                <span className="text-[10px] font-bold">{t("mobileNav." + item.key)}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={
                item.href === "/u" && session
                  ? `/u/${session.user.username || session.user.name}`
                  : item.href!
              }
              className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
                isActive ? "text-red-500" : "text-[var(--muted)]"
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-bold">{t("mobileNav." + item.key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
