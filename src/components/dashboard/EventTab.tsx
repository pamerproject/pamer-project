"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "@/lib/lang";
import Avatar from "../ui/Avatar";
import Link from "next/link";
import ConfirmDialog from "../ui/ConfirmDialog";
import CreateEventModal, { type CreateEventData } from "./CreateEventModal";
import AdsCard from "../AdsCard";
import { translateApiError } from "@/lib/helpers";

interface DashboardEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  image: string | null;
  badge: string;
  duration: string;
  active: boolean;
  participantCount: number;
  createdAt: string;
}

export interface PinSearchItem {
  id: string;
  type: "project" | "cerita";
  title?: string;
  slug?: string | null;
  image?: string | null;
  description?: string | null;
  tags?: string[];
  content?: string;
  user?: { name: string | null; username: string; avatar: string | null };
}

function TypeBadge({ type }: { type: "project" | "cerita" }) {
  const { t } = useTranslation();
  return (
    <span className="shrink-0 rounded-md bg-[var(--brand-light)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
      {type === "project" ? t("feed.projectBadge") : t("dashboard.stories")}
    </span>
  );
}

function ItemPreview({ item }: { item: PinSearchItem }) {
  if (item.type === "project") {
    return (
      <div className="overflow-hidden rounded-lg border border-[var(--card-border)]">
        {item.image && (
          <img src={item.image} alt={item.title || ""} className="h-28 w-full object-cover" />
        )}
        <div className="p-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-[var(--foreground)] line-clamp-1">{item.title}</p>
            <TypeBadge type={item.type} />
          </div>
          {item.description && (
            <p className="mt-0.5 text-xs text-[var(--muted)] line-clamp-2">{item.description}</p>
          )}
          <p className="mt-1 text-[10px] text-[var(--muted)]">@{item.user?.username}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-[var(--card-border)] p-2.5">
      <div className="flex items-center gap-2">
        <Avatar src={item.user?.avatar} name={item.user?.name || "User"} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[var(--foreground)]">{item.user?.name || item.user?.username}</p>
          <p className="truncate text-xs text-[var(--muted)]">@{item.user?.username}</p>
        </div>
        <TypeBadge type={item.type} />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[var(--muted)] line-clamp-3 whitespace-pre-wrap break-words">
        {item.content}
      </p>
    </div>
  );
}

interface PinnedCardProps {
  type: "project" | "cerita";
  titleLabel: string;
  unpinLabel: string;
  pinned: PinSearchItem | null;
  busy: boolean;
  onUnpin: (type: "project" | "cerita") => void;
}

function PinnedCard({ type, titleLabel, unpinLabel, pinned, busy, onUnpin }: PinnedCardProps) {
  const { t } = useTranslation();
  return (
    <div className="card-app rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-light)]">
          <svg className="h-4 w-4 text-[var(--brand)]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 6l2.29 2.29-9.88 9.88-4-4L6 13.17 8.41 10.59 11 13.17 16 6m0-4l-6 7-4-4-4 4 6 7 8-11z" />
          </svg>
        </div>
        <h3 className="text-sm font-bold text-[var(--foreground)]">{titleLabel}</h3>
        {pinned && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-[var(--brand-light)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t("dashboard.currentlyPinned")}
          </span>
        )}
      </div>

      {pinned ? (
        <>
          <div className="mt-3">
            <ItemPreview item={pinned} />
          </div>
          <button
            onClick={() => onUnpin(type)}
            disabled={busy}
            className="mt-2 w-full rounded-lg border border-[var(--brand)] py-2 text-xs font-bold text-[var(--brand)] transition-all hover:bg-[var(--brand-light)] disabled:opacity-50"
          >
            {unpinLabel}
          </button>
        </>
      ) : (
        <p className="mt-3 text-xs text-[var(--muted)]">{t("dashboard.selectToPin")}</p>
      )}
    </div>
  );
}

export default function EventTab() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PinSearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<PinSearchItem | null>(null);
  const [error, setError] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pinnedProject, setPinnedProject] = useState<PinSearchItem | null>(null);
  const [pinnedStory, setPinnedStory] = useState<PinSearchItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<CreateEventData | null>(null);
  const [editLoadingSlug, setEditLoadingSlug] = useState<string | null>(null);
  const [editError, setEditError] = useState("");
  const [deletingEvent, setDeletingEvent] = useState<DashboardEvent | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch("/api/admin/pin")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (ignore) return;
        setPinnedProject(d?.project || null);
        setPinnedStory(d?.post || null);
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/pin/search?q=${encodeURIComponent(q)}`);
        const data = res.ok ? await res.json() : null;
        setResults(data?.items || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    []
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setShowResults(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  const handleSelect = (item: PinSearchItem) => {
    setSelected(item);
    setQuery("");
    setResults([]);
    setShowResults(false);
    setError("");
  };

  const handlePin = async () => {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const apiType = selected.type === "project" ? "project" : "post";
      const res = await fetch("/api/admin/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, type: apiType }),
      });
      if (res.ok) {
        if (selected.type === "project") setPinnedProject(selected);
        else setPinnedStory(selected);
        setSelected(null);
      } else {
        setError(t("dashboard.pinError"));
      }
    } catch {
      setError(t("dashboard.pinError"));
    } finally {
      setBusy(false);
    }
  };

  // Muat daftar event untuk panel kelola
  const loadEvents = useCallback(() => {
    fetch("/api/events")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.events) setEvents(data.events);
      })
      .catch(() => {})
      .finally(() => setEventsLoading(false));
  }, []);

  useEffect(() => {
    loadEvents();
    window.addEventListener("events-updated", loadEvents);
    return () => window.removeEventListener("events-updated", loadEvents);
  }, [loadEvents]);

  // Buka modal edit — ambil detail lengkap event dulu (period, howTo, dll)
  const handleEditEvent = async (ev: DashboardEvent) => {
    setEditLoadingSlug(ev.slug);
    setEditError("");
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(ev.slug)}`);
      const data = res.ok ? await res.json() : null;
      if (data?.event) {
        setEditingEvent(data.event);
      } else {
        setEditError(t("event.editLoadFailed"));
      }
    } catch {
      setEditError(t("event.editLoadFailed"));
    } finally {
      setEditLoadingSlug(null);
    }
  };

  // Hapus via modal konfirmasi (bukan window.confirm/alert)
  const confirmDeleteEvent = async () => {
    if (!deletingEvent || deleteLoading) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(deletingEvent.slug)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(translateApiError(data?.message, t) || t("event.deleteEventFailed"));
      }
      window.dispatchEvent(new CustomEvent("events-updated"));
      loadEvents();
      setDeletingEvent(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : t("event.deleteEventFailed"));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleUnpin = async (type: "project" | "cerita") => {
    setBusy(true);
    setError("");
    try {
      const apiType = type === "project" ? "project" : "post";
      const res = await fetch(`/api/admin/pin?type=${apiType}`, { method: "DELETE" });
      if (res.ok) {
        if (type === "project") setPinnedProject(null);
        else setPinnedStory(null);
      } else {
        setError(t("dashboard.pinError"));
      }
    } catch {
      setError(t("dashboard.pinError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-[var(--foreground)]">{t("dashboard.eventTitle")}</h3>
        <p className="mt-0.5 text-xs text-[var(--muted)]">{t("dashboard.eventDesc")}</p>
      </div>

      {/* Satu kolom pencarian untuk project & cerita sekaligus */}
      <div className="relative">
        <input
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder={t("dashboard.searchPlaceholder")}
          onFocus={() => setShowResults(true)}
          className="w-full rounded-lg border border-[var(--card-border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--brand)] dark:bg-[var(--card)]"
        />
        {showResults && query.trim() && (
          <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-[var(--card-border)] bg-[var(--card)] shadow-lg">
            {searching ? (
              <div className="px-3 py-2.5 text-xs text-[var(--muted)]">{t("dashboard.searching")}</div>
            ) : results.length === 0 ? (
              <div className="px-3 py-2.5 text-xs text-[var(--muted)]">{t("dashboard.searchNoResults")}</div>
            ) : (
              results.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => handleSelect(r)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[var(--brand-light)]"
                >
                  {r.type === "project" ? (
                    <>
                      {r.image ? (
                        <img src={r.image} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-light)] text-[var(--brand)]">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25z" />
                          </svg>
                        </div>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-[var(--foreground)]">{r.title}</span>
                        <span className="block truncate text-xs text-[var(--muted)]">@{r.user?.username}</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <Avatar src={r.user?.avatar} name={r.user?.name || "User"} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-[var(--foreground)]">{r.content}</span>
                        <span className="block truncate text-xs text-[var(--muted)]">@{r.user?.username}</span>
                      </span>
                    </>
                  )}
                  <TypeBadge type={r.type} />
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {selected && (
        <div>
          <ItemPreview item={selected} />
          <button
            onClick={handlePin}
            disabled={busy}
            className="mt-2 w-full rounded-lg bg-[var(--brand)] py-2 text-xs font-bold text-white transition-all hover:bg-[var(--brand-hover)] disabled:opacity-50"
          >
            {selected.type === "project" ? t("dashboard.pinThisProject") : t("dashboard.pinThisStory")}
          </button>
        </div>
      )}

      {error && <p className="text-xs font-medium text-red-500">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
              <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-3 h-24 w-full rounded-lg bg-gray-100 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      ) : pinnedProject || pinnedStory ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PinnedCard
            type="project"
            titleLabel={t("dashboard.pinProjectCard")}
            unpinLabel={t("dashboard.unpinThisProject")}
            pinned={pinnedProject}
            busy={busy}
            onUnpin={handleUnpin}
          />
          <PinnedCard
            type="cerita"
            titleLabel={t("dashboard.pinStoryCard")}
            unpinLabel={t("dashboard.unpinThisStory")}
            pinned={pinnedStory}
            busy={busy}
            onUnpin={handleUnpin}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--card)] p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-light)]">
            <svg className="h-6 w-6 text-[var(--brand)]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 6l2.29 2.29-9.88 9.88-4-4L6 13.17 8.41 10.59 11 13.17 16 6m0-4l-6 7-4-4-4 4 6 7 8-11z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-[var(--foreground)]">{t("dashboard.noPin")}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{t("dashboard.noPinDesc")}</p>
        </div>
      )}

      {/* ── Divider + Kelola Event ── */}
      <div className="flex items-center gap-3 pt-2">
        <span className="h-px flex-1 bg-[var(--card-border)]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
          {t("event.sectionLabel")}
        </span>
        <span className="h-px flex-1 bg-[var(--card-border)]" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[var(--foreground)]">{t("event.manageTitle")}</h3>
          <p className="mt-0.5 text-xs text-[var(--muted)]">{t("event.manageDesc")}</p>
        </div>
        <button
          onClick={() => {
            setEditError("");
            setShowCreateEvent(true);
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--brand)] px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-[var(--brand-hover)]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {t("event.createEventBtn")}
        </button>
      </div>

      {editError && (
        <p className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {editError}
        </p>
      )}

      {eventsLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 rounded-lg bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-2.5 w-1/2 rounded bg-gray-100 dark:bg-gray-700" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--card)] p-8 text-center">
          <p className="text-sm font-bold text-[var(--foreground)]">{t("event.noEvents")}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{t("event.noEventsDesc")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {events.map((ev) => (
            <article
              key={ev.id}
              className="group overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)] transition-all hover:border-[var(--brand)] hover:shadow-md"
            >
              {/* Cover image */}
              {ev.image ? (
                <img src={ev.image} alt={ev.title} className="h-28 w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-28 w-full items-center justify-center bg-gradient-to-br from-[var(--brand)]/20 to-[var(--brand)]/5">
                  <svg className="h-10 w-10 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zM6.75 6.75h10.5" />
                  </svg>
                </div>
              )}

              {/* Body */}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--foreground)]">{ev.title}</p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        ev.active
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-700/60 dark:text-gray-400"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${ev.active ? "bg-emerald-500" : "bg-gray-400"}`} />
                      {ev.active ? t("event.statusActive") : t("event.statusInactive")}
                    </span>
                    <span className="rounded-md bg-[var(--brand-light)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
                      {ev.badge}
                    </span>
                  </div>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--muted)]">{ev.description}</p>
                <p className="mt-1.5 text-[10px] text-[var(--muted)]">
                  {ev.duration} · {ev.participantCount} {t("rightSidebar.members")}
                </p>

                {/* Actions */}
                <div className="mt-3 flex items-center gap-1.5 border-t border-[var(--card-border)] pt-2.5">
                  <Link
                    href={`/event/${ev.slug}`}
                    target="_blank"
                    title={t("event.viewEvent")}
                    aria-label={t("event.viewEvent")}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--card-border)] text-[var(--muted)] transition-all hover:border-[var(--brand)] hover:text-[var(--brand)]"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </Link>
                  <button
                    onClick={() => handleEditEvent(ev)}
                    disabled={editLoadingSlug === ev.slug}
                    title={t("event.editEvent")}
                    aria-label={t("event.editEvent")}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--card-border)] text-[var(--muted)] transition-all hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:opacity-50"
                  >
                    {editLoadingSlug === ev.slug ? (
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setDeleteError("");
                      setDeletingEvent(ev);
                    }}
                    title={t("event.deleteEvent")}
                    aria-label={t("event.deleteEvent")}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--card-border)] text-[var(--muted)] transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deletingEvent}
        onClose={() => {
          if (!deleteLoading) setDeletingEvent(null);
        }}
        title={t("event.confirmDeleteTitle")}
        variant="danger"
        confirmText={t("confirmDialog.delete")}
        cancelText={t("confirmDialog.cancel")}
        loading={deleteLoading}
        onConfirm={confirmDeleteEvent}
        message={
          <div className="text-center">
            <p className="text-sm text-[var(--muted)]">{t("event.confirmDeleteEvent")}</p>
            <p className="mt-1 truncate text-sm font-bold text-[var(--foreground)]">{deletingEvent?.title}</p>
            {deleteError && (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-red-500">
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {deleteError}
              </p>
            )}
          </div>
        }
      />

      <CreateEventModal
        isOpen={showCreateEvent || !!editingEvent}
        event={editingEvent}
        onClose={() => {
          setShowCreateEvent(false);
          setEditingEvent(null);
        }}
        onSuccess={loadEvents}
      />

      {/* ── Divider + Iklan ── */}
      <div className="flex items-center gap-3 pt-2">
        <span className="h-px flex-1 bg-[var(--card-border)]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
          {t("ads.sponsored")}
        </span>
        <span className="h-px flex-1 bg-[var(--card-border)]" />
      </div>

      <AdsCard />
    </div>
  );
}
