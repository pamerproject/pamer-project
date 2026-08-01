"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/lang";

interface JobCardJob {
  id: string;
  slug: string | null;
  title: string;
  company: string;
  location: string | null;
  type: string | null;
  salary: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  description: string | null;
  tags: string[];
  image: string | null;
  postedAt: string;
  user: {
    name: string | null;
    username: string;
    avatar: string | null;
  };
}

function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

function formatSalary(job: JobCardJob): string | null {
  if (job.salary) return job.salary;
  if (job.salaryMin || job.salaryMax) {
    const sym = job.currency === "IDR" ? "Rp" : "$";
    if (job.salaryMin && job.salaryMax) {
      const fmt = (n: number) => job.currency === "IDR" ? n.toLocaleString("id-ID") : n.toLocaleString();
      return `${sym}${fmt(job.salaryMin)} - ${sym}${fmt(job.salaryMax)}`;
    }
    if (job.salaryMin) return `${sym}${job.salaryMin.toLocaleString()}+`;
    if (job.salaryMax) return `Up to ${sym}${job.salaryMax.toLocaleString()}`;
  }
  return null;
}

function timeAgo(dateStr: string, t: (key: string, params?: Record<string, string | number>) => string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return t("timeAgo.justNow");
  if (diff < 3600) return t("timeAgo.minutes", { n: Math.floor(diff / 60) });
  if (diff < 86400) return t("timeAgo.hours", { n: Math.floor(diff / 3600) });
  if (diff < 2592000) return t("timeAgo.days", { n: Math.floor(diff / 86400) });
  return t("timeAgo.months", { n: Math.floor(diff / 2592000) });
}

export default function JobCard({ job, children }: { job: JobCardJob; children?: React.ReactNode }) {
  const { t } = useTranslation();
  const budget = formatSalary(job);

  return (
    <div className="group overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)] transition-all hover:border-[var(--brand)] hover:shadow-md">
      <Link href={`/freelance/${job.slug || job.id}`} className="block">
        {job.image && (
          <div className="aspect-video w-full overflow-hidden">
            <img
              src={job.image}
              alt={job.title}
              className="h-full w-full object-cover transition-all duration-300 group-hover:scale-105"
            />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            {job.type && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-light)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
                {job.type}
              </span>
            )}
            {budget && (
              <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                {budget}
              </span>
            )}
          </div>

          <h3 className="mt-2 text-sm font-bold leading-snug text-[var(--foreground)] group-hover:text-[var(--brand)] transition-colors line-clamp-2">
            {job.title}
          </h3>

          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {job.company}{job.location ? ` · ${job.location}` : ""}
          </p>

          {job.description && (
            <p className="mt-2 text-xs leading-relaxed text-[var(--foreground)] line-clamp-2">
              {stripHtml(job.description)}
            </p>
          )}

          {job.tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {job.tags.slice(0, 4).map((skill) => (
                <span key={skill} className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">{skill}</span>
              ))}
              {job.tags.length > 4 && <span className="rounded-md px-2 py-0.5 text-[10px] text-[var(--muted)]">+{job.tags.length - 4}</span>}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-[var(--card-border)] pt-3 text-[11px] text-[var(--muted)]">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {timeAgo(job.postedAt, t)}
              </span>
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                {job.user.name || job.user.username}
              </span>
            </div>
            <svg className="h-4 w-4 transition-all group-hover:text-[var(--brand)] group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </div>
        </div>
      </Link>

      {children && (
        <div className="border-t border-[var(--card-border)] px-4 py-3">
          {children}
        </div>
      )}
    </div>
  );
}