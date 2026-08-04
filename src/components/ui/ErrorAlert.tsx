"use client";

import Image from "next/image";
import { STICKERS } from "@/lib/stickers";

interface ErrorAlertProps {
  type?: "error" | "success" | "warning";
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const typeConfig: Record<
  string,
  { stickerId: string; bg: string; border: string; text: string }
> = {
  error: {
    stickerId: "s10", // Sadge
    bg: "bg-red-50 dark:bg-red-950/20",
    border: "border-red-200 dark:border-red-900/50",
    text: "text-red-700 dark:text-red-300",
  },
  success: {
    stickerId: "s1", // Party
    bg: "bg-green-50 dark:bg-green-950/20",
    border: "border-green-200 dark:border-green-900/50",
    text: "text-green-700 dark:text-green-300",
  },
  warning: {
    stickerId: "s21", // MonkaS
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-900/50",
    text: "text-amber-700 dark:text-amber-300",
  },
};

export default function ErrorAlert({
  type = "error",
  message,
  onRetry,
  onDismiss,
}: ErrorAlertProps) {
  const config = typeConfig[type] || typeConfig.error;
  const sticker = STICKERS.find((s) => s.id === config.stickerId);

  if (!message) return null;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border ${config.bg} ${config.border} px-4 py-3`}
    >
      {/* Sticker icon */}
      {sticker && (
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg">
          {/* unoptimized: sticker adalah GIF animasi GIPHY, tak boleh dikonversi */}
          <Image src={sticker.url} alt="" width={32} height={32} unoptimized className="h-full w-full object-contain" />
        </div>
      )}

      {/* Message */}
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium leading-relaxed ${config.text}`}>
          {message}
        </p>
      </div>

      {/* Retry button */}
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold text-[var(--brand)] transition-all hover:bg-[var(--brand-light)] active:scale-95"
        >
          Coba Lagi
        </button>
      )}

      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`shrink-0 rounded-lg p-1 transition-all hover:bg-black/5 ${config.text}`}
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
