"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/lang";
import Breadcrumb from "@/components/Breadcrumb";
import EventCountdown from "@/components/EventCountdown";

interface EventItem {
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
  createdAt: string;
}

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

const calendarIcon = (
  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zM6.75 6.75h10.5" />
  </svg>
);

const peopleIcon = (
  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
  </svg>
);

/**
 * Urutkan: aktif di atas (paling dekat berakhir paling atas), tidak aktif di bawah (terbaru dulu).
 * Event aktif yang sudah lewat deadline ditempatkan di bawah event aktif yang masih berjalan.
 */
function sortEvents(events: EventItem[]): EventItem[] {
  const now = Date.now();
  return [...events].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    if (a.active) {
      const aEnds = a.endsAt ? new Date(a.endsAt).getTime() : Number.POSITIVE_INFINITY;
      const bEnds = b.endsAt ? new Date(b.endsAt).getTime() : Number.POSITIVE_INFINITY;
      // Yang sudah lewat deadline (endsAt < now) ditaruh paling bawah grup aktif
      const aEnded = aEnds !== Number.POSITIVE_INFINITY && aEnds <= now;
      const bEnded = bEnds !== Number.POSITIVE_INFINITY && bEnds <= now;
      if (aEnded !== bEnded) return aEnded ? 1 : -1;
      return aEnds - bEnds;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export default function EventsPage() {
  const { t, lang } = useTranslation();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const load = () => {
      fetch("/api/events")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!ignore && data?.events) setEvents(sortEvents(data.events));
        })
        .catch(() => {})
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    };
    load();
    window.addEventListener("events-updated", load);
    return () => {
      ignore = true;
      window.removeEventListener("events-updated", load);
    };
  }, []);

  if (loading) {
    return (
      <div className="px-4 md:px-0">
        <div className="mb-6 animate-pulse">
          <div className="h-8 w-48 rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800" />
          <div className="mt-2 h-4 w-72 rounded bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)]">
              <div className="aspect-video w-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800" />
              <div className="space-y-3 p-4">
                <div className="h-5 w-3/4 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800" />
                <div className="h-3 w-full rounded bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
                <div className="h-3 w-2/3 rounded bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-0">
      <Breadcrumb segments={[{ label: t("sidebar.home"), href: "/" }, { label: t("event.pageTitle") }]} />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">
          <span className="text-[var(--brand)]">{t("event.pageTitle")}</span>
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{t("event.pageDesc")}</p>
      </div>

      {events.length === 0 ? (
        <div className="card-app rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-light)]">
            <svg className="h-8 w-8 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zM6.75 6.75h10.5" />
            </svg>
          </div>
          <h3 className="text-lg font-bold">{t("event.noEvents")}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">{t("event.noEventsDesc")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-2">
          {events.map((ev) => (
            <Link key={ev.id} href={`/event/${ev.slug}`} className="group block">
              <article
                className={`card-app overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)] transition-all hover:border-[var(--brand)] hover:shadow-md ${
                  ev.active ? "" : "opacity-70 grayscale"
                }`}
              >
                {/* Image */}
                {ev.image ? (
                  <div className="relative aspect-video w-full overflow-hidden">
                    <img src={ev.image} alt={ev.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    {!ev.active && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/60 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          {t("event.notActive")}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative flex aspect-video w-full items-center justify-center bg-gradient-to-br from-[var(--brand-light)] to-[var(--brand)]/10">
                    <svg className="h-10 w-10 text-[var(--brand)]/40" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zM6.75 6.75h10.5" />
                    </svg>
                    {!ev.active && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/60 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          {t("event.notActive")}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="p-4">
                  {/* Badges */}
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-[var(--brand-light)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
                      {trophyIcon}
                      {ev.badge}
                    </span>
                    {ev.active ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {t("event.statusActive")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                        {t("event.statusInactive")}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="mt-2 text-base font-bold leading-snug text-[var(--foreground)] transition-colors line-clamp-2 group-hover:text-[var(--brand)]">
                    {ev.title}
                  </h3>

                  {/* Description */}
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)] line-clamp-2">{ev.description}</p>

                  {/* Meta */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[var(--muted)]">
                    <span className="inline-flex items-center gap-1">
                      {clockIcon}
                      {ev.duration}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      {peopleIcon}
                      {ev.participantCount} {t("rightSidebar.members")}
                    </span>
                  </div>

                  {ev.active && ev.endsAt && (
                    <p className="mt-1.5 text-xs">
                      <EventCountdown endsAt={ev.endsAt} />
                    </p>
                  )}

                  {/* Footer */}
                  <div className="mt-3 flex items-center justify-between border-t border-[var(--card-border)] pt-3">
                    <span className="inline-flex items-center gap-1 text-[11px] text-[var(--muted)]">
                      {calendarIcon}
                      {new Date(ev.createdAt).toLocaleDateString(lang === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--brand)] opacity-0 transition-opacity group-hover:opacity-100">
                      {t("event.viewDetail")}
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
