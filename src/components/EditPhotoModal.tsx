"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "@/lib/lang";
import ErrorAlert from "@/components/ui/ErrorAlert";
import { encodePositionZoom, translateApiError } from "@/lib/helpers";

type Position = "top" | "center" | "bottom";

interface EditPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** URL gambar saat ini */
  currentImage: string | null;
  /** Posisi saat ini */
  currentPosition: string;
  /** Tipe: avatar atau cover */
  type: "avatar" | "cover";
  /** Dipanggil saat menyimpan dengan URL baru & posisi baru */
  onSave: (imageUrl: string | null, position: string) => Promise<void>;
}

const POSITIONS: { value: Position; icon: string }[] = [
  { value: "top", icon: "↑" },
  { value: "center", icon: "↕" },
  { value: "bottom", icon: "↓" },
];

export default function EditPhotoModal({
  isOpen,
  onClose,
  currentImage,
  currentPosition,
  type,
  onSave,
}: EditPhotoModalProps) {
  const { t } = useTranslation();
  const [selectedPosition, setSelectedPosition] = useState<Position>(
    (["top", "center", "bottom"].includes(currentPosition)
      ? currentPosition
      : "center") as Position
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImage);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(100);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Decode zoom from currentPosition on mount
  useEffect(() => {
    if (isOpen && currentPosition) {
      const parts = currentPosition.split(":");
      if (parts.length > 1) {
        const z = parseInt(parts[1], 10);
        if (!isNaN(z)) setZoom(Math.max(50, Math.min(200, z)));
        else setZoom(100);
      } else {
        setZoom(100);
      }
    }
  }, [isOpen, currentPosition]);

  // Reset state setiap modal dibuka
  useEffect(() => {
    if (isOpen) {
      setSelectedPosition(
        (["top", "center", "bottom"].includes(currentPosition)
          ? currentPosition
          : "center") as Position
      );
      setPreviewUrl(currentImage);
      setError("");
    }
  }, [isOpen, currentImage, currentPosition]);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validasi ukuran (max 512KB)
      if (file.size > 512 * 1024) {
        setError(t("settings.photoTooBig"));
        return;
      }

      setError("");
      setUploading(true);

      try {
        // Tampilkan preview lokal instan
        const localUrl = URL.createObjectURL(file);
        setPreviewUrl(localUrl);

        // Upload ke server via existing /api/upload
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(translateApiError(err.error, t) || t("settings.uploadFailed"));
        }

        const data = await res.json();

        // Ganti preview lokal dengan R2 URL
        URL.revokeObjectURL(localUrl);
        setPreviewUrl(data.preview);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : t("settings.uploadCompressing");
        setError(msg);
        setPreviewUrl(currentImage);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [currentImage]
  );

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      await onSave(previewUrl, encodePositionZoom(selectedPosition, zoom));
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("settings.savePhotoFailed");
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    setError("");

    try {
      await onSave(null, encodePositionZoom(selectedPosition, zoom));
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("settings.deletePhotoFailed");
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isAvatar = type === "avatar";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--card-border)] px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--brand-light)] hover:text-[var(--brand)]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-lg font-bold">
            {isAvatar ? t("settings.editAvatar") : t("settings.editCover")}
          </h2>
          <div className="w-8" />
        </div>

        <div className="p-5">
          {error && <ErrorAlert message={error} />}

          {/* Preview gambar */}
          <div className="relative mb-5 flex items-center justify-center">
            {previewUrl ? (
              <div
                className={`overflow-hidden border-2 border-[var(--card-border)] ${
                  isAvatar
                    ? "h-48 w-48 rounded-full"
                    : "h-36 w-full max-w-md rounded-xl"
                }`}
              >
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="h-full w-full transition-all duration-200"
                  style={{
                    objectFit: "cover",
                    objectPosition:
                      selectedPosition === "top"
                        ? "center top"
                        : selectedPosition === "bottom"
                        ? "center bottom"
                        : "center center",
                    transform: `scale(${zoom / 100})`,
                  }}
                />
                {/* Upload spinner overlay */}
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-[inherit] bg-black/30">
                    <svg className="h-8 w-8 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                )}
              </div>
            ) : (
              <div
                className={`relative flex items-center justify-center border-2 border-dashed border-[var(--card-border)] ${
                  isAvatar
                    ? "h-48 w-48 rounded-full"
                    : "h-36 w-full max-w-md rounded-xl"
                }`}
              >
                <div className="text-center text-[var(--muted)]">
                  <svg className="mx-auto h-10 w-10" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <p className="mt-2 text-sm">{t("settings.noPhoto")}</p>
                </div>
                {/* Upload spinner overlay */}
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-[inherit] bg-black/30">
                    <svg className="h-8 w-8 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tombol Upload */}
          <div className="mb-5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full rounded-lg border-2 border-dashed border-[var(--card-border)] px-4 py-3 text-sm font-medium text-[var(--brand)] transition-all hover:border-[var(--brand)] hover:bg-[var(--brand-light)] disabled:opacity-40"
            >
              {uploading
                ? t("settings.uploadCompressing")
                : previewUrl
                ? t("settings.changePhoto")
                : t("settings.selectPhoto")}
            </button>
          </div>

          {/* Position controls */}
          <div className="mb-5">
            <p className="mb-3 text-sm font-medium text-[var(--foreground)]">
              {t("settings.photoPosition")}
            </p>
            <div className="flex gap-2">
              {POSITIONS.map((pos) => (
                <button
                  key={pos.value}
                  onClick={() => setSelectedPosition(pos.value)}
                  disabled={!previewUrl}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                    selectedPosition === pos.value
                      ? "border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]"
                      : "border-[var(--card-border)] text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
                  } disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                  <span className="text-lg">{pos.icon}</span>
                  {pos.value === "top" ? t("settings.positionTop") : pos.value === "bottom" ? t("settings.positionBottom") : t("settings.positionCenter")}
                </button>
              ))}
            </div>

            {/* Visual indicator preview kecil */}
            {previewUrl && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--background)] p-2">
                <div
                  className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--card-border)]"
                >
                  <img
                    src={previewUrl}
                    alt="mini preview"
                    className="h-full w-full"
                    style={{
                      objectFit: "cover",
                      objectPosition:
                        selectedPosition === "top"
                          ? "center top"
                          : selectedPosition === "bottom"
                          ? "center bottom"
                          : "center center",
                      transform: `scale(${zoom / 100})`,
                    }}
                  />
                </div>                  <span className="text-xs text-[var(--muted)]">
                  {t("settings.photoPosition")}{" "}
                  <span className="font-medium text-[var(--foreground)]">
                    {selectedPosition === "top"
                      ? t("settings.positionTop")
                      : selectedPosition === "bottom"
                      ? t("settings.positionBottom")
                      : t("settings.positionCenter")}
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Zoom controls */}
          <div className="mb-5">
            <p className="mb-3 text-sm font-medium text-[var(--foreground)]">
              {t("settings.zoomLabel")}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setZoom(Math.max(50, zoom - 10))}
                disabled={!previewUrl || zoom <= 50}
                className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-[var(--card-border)] text-lg font-bold text-[var(--muted)] transition-all hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:opacity-30 disabled:cursor-not-allowed"
                title={t("settings.zoomOut")}
              >
                −
              </button>
              <div className="flex-1">
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-[var(--card-border)]">
                  <div
                    className="h-full rounded-full bg-[var(--brand)] transition-all duration-200"
                    style={{ width: `${((zoom - 50) / 150) * 100}%` }}
                  />
                </div>
                <div className="mt-1 text-center text-xs font-medium text-[var(--muted)]">
                  {t("settings.zoomLevel", { n: zoom })}
                </div>
              </div>
              <button
                onClick={() => setZoom(Math.min(200, zoom + 10))}
                disabled={!previewUrl || zoom >= 200}
                className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-[var(--card-border)] text-lg font-bold text-[var(--muted)] transition-all hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:opacity-30 disabled:cursor-not-allowed"
                title={t("settings.zoomIn")}
              >
                +
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {previewUrl && (
              <button
                onClick={handleRemove}
                disabled={saving}
                className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-500 transition-all hover:bg-red-50 disabled:opacity-50"
              >
                {t("settings.removePhoto")}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="flex-1 rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[var(--brand-hover)] disabled:opacity-50"
            >
              {saving ? t("settings.saving") : t("settings.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
