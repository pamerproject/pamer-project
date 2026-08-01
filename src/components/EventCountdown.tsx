"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/lang";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Sisa waktu sampai event berakhir. Kosong/null → tidak menampilkan apa pun. */
export default function EventCountdown({
  endsAt,
  className = "",
}: {
  endsAt: string | null;
  className?: string;
}) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!endsAt) return null;

  const diff = new Date(endsAt).getTime() - now;
  // Tanggal tidak valid / tanggal absurd → jangan render apa pun
  if (!Number.isFinite(diff)) return null;
  const ended = diff <= 0;

  let label: string;
  if (ended) {
    label = t("event.ended");
  } else {
    const days = Math.floor(diff / DAY_MS);
    const hours = Math.floor((diff % DAY_MS) / HOUR_MS);
    const minutes = Math.floor((diff % HOUR_MS) / MINUTE_MS);

    if (days >= 1) label = t("event.endsInDays", { n: days });
    else if (hours >= 1) label = t("event.endsInHours", { n: hours });
    else label = t("event.endsInMinutes", { n: Math.max(minutes, 1) });
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium ${
        ended ? "text-red-500" : "text-[var(--brand)]"
      } ${className}`}
      title={ended ? t("event.ended") : label}
    >
      <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {label}
    </span>
  );
}
