"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslation } from "@/lib/lang";
import { translateApiError } from "@/lib/helpers";

const MAX_FILE_SIZE = 512 * 1024;

interface ImageFieldProps {
  label: string;
  hint: string;
  placeholder: string;
  value: string | null;
  onChange: (url: string | null) => void;
  onError: (msg: string) => void;
  isFavicon?: boolean;
}

function ImageField({ label, hint, placeholder, value, onChange, onError, isFavicon }: ImageFieldProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      onError(t("settings.photoTooBig"));
      return;
    }

    onError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || t("settings.uploadFailed"));
      }
      const data = await res.json();
      onChange(data.preview);
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : t("settings.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <p className="text-xs font-bold text-[var(--foreground)]">{label}</p>
      {value ? (
        <div className="group relative mt-2 overflow-hidden rounded-xl border border-[var(--card-border)]">
          {isFavicon ? (
            <div className="flex items-center gap-3 bg-[var(--background)] p-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--card-border)]">
                <Image src={value} alt="" fill className="object-contain" sizes="48px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-[var(--foreground)]">{t("seo.faviconPreview")}</p>
                <p className="truncate text-[10px] text-[var(--muted)]">{value}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] font-bold text-[var(--brand)] shadow-sm transition-all hover:bg-white dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                >
                  {t("settings.changePhoto")}
                </button>
                <button
                  type="button"
                  onClick={() => onChange(null)}
                  className="rounded-lg bg-red-500 px-2.5 py-1.5 text-[11px] font-bold text-white transition-all hover:bg-red-600"
                >
                  {t("settings.removeLink")}
                </button>
              </div>
            </div>
          ) : (
            <Image src={value} alt="" width={1200} height={450} className="h-32 w-full object-cover" />
          )}
          {!isFavicon && (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-2 bg-gradient-to-t from-black/60 to-transparent p-2">
              <button
                type="button"
                onClick={() => onChange(null)}
                className="rounded-lg bg-red-500 px-2.5 py-1.5 text-[11px] font-bold text-white transition-all hover:bg-red-600"
              >
                {t("settings.removeLink")}
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] font-bold text-[var(--brand)] transition-all hover:bg-white"
              >
                {t("settings.changePhoto")}
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`mt-2 flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--card-border)] bg-[var(--background)] text-[var(--muted)] transition-all hover:border-[var(--brand)] hover:bg-[var(--brand-light)] hover:text-[var(--brand)] disabled:opacity-50 ${
            isFavicon ? "h-24" : "h-32"
          }`}
        >
          {uploading ? (
            <>
              <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="mt-2 text-xs font-medium">{t("settings.uploadCompressing")}</span>
            </>
          ) : (
            <>
              <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25z" />
              </svg>
              <span className="mt-2 text-xs font-medium">{placeholder}</span>
            </>
          )}
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/tiff,image/bmp"
        className="hidden"
        onChange={handleUpload}
      />
      <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--muted)]">{hint}</p>
    </div>
  );
}

export default function SeoTab() {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [ogImage, setOgImage] = useState<string | null>(null);
  const [favicon, setFavicon] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch("/api/admin/seo")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (ignore || !d?.settings) return;
        setTitle(d.settings.title || "");
        setDescription(d.settings.description || "");
        setKeywords(d.settings.keywords || "");
        setOgImage(d.settings.ogImage || null);
        setFavicon(d.settings.favicon || null);
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  // Bersihkan timer saat komponen unmount
  useEffect(
    () => () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
    },
    []
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const res = await fetch("/api/admin/seo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, keywords, ogImage, favicon }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(translateApiError(data.message, t) || t("seo.saveFailed"));
      }
      setSuccess(true);
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = setTimeout(() => {
        successTimerRef.current = null;
        setSuccess(false);
      }, 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("seo.saveFailed"));
    } finally {
      setSaving(false);
    }
  }, [title, description, keywords, ogImage, favicon, t]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-5 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="card-app h-64 animate-pulse rounded-xl border border-[var(--card-border)] bg-[var(--card)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-[var(--foreground)]">{t("seo.title")}</h3>
        <p className="mt-0.5 text-xs text-[var(--muted)]">{t("seo.desc")}</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-500/15 dark:text-emerald-400">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t("seo.saveSuccess")}
        </div>
      )}

      {/* Meta tags — berlaku untuk semua halaman */}
      <div className="card-app rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-light)]">
            <svg className="h-4 w-4 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
          </div>
          <h4 className="text-sm font-bold text-[var(--foreground)]">{t("seo.metaTitle")}</h4>
        </div>
        <p className="mt-1 text-[10px] text-[var(--muted)]">{t("seo.metaDesc")}</p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[var(--foreground)]">{t("seo.siteTitleLabel")}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("seo.siteTitlePlaceholder")}
              maxLength={90}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
            />
            <p className="mt-1 text-right text-[10px] text-[var(--muted)]">{title.length}/90</p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[var(--foreground)]">{t("seo.descriptionLabel")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("seo.descriptionPlaceholder")}
              rows={4}
              maxLength={200}
              className="w-full resize-none rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm leading-relaxed text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
            />
            <p className="mt-1 text-right text-[10px] text-[var(--muted)]">{description.length}/200</p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[var(--foreground)]">{t("seo.keywordsLabel")}</label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder={t("seo.keywordsPlaceholder")}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
            />
            <p className="mt-1 text-[10px] text-[var(--muted)]">{t("seo.keywordsHint")}</p>
          </div>
        </div>
      </div>

      {/* Gambar OG + Favicon */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card-app rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <ImageField
            label={t("seo.ogImageLabel")}
            hint={t("seo.ogImageHint")}
            placeholder={t("seo.ogImagePlaceholder")}
            value={ogImage}
            onChange={setOgImage}
            onError={setError}
          />
        </div>
        <div className="card-app rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <ImageField
            label={t("seo.faviconLabel")}
            hint={t("seo.faviconHint")}
            placeholder={t("seo.faviconPlaceholder")}
            value={favicon}
            onChange={setFavicon}
            onError={setError}
            isFavicon
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || success}
        className={`w-full rounded-lg py-2.5 text-sm font-bold text-white transition-all disabled:opacity-50 ${
          success ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[var(--brand)] hover:bg-[var(--brand-hover)]"
        }`}
      >
        {success ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t("seo.saveSuccess")}
          </span>
        ) : saving ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t("seo.saving")}
          </span>
        ) : (
          t("seo.save")
        )}
      </button>
    </div>
  );
}
