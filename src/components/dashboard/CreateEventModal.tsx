"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/lib/lang";
import { translateApiError } from "@/lib/helpers";

const MAX_FILE_SIZE = 512 * 1024;

interface ListEditorProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  addLabel: string;
}

function ListEditor({ label, items, onChange, placeholder, addLabel }: ListEditorProps) {
  const [draft, setDraft] = useState("");

  const addItem = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...items, v]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-[var(--foreground)]">{label}</p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2"
          >
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]" />
            <span className="min-w-0 flex-1 break-words text-sm text-[var(--foreground)]">{item}</span>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="shrink-0 rounded p-1 text-[var(--muted)] transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--brand)]"
        />
        <button
          type="button"
          onClick={addItem}
          className="shrink-0 rounded-lg border border-[var(--brand)] px-3 py-2 text-xs font-bold text-[var(--brand)] transition-all hover:bg-[var(--brand-light)]"
        >
          {addLabel}
        </button>
      </div>
    </div>
  );
}

export interface CreateEventData {
  slug: string;
  title: string;
  description: string;
  image: string | null;
  badge: string;
  duration: string;
  durationValue: number | null;
  durationUnit: "day" | "week" | "month" | null;
  endsAt: string | null;
  active: boolean;
  period: string;
  howTo: string[];
  requirements: string[];
  prizes: string[];
}

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  // Jika diisi, modal berjalan dalam mode edit (pre-fill data + submit PUT)
  event?: CreateEventData | null;
}

export default function CreateEventModal({ isOpen, onClose, onSuccess, event }: CreateEventModalProps) {
  const { t } = useTranslation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [badge, setBadge] = useState("Lomba");
  const [durationValue, setDurationValue] = useState("");
  const [durationUnit, setDurationUnit] = useState<"day" | "week" | "month">("week");
  const [active, setActive] = useState(true);
  const [period, setPeriod] = useState("");
  const [howTo, setHowTo] = useState<string[]>([]);
  const [requirements, setRequirements] = useState<string[]>([]);
  const [prizes, setPrizes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isEdit = !!event;

  useEffect(() => {
    if (isOpen) {
      setTitle(event?.title || "");
      setDescription(event?.description || "");
      setImage(event?.image || null);
      setBadge(event?.badge || "Lomba");
      setDurationValue(event?.durationValue != null ? String(event.durationValue) : "");
      setDurationUnit(event?.durationUnit === "day" || event?.durationUnit === "month" ? event.durationUnit : "week");
      setActive(event?.active ?? true);
      setPeriod(event?.period || "");
      setHowTo(event?.howTo || []);
      setRequirements(event?.requirements || []);
      setPrizes(event?.prizes || []);
      setError("");
      setSubmitting(false);
      setSuccess(false);
      setImageUploading(false);
    }
    // Bersihkan timer auto-close setiap kali modal terbuka/tutup atau event berubah
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, [isOpen, event]);

  // Bersihkan timer saat komponen unmount
  useEffect(
    () => () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    },
    []
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError(t("settings.photoTooBig"));
      return;
    }

    setError("");
    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || t("settings.uploadFailed"));
      }
      const data = await res.json();
      setImage(data.preview);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("settings.uploadFailed"));
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError(t("event.createTitleRequired"));
      return;
    }
    if (!description.trim()) {
      setError(t("event.createDescriptionRequired"));
      return;
    }
    const parsedValue = Number(durationValue);
    if (!durationValue.trim() || !Number.isFinite(parsedValue) || parsedValue <= 0) {
      setError(t("event.createDurationRequired"));
      return;
    }
    if (imageUploading) {
      setError(t("createPost.uploading"));
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(
        isEdit ? `/api/events/${encodeURIComponent(event.slug)}` : "/api/events",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            image,
            badge,
            durationValue: parsedValue,
            durationUnit,
            active,
            period,
            howTo,
            requirements,
            prizes,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(translateApiError(data.message, t) || (isEdit ? t("event.editFailed") : t("event.createFailed")));
      }
      setSuccess(true);
      window.dispatchEvent(new CustomEvent("events-updated"));
      onSuccess();
      // Tampilkan "Success" sejenak pada tombol sebelum menutup modal
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        onClose();
      }, 900);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (isEdit ? t("event.editFailed") : t("event.createFailed")));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 pt-6 md:pt-12"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal lebar 80% layar */}
      <div className="mx-2 w-[calc(100%-1rem)] max-w-[80vw] rounded-2xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl lg:w-[80vw]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--card-border)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-light)]">
              <svg className="h-4 w-4 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zM6.75 6.75h10.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-[var(--foreground)]">
                {isEdit ? t("event.editTitle") : t("event.createTitle")}
              </h2>
              <p className="text-xs text-[var(--muted)]">{t("event.createDesc")}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--brand-light)] hover:text-[var(--brand)]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body — 2 kolom pada layar lebar */}
        <div className="max-h-[70vh] overflow-y-auto p-5">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Kolom kiri: gambar + info dasar */}
            <div className="space-y-4">
              {/* Upload gambar */}
              <div>
                <p className="mb-2 text-xs font-bold text-[var(--foreground)]">{t("event.createImageLabel")}</p>
                {image ? (
                  <div className="group relative overflow-hidden rounded-xl border border-[var(--card-border)]">
                    <img src={image} alt="" className="h-44 w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-2 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <button
                        type="button"
                        onClick={() => setImage(null)}
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
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageUploading}
                    className="flex h-44 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--card-border)] bg-[var(--background)] text-[var(--muted)] transition-all hover:border-[var(--brand)] hover:bg-[var(--brand-light)] hover:text-[var(--brand)] disabled:opacity-50"
                  >
                    {imageUploading ? (
                      <>
                        <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="mt-2 text-xs font-medium">{t("settings.uploadCompressing")}</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25z" />
                        </svg>
                        <span className="mt-2 text-xs font-medium">{t("event.createImagePlaceholder")}</span>
                      </>
                    )}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/tiff,image/bmp"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[var(--foreground)]">{t("event.createTitleLabel")}</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t("event.createTitlePlaceholder")}
                    className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[var(--foreground)]">{t("event.createDescLabel")}</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("event.createDescPlaceholder")}
                    rows={4}
                    className="w-full resize-none rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm leading-relaxed text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
                  />
                  <p className="mt-1 text-[10px] text-[var(--muted)]">{t("event.createDescHint")}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[var(--foreground)]">{t("event.createBadgeLabel")}</label>
                    <select
                      value={badge}
                      onChange={(e) => setBadge(e.target.value)}
                      className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--brand)]"
                    >
                      <option value="Lomba">{t("event.badgeLomba")}</option>
                      <option value="Project">{t("event.badgeProject")}</option>
                      <option value="Workshop">{t("event.badgeWorkshop")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[var(--foreground)]">{t("event.createDurationLabel")}</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        value={durationValue}
                        onChange={(e) => setDurationValue(e.target.value)}
                        placeholder="10"
                        className="w-20 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
                      />
                      <select
                        value={durationUnit}
                        onChange={(e) => setDurationUnit(e.target.value as "day" | "week" | "month")}
                        className="flex-1 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--brand)]"
                      >
                        <option value="day">{t("event.durationUnitDay")}</option>
                        <option value="week">{t("event.durationUnitWeek")}</option>
                        <option value="month">{t("event.durationUnitMonth")}</option>
                      </select>
                    </div>
                    <p className="mt-1 text-[10px] text-[var(--muted)]">{t("event.createDurationHint")}</p>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[var(--foreground)]">{t("event.createStatusLabel")}</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActive(true)}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-bold transition-all ${
                        active
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                          : "border-[var(--card-border)] bg-[var(--background)] text-[var(--muted)] hover:border-emerald-300"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-500" : "bg-[var(--muted)]"}`} />
                      {t("event.statusActive")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActive(false)}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-bold transition-all ${
                        !active
                          ? "border-gray-400 bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300"
                          : "border-[var(--card-border)] bg-[var(--background)] text-[var(--muted)] hover:border-gray-300"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${!active ? "bg-gray-400" : "bg-[var(--muted)]"}`} />
                      {t("event.statusInactive")}
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-[var(--muted)]">{t("event.createStatusHint")}</p>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[var(--foreground)]">{t("event.createPeriodLabel")}</label>
                  <input
                    type="text"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    placeholder={t("event.createPeriodPlaceholder")}
                    className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
                  />
                </div>
              </div>
            </div>

            {/* Kolom kanan: list dinamis */}
            <div className="space-y-5">
              <ListEditor
                label={t("event.howTo")}
                items={howTo}
                onChange={setHowTo}
                placeholder={t("event.howToPlaceholder")}
                addLabel={t("event.addItem")}
              />
              <ListEditor
                label={t("event.requirements")}
                items={requirements}
                onChange={setRequirements}
                placeholder={t("event.requirementsPlaceholder")}
                addLabel={t("event.addItem")}
              />
              <ListEditor
                label={t("event.prizes")}
                items={prizes}
                onChange={setPrizes}
                placeholder={t("event.prizesPlaceholder")}
                addLabel={t("event.addItem")}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--card-border)] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--card-border)] px-5 py-2.5 text-sm font-medium text-[var(--muted)] transition-all hover:bg-[var(--brand-light)] hover:text-[var(--foreground)]"
          >
            {t("settings.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || imageUploading || success}
            className={`rounded-lg px-6 py-2.5 text-sm font-bold text-white transition-all disabled:opacity-50 ${
              success ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[var(--brand)] hover:bg-[var(--brand-hover)]"
            }`}
          >
            {success ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t("event.saveSuccess")}
              </span>
            ) : submitting ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t("createPost.saving")}
              </span>
            ) : (
              isEdit ? t("event.editSubmit") : t("event.createSubmit")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
