"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/lib/lang";
import JobCard from "./JobCard";
import PostJobModal from "./PostJobModal";
import ConfirmDeleteModal from "./ConfirmDeleteModal";

interface MyJob {
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
  contactEmail: string | null;
  url: string | null;
  postedAt: string;
  user: {
    id: string;
    name: string | null;
    username: string;
    avatar: string | null;
  };
}

export default function MyJobsList() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [jobs, setJobs] = useState<MyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<MyJob | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editTarget, setEditTarget] = useState<MyJob | null>(null);

  const userId = session?.user?.id;

  const fetchMyJobs = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs?userId=${userId}&limit=50`);
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) fetchMyJobs();
  }, [userId, fetchMyJobs]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/jobs/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } catch {
      // silent
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-4 space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="card-app animate-pulse rounded-xl border border-[var(--card-border)] p-4">
            <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-2 h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="mt-4 text-center py-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-light)]">
          <svg className="h-6 w-6 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="mt-3 text-sm text-[var(--muted)]">{t("freelance.noMyJobs")}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditTarget(job)}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-all hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              {t("freelance.editJob")}
            </button>
            <button
              onClick={() => setDeleteTarget(job)}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 transition-all hover:bg-red-50"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              {t("freelance.deleteJob")}
            </button>
          </div>
        </JobCard>
      ))}

      {editTarget && (
        <PostJobModal
          editJob={{
            id: editTarget.id,
            title: editTarget.title,
            company: editTarget.company,
            description: editTarget.description,
            location: editTarget.location,
            type: editTarget.type,
            salary: editTarget.salary,
            salaryMin: editTarget.salaryMin,
            salaryMax: editTarget.salaryMax,
            currency: editTarget.currency,
            tags: editTarget.tags,
            contactEmail: editTarget.contactEmail,
            url: editTarget.url,
            image: editTarget.image,
          }}
          onClose={() => setEditTarget(null)}
          onSuccess={() => {
            setEditTarget(null);
            fetchMyJobs();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          title={deleteTarget.title}
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => { if (!deleting) setDeleteTarget(null); }}
        />
      )}
    </div>
  );
}