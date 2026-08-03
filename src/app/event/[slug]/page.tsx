"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/lib/lang";
import Breadcrumb from "@/components/Breadcrumb";
import Avatar from "@/components/ui/Avatar";
import renderContent from "@/lib/renderContent";
import EventCountdown from "@/components/EventCountdown";
import { translateApiError } from "@/lib/helpers";

interface Participant {
  name: string;
  username: string;
  avatar: string | null;
}

interface EventDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  image: string | null;
  badge: string;
  duration: string;
  endsAt: string | null;
  active: boolean;
  period: string;
  howTo: string[];
  requirements: string[];
  prizes: string[];
  participantCount: number;
  joined: boolean;
  participants: Participant[];
}

function DetailSection({
  icon,
  title,
  items,
}: {
  icon: ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <section>
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-[var(--foreground)]">
        {icon}
        {title}
      </h3>
      <ul className="mt-2.5 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-[var(--muted)]">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]" />
            {/* Link (mis. sponsor) otomatis jadi teks biru underline & bisa diklik langsung */}
            {renderContent(item, false)}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function EventDetailPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const params = useParams();
  const slug = (params?.slug as string) || "";

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [joined, setJoined] = useState(false);
  const [justJoined, setJustJoined] = useState(false);
  const [busy, setBusy] = useState(false);
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setNotFound(false);
    setEvent(null);

    fetch(`/api/events/${encodeURIComponent(slug)}`)
      .then(async (r) => {
        if (r.status === 404) {
          if (!ignore) setNotFound(true);
          return;
        }
        const data = r.ok ? await r.json() : null;
        if (!ignore && data?.event) {
          setEvent(data.event);
          setJoined(!!data.event.joined);
          setJustJoined(false);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [slug]);

  const currentUser = useMemo(() => {
    const u = session?.user as { name?: string | null; username?: string; image?: string | null } | undefined;
    return {
      name: u?.name || u?.username || t("event.you"),
      username: u?.username || "",
      avatar: u?.image || null,
    };
  }, [session, t]);

  const handleJoin = useCallback(async () => {
    if (!event || busy) return;
    // Event nonaktif: hanya boleh membatalkan ikut, bukan ikut baru
    if (!event.active && !event.joined) return;
    setBusy(true);
    setJoinError("");
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(event.slug)}/join`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setJoinError(translateApiError(data?.message || "auth.errorOccurred", t));
        return;
      }
      const data = await res.json();
      setJoined(data.joined);
      if (data.joined) setJustJoined(true);
      setEvent((prev) => (prev ? { ...prev, participantCount: data.participantCount } : prev));
      window.dispatchEvent(new CustomEvent("events-updated"));
    } catch {
      setJoinError(t("auth.errorOccurred"));
    } finally {
      setBusy(false);
    }
  }, [event, busy, t]);

  if (loading) {
    return (
      <div className="space-y-4 pb-12 md:pb-0">
        <div className="animate-pulse overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)]">
          <div className="h-48 w-full bg-gray-200 dark:bg-gray-700 sm:h-64 md:h-72" />
          <div className="space-y-3 p-4 md:p-5">
            <div className="h-6 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-full rounded bg-gray-100 dark:bg-gray-700" />
            <div className="h-4 w-5/6 rounded bg-gray-100 dark:bg-gray-700" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-light)]">
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
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-bold">{t("event.notFound")}</h2>
        <Link
          href="/"
          className="mt-4 rounded-lg bg-[var(--brand)] px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-[var(--brand-hover)]"
        >
          {t("error.backToHome")}
        </Link>
      </div>
    );
  }

  const title = event.title;
  const desc = event.description;
  const participantCount = event.participantCount;
  const shownParticipants = event.participants.slice(0, 20);
  const extraCount = participantCount - shownParticipants.length;

  return (
    <div className="space-y-4 pb-12 md:pb-0">
      {/* ── Mobile Back Button ── */}
      {/* Sticky: menggantikan posisi navbar saat navbar hide-on-scroll */}
      <div className="sticky top-0 z-[65] flex h-14 items-center gap-3 border-b border-[var(--card-border)] bg-[var(--card)] px-4 md:hidden">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] transition-all hover:text-[var(--brand)]"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          {t("nav.back")}
        </button>
        <span className="truncate text-xs text-[var(--muted)]">{title}</span>
      </div>

      {/* ── Breadcrumb (desktop) ── */}
      <div className="hidden md:block">
        <Breadcrumb
          segments={[
            { label: t("sidebar.home"), href: "/" },
            { label: t("rightSidebar.events"), href: "/" },
            { label: title },
          ]}
        />
      </div>

      {/* ── Event Card ── */}
      <article className="card-app overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)]">
        {/* Cover image */}
        <div className="relative h-48 w-full overflow-hidden sm:h-64 md:h-72">
          {event.image ? (
            <img src={event.image} alt={title} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--brand)]/20 to-[var(--brand)]/5">
              <svg className="h-16 w-16 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zM6.75 6.75h10.5" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          {/* Badges over image */}
          <div className="absolute bottom-3 left-4 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--brand)] backdrop-blur">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
              </svg>
              {event.badge}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-[10px] font-bold text-emerald-700 backdrop-blur">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {event.duration}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 md:p-5">
          <h1 className="text-xl font-black leading-tight tracking-tight md:text-2xl">{title}</h1>
          <div className="mt-3 text-sm leading-relaxed text-[var(--muted)] whitespace-pre-wrap break-words">
            {/* Link (mis. sponsor) otomatis jadi teks biru underline & bisa diklik langsung */}
            {renderContent(desc, false)}
          </div>
        </div>
      </article>

      {/* ── Detail Event ── */}
      <div className="card-app space-y-5 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 md:p-5">
        <h2 className="flex items-center gap-1.5 text-base font-black tracking-tight text-[var(--foreground)]">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          {t("event.detailTitle")}
        </h2>

        <DetailSection
          icon={
            <svg className="h-4 w-4 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          title={t("event.howTo")}
          items={event.howTo}
        />
        <DetailSection
          icon={
            <svg className="h-4 w-4 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.035A9 9 0 1111.94 12A9 9 0 0012 2.715z" />
            </svg>
          }
          title={t("event.requirements")}
          items={event.requirements}
        />
        <DetailSection
          icon={
            <svg className="h-4 w-4 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
            </svg>
          }
          title={t("event.prizes")}
          items={event.prizes}
        />
        <section>
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-[var(--foreground)]">
            <svg className="h-4 w-4 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t("event.period")}
          </h3>
          <p className="mt-2.5 text-sm leading-relaxed text-[var(--muted)]">{event.period}</p>
        </section>
      </div>

      {/* ── Participants ── */}
      <div className="card-app rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 md:p-5">
        <h2 className="flex items-center gap-1.5 text-base font-black tracking-tight text-[var(--foreground)]">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          {t("event.participants")}
          <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-[var(--brand-light)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
            {participantCount} {t("rightSidebar.members")}
          </span>
        </h2>

        {joined && (
          <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-emerald-50 px-3 py-2.5 dark:bg-emerald-500/10">
            <Avatar src={currentUser.avatar} name={currentUser.name} size="sm" />
            <p className="min-w-0 flex-1 truncate text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <span className="font-bold">{currentUser.name}</span> {t("event.followingMsg")}
            </p>
          </div>
        )}

        <ul className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2">
          {shownParticipants.map((p) => (
            <li
              key={p.username}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--brand-light)]"
            >
              <Avatar src={p.avatar} name={p.name} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--foreground)]">{p.name}</p>
                <p className="truncate text-xs text-[var(--muted)]">@{p.username}</p>
              </div>
            </li>
          ))}
        </ul>

        {extraCount > 0 && (
          <p className="mt-3 border-t border-[var(--card-border)] pt-3 text-center text-xs font-medium text-[var(--muted)]">
            +{extraCount} {t("event.othersFollowing")}
          </p>
        )}
      </div>

      {/* ── Join CTA ── */}
      <div className="card-app rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[var(--foreground)]">{title}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--muted)]">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {event.duration}
            </p>
            <p className="mt-1 text-xs">
              <EventCountdown endsAt={event.endsAt} />
            </p>
          </div>
          {!event.active && !joined ? (
            <button
              disabled
              title={t("event.notActive")}
              className="w-full cursor-not-allowed rounded-lg bg-gray-200 px-6 py-2.5 text-sm font-bold text-gray-500 dark:bg-gray-700/60 dark:text-gray-400 sm:w-auto"
            >
              {t("event.notActive")}
            </button>
          ) : joined ? (
            <button
              onClick={handleJoin}
              disabled={busy}
              className="w-full rounded-lg border border-[var(--brand)] px-6 py-2.5 text-sm font-bold text-[var(--brand)] transition-all hover:bg-[var(--brand-light)] disabled:opacity-50 sm:w-auto"
            >
              {t("event.leaveEvent")}
            </button>
          ) : (
            <button
              onClick={handleJoin}
              disabled={busy}
              className="w-full rounded-lg bg-[var(--brand)] px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-[var(--brand-hover)] disabled:opacity-50 sm:w-auto"
            >
              {t("event.joinEvent")}
            </button>
          )}
        </div>

        {joinError && (
          <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 dark:bg-red-950/30 dark:text-red-400">
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {joinError}
          </p>
        )}

        {justJoined && joined && (
          <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="truncate">
              <span className="font-bold">{currentUser.name}</span> {t("event.followingMsg")}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
