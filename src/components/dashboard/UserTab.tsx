"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "@/lib/lang";
import Avatar from "@/components/ui/Avatar";

interface AdminUser {
  id: string;
  name: string | null;
  username: string;
  avatar: string | null;
  role: string;
  createdAt: string;
}

const PAGE_SIZE = 20;

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function UserTab() {
  const { t, lang } = useTranslation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [autoLoading, setAutoLoading] = useState(false);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (skip: number) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      try {
        const res = await fetch(`/api/admin/users?skip=${skip}&take=${PAGE_SIZE}`);
        if (!res.ok) {
          setError(t("error.failedToLoad"));
          return;
        }
        const data = await res.json();
        setUsers((prev) => (skip === 0 ? data.users : [...prev, ...data.users]));
        setHasMore(!!data.hasMore);
      } catch {
        setError(t("error.failedToLoad"));
      } finally {
        loadingRef.current = false;
      }
    },
    [t]
  );

  const loadMore = useCallback(async () => {
    if (loadingRef.current || loadingMore || !hasMore) return;
    setLoadingMore(true);
    setAutoLoading(true);
    try {
      await load(users.length);
    } finally {
      setLoadingMore(false);
      setAutoLoading(false);
    }
  }, [loadingMore, hasMore, load, users.length]);

  useEffect(() => {
    let ignore = false;
    fetch(`/api/admin/users?skip=0&take=${PAGE_SIZE}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (ignore || !d) return;
        setUsers(d.users || []);
        setHasMore(!!d.hasMore);
      })
      .catch(() => {
        if (!ignore) setError(t("error.failedToLoad"));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lazy loading: begitu sentinel terlihat dan masih ada data, muat halaman berikutnya
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || autoLoading || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [autoLoading, hasMore, loadMore]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="card-app rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-8 text-center">
        <p className="text-sm text-[var(--muted)]">{t("dashboard.noUsers")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-[var(--card-border)]">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-[var(--brand-light)] text-xs uppercase tracking-wider text-[var(--muted)]">
              <th className="px-3 py-2.5 font-bold md:px-4">{t("dashboard.colName")}</th>
              <th className="hidden px-3 py-2.5 font-bold sm:table-cell md:px-4">{t("dashboard.colUsername")}</th>
              <th className="px-3 py-2.5 font-bold md:px-4">{t("dashboard.colJoined")}</th>
              <th className="px-3 py-2.5 text-right font-bold md:px-4">{t("dashboard.colRole")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--card-border)] bg-[var(--card)]">
            {users.map((u, i) => (
              <tr
                key={u.id}
                className={`transition-colors hover:bg-[var(--brand-light)]/40 ${
                  i % 2 === 1 ? "bg-[var(--background)]/40" : ""
                }`}
              >
                <td className="px-3 py-2 md:px-4">
                  <div className="flex items-center gap-2.5">
                    <Avatar src={u.avatar} name={u.name || u.username} size="sm" />
                    <span className="font-semibold text-[var(--foreground)]">
                      {u.name || u.username}
                    </span>
                  </div>
                </td>
                <td className="hidden px-3 py-2 text-[var(--muted)] sm:table-cell md:px-4">
                  @{u.username}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-[var(--muted)] md:text-sm">
                  {formatDate(u.createdAt, lang)}
                </td>
                <td className="px-3 py-2 text-right md:px-4">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide md:text-xs ${
                      u.role === "ADMIN"
                        ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {u.role === "ADMIN" ? t("dashboard.roleAdmin") : t("dashboard.roleUser")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="text-center text-xs text-red-500">{error}</p>}

      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-1">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-5 py-2 text-xs font-bold text-[var(--muted)] transition-all hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:opacity-50"
          >
            {loadingMore ? t("dashboard.loadingMore") : t("dashboard.loadMore")}
          </button>
        </div>
      )}
    </div>
  );
}
