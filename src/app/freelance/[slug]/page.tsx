"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import PageSkeleton from "@/components/PageSkeleton";
import Breadcrumb from "@/components/Breadcrumb";
import { useTranslation } from "@/lib/lang";

interface JobDetail {
  id: string;
  title: string;
  company: string;
  slug: string | null;
  description: string | null;
  location: string | null;
  type: string | null;
  salary: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  tags: string[];
  contactEmail: string | null;
  url: string | null;
  image: string | null;
  status: string;
  user: {
    id: string;
    username: string;
    name: string | null;
    avatar: string | null;
  };
  postedAt: string;
}

function timeAgo(dateStr: string, t: (key: string, params?: Record<string, string | number>) => string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return t("timeAgo.justNow");
  if (diff < 3600) return t("timeAgo.minutes", { n: Math.floor(diff / 60) });
  if (diff < 86400) return t("timeAgo.hours", { n: Math.floor(diff / 3600) });
  if (diff < 2592000) return t("timeAgo.days", { n: Math.floor(diff / 86400) });
  return t("timeAgo.months", { n: Math.floor(diff / 2592000) });
}

function formatSalary(job: JobDetail): string | null {
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

export default function FreelanceDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const slug = params.slug as string;
  const searchParams = useSearchParams();

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/jobs/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error(t("error.notFound"));
        return res.json();
      })
      .then((data) => {
        setJob(data.job);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug, t]);

  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(() => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: job?.title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  }, [job?.title]);

  if (loading) return <PageSkeleton />;

  if (error || !job) {
    return (
      <div className="mx-auto mt-20 max-w-lg text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <svg className="h-8 w-8 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-lg font-medium">{error || t("error.notFound")}</p>
        <Link href="/freelance" className="mt-4 inline-block text-sm text-[var(--brand)] hover:underline">
          {t("sidebar.freelance")}
        </Link>
      </div>
    );
  }

  const budget = formatSalary(job);

  return (
    <div>
      <Breadcrumb segments={[
        searchParams.get("ref")?.startsWith("u/") ? { label: t("mobileNav.profile"), href: `/${searchParams.get("ref")}` } : { label: t("sidebar.home"), href: "/" },
        { label: t("sidebar.freelance"), href: "/freelance" },
        { label: job.title }
      ]} />

      <article className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)]">
        {job.image && (
          <div className="aspect-video w-full overflow-hidden">
            <img
              src={job.image}
              alt={job.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-extrabold leading-tight">{job.title}</h1>
              <p className="mt-0.5 text-sm text-[var(--muted)]">
                {job.company}{job.location ? ` · ${job.location}` : ""}
              </p>
            </div>
            {job.type && (
              <span className="shrink-0 rounded-full bg-[var(--brand-light)] px-3 py-1 text-xs font-bold text-[var(--brand)]">
                {job.type}
              </span>
            )}
          </div>

          {budget && (
            <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {budget}
            </div>
          )}

          {job.description && (
            <div className="mt-4 text-sm leading-relaxed text-[var(--foreground)] whitespace-pre-wrap">
              {job.description}
            </div>
          )}

          {job.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {job.tags.map((skill) => (
                <span key={skill} className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {skill}
                </span>
              ))}
            </div>
          )}

          <div className="mt-5 flex items-center gap-3 border-t border-[var(--card-border)] pt-4 text-xs text-[var(--muted)]">
            <div className="flex items-center gap-2">
              {job.user.avatar ? (
                <img src={job.user.avatar} alt="" className="h-6 w-6 rounded-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand)] text-[10px] font-bold text-white">
                  {(job.user.name || job.user.username).charAt(0).toUpperCase()}
                </div>
              )}
              <Link href={`/u/${job.user.username}`} className="font-medium text-[var(--foreground)] hover:text-[var(--brand)]">
                {job.user.name || job.user.username}
              </Link>
            </div>
            <span>{timeAgo(job.postedAt, t)}</span>
          </div>

          {(job.contactEmail || job.url) && (
            <div className="mt-5 space-y-2">
              <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">{t("freelance.apply")} via</p>
              {job.contactEmail && (
                <a
                  href={`mailto:${job.contactEmail}?subject=Lamaran%20${encodeURIComponent(job.title)}`}
                  className="flex items-center gap-2 rounded-xl border border-[var(--card-border)] px-4 py-3 text-sm font-medium transition-all hover:bg-[var(--brand-light)] hover:text-[var(--brand)]"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  {job.contactEmail}
                </a>
              )}
              {job.url && (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-[var(--card-border)] px-4 py-3 text-sm font-medium transition-all hover:bg-[var(--brand-light)] hover:text-[var(--brand)]"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  {t("freelance.apply")}
                </a>
              )}
            </div>
          )}

          <div className="mt-5 border-t border-[var(--card-border)] pt-4">
            <button
              onClick={handleShare}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] px-4 py-3 text-sm font-medium transition-all hover:bg-[var(--brand-light)] hover:text-[var(--brand)]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
              {copied ? t("nav.copied") : t("nav.share")}
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}