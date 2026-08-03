"use client";

import { useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/lib/lang";
import { translateApiError } from "@/lib/helpers";
import ErrorAlert from "@/components/ui/ErrorAlert";

interface JobFormData {
  title: string;
  company: string;
  description: string;
  location: string;
  type: string;
  salary: string;
  salaryMin: string;
  salaryMax: string;
  currency: string;
  tags: string;
  contactEmail: string;
  url: string;
}

interface EditJobData {
  id: string;
  title: string;
  company: string;
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
}

interface PostJobModalProps {
  onClose: () => void;
  onSuccess: () => void;
  editJob?: EditJobData;
}

export default function PostJobModal({ onClose, onSuccess, editJob }: PostJobModalProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [form, setForm] = useState<JobFormData>({
    title: editJob?.title || "",
    company: editJob?.company || "",
    description: editJob?.description || "",
    location: editJob?.location || "",
    type: editJob?.type || "Full-time",
    salary: editJob?.salary || "",
    salaryMin: editJob?.salaryMin != null ? String(editJob.salaryMin) : "",
    salaryMax: editJob?.salaryMax != null ? String(editJob.salaryMax) : "",
    currency: editJob?.currency || "IDR",
    tags: editJob?.tags?.join(", ") || "",
    contactEmail: editJob?.contactEmail || "",
    url: editJob?.url || "",
  });
  const [image, setImage] = useState<{ url: string; uploading: boolean; file: File } | null>(
    editJob?.image ? { url: editJob.image, uploading: false, file: new File([], "") } : null
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateField = (field: keyof JobFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const CURRENCY_SYMBOLS: Record<string, string> = {
    IDR: "Rp",
    USD: "$",
    SGD: "S$",
    MYR: "RM",
  };
  const currencySymbol = CURRENCY_SYMBOLS[form.currency] || form.currency;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImage({ url: URL.createObjectURL(file), uploading: true, file });

    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error(t("settings.uploadFailed"));
      const data = await res.json();
      setImage({ url: data.preview, uploading: false, file });
    } catch {
      setImage(null);
      setError(t("settings.uploadCompressing"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError(t("freelance.jobTitle"));
      return;
    }
    if (!form.company.trim()) {
      setError(t("freelance.company"));
      return;
    }

    setSubmitting(true);
    try {
      const tags = form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const body = {
        title: form.title,
        company: form.company,
        description: form.description,
        location: form.location,
        type: form.type,
        salary: form.salary || null,
        salaryMin: form.salaryMin || null,
        salaryMax: form.salaryMax || null,
        currency: form.currency,
        tags,
        contactEmail: form.contactEmail || null,
        url: form.url || null,
        image: image?.url || null,
      };

      const url = editJob ? `/api/jobs/${editJob.id}` : "/api/jobs";
      const method = editJob ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(translateApiError(data.message, t) || t("freelance.noJobs"));
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.errorOccurred"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!session) {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-2xl animate-fade-in text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-light)]">
            <svg className="h-6 w-6 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-[var(--foreground)]">{t("auth.loginTitle")}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">{t("freelance.loginToPost")}</p>
          <button onClick={onClose} className="mt-5 rounded-xl bg-[var(--brand)] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[var(--brand-hover)]">
            {t("nav.close")}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      {/* Full-screen di mobile, card centered di desktop */}
      <div className="fixed inset-0 z-50 flex flex-col bg-[var(--card)] md:inset-auto md:left-1/2 md:top-1/2 md:h-auto md:max-h-[90vh] md:w-[90vw] md:max-w-2xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:border-[var(--card-border)] md:shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-[var(--card-border)] bg-[var(--card)] px-5 py-4">
          <h2 className="text-lg font-bold text-[var(--foreground)]">{editJob ? t("freelance.editJob") : t("freelance.postJob")}</h2>
          <button
            onClick={onClose}
            aria-label={t("nav.close")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] transition-all hover:bg-red-50 hover:text-red-500 active:scale-95"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-5 pb-12 md:pb-10">
          {error && <ErrorAlert message={error} />}

          {/* Row: Title + Company */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                {t("freelance.jobTitle")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder={t("freelance.jobTitlePlaceholder")}
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3.5 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-light)] transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                {t("freelance.company")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => updateField("company", e.target.value)}
                placeholder={t("freelance.companyPlaceholder")}
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3.5 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-light)] transition-all"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
              {t("freelance.description")}
            </label>
            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder={t("freelance.descriptionPlaceholder")}
              rows={4}
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3.5 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-light)] transition-all resize-none"
            />
          </div>

          {/* Row: Location + Type */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                {t("freelance.location")}
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => updateField("location", e.target.value)}
                placeholder={t("freelance.locationPlaceholder")}
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3.5 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-light)] transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                {t("freelance.jobType")}
              </label>
              <select
                value={form.type}
                onChange={(e) => updateField("type", e.target.value)}
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3.5 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-light)] transition-all"
              >
                <option value="Full-time">{t("freelance.fullTime")}</option>
                <option value="Part-time">{t("freelance.partTime")}</option>
                <option value="Contract">{t("freelance.contract")}</option>
                <option value="Freelance">{t("freelance.freelance")}</option>
                <option value="Internship">{t("freelance.internship")}</option>
                <option value="Remote">{t("freelance.remote")}</option>
              </select>
            </div>
          </div>

          {/* Salary */}
          <div>
            <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
              {t("freelance.salaryRange")}
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="relative">
                <input
                  type="number"
                  value={form.salaryMin}
                  onChange={(e) => updateField("salaryMin", e.target.value)}
                  placeholder={t("freelance.salaryMin")}
                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3.5 py-2.5 pl-10 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-light)] transition-all"
                />
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--muted)]">{currencySymbol}</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={form.salaryMax}
                  onChange={(e) => updateField("salaryMax", e.target.value)}
                  placeholder={t("freelance.salaryMax")}
                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3.5 py-2.5 pl-10 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-light)] transition-all"
                />
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--muted)]">{currencySymbol}</span>
              </div>
              <select
                value={form.currency}
                onChange={(e) => updateField("currency", e.target.value)}
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3.5 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-light)] transition-all"
              >
                <option value="USD">USD ($)</option>
                <option value="IDR">IDR (Rp)</option>
                <option value="SGD">SGD (S$)</option>
                <option value="MYR">MYR (RM)</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
              {t("freelance.tags")}
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => updateField("tags", e.target.value)}
              placeholder={t("freelance.tagsPlaceholder")}
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3.5 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-light)] transition-all"
            />
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
              {t("createPost.photo")}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="hidden"
              onChange={handleImageUpload}
            />
            {image ? (
              <div className="relative mt-1 inline-block">
                <img
                  src={image.url}
                  alt={t("settings.thumbnailAlt")}
                  className="h-24 w-40 rounded-xl border border-[var(--card-border)] object-cover"
                />
                {image.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40">
                    <svg className="h-6 w-6 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                )}
                {!image.uploading && (
                  <button
                    onClick={() => { setImage(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 flex items-center gap-2 rounded-xl border border-dashed border-[var(--card-border)] px-4 py-3 text-sm text-[var(--muted)] transition-all hover:border-[var(--brand)] hover:text-[var(--brand)]"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                {t("settings.addLink")}
              </button>
            )}
          </div>

          {/* Row: Contact + URL */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                {t("freelance.contactEmail")}
              </label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => updateField("contactEmail", e.target.value)}
                placeholder={t("freelance.contactEmailPlaceholder")}
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3.5 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-light)] transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                {t("freelance.applicationUrl")}
              </label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => updateField("url", e.target.value)}
                placeholder={t("freelance.applicationUrlPlaceholder")}
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3.5 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-light)] transition-all"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[var(--brand)] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[var(--brand-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {editJob ? t("settings.saving") : t("freelance.posting")}
              </>
            ) : (
              editJob ? t("settings.saveLink") : t("freelance.post")
            )}
          </button>
        </form>
      </div>
    </>
  );
}
