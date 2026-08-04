"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Sticker } from "@/lib/stickers";
import { STICKERS, STICKER_CATEGORIES } from "@/lib/stickers";

type TabType = "emoji" | "sticker";

const EMOJIS = [
  "😊", "👍", "❤️", "😂", "🔥", "🎉",
  "👏", "🙏", "💪", "✨", "🥳", "😍",
  "😭", "🥺", "🤣", "😎", "🤔", "👀",
  "💀", "🙌", "💯", "🎊", "🥇", "🍿",
  "🥰", "😘", "😤", "🤗", "🫡", "😅",
  "🤩", "😱", "🥶", "🤯", "🫠", "😈",
];

interface EmojiStickerSheetProps {
  open: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
  onStickerSelect: (sticker: Sticker) => void;
  defaultTab?: TabType;
}

export default function EmojiStickerSheet({
  open,
  onClose,
  onEmojiSelect,
  onStickerSelect,
  defaultTab = "emoji",
}: EmojiStickerSheetProps) {
  const [tab, setTab] = useState<TabType>(defaultTab);
  const [stickerCat, setStickerCat] = useState(STICKER_CATEGORIES[0].id);

  // Reset tab when sheet opens with a different defaultTab
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset tab saat sheet dibuka
    if (open) setTab(defaultTab);
  }, [open, defaultTab]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const filteredStickers = stickerCat === "all"
    ? STICKERS
    : STICKERS.filter((s) => s.category === stickerCat);

  return (
    <div className="fixed inset-0 z-[200] md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 animate-slide-up rounded-t-2xl border border-l-0 border-r-0 border-[var(--card-border)] bg-[var(--card)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tab bar */}
        <div className="flex items-center px-1 pt-2">
          <button
            onClick={() => setTab("emoji")}
            className={`flex-1 rounded-t-lg px-4 py-2.5 text-center text-sm font-bold transition-all ${
              tab === "emoji"
                ? "bg-[var(--brand-light)] text-[var(--brand)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <svg className="mr-1.5 inline-block h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
            </svg>
            Emoji
          </button>
          <button
            onClick={() => setTab("sticker")}
            className={`flex-1 rounded-t-lg px-4 py-2.5 text-center text-sm font-bold transition-all ${
              tab === "sticker"
                ? "bg-[var(--brand-light)] text-[var(--brand)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <svg className="mr-1.5 inline-block h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456z" />
            </svg>
            Sticker
          </button>
          {/* Close button */}
          <button
            onClick={onClose}
            className="ml-auto flex items-center justify-center rounded-lg p-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-all"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[50vh] overflow-y-auto">
          {tab === "emoji" ? (
            <div className="grid grid-cols-6 gap-2 p-4">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onEmojiSelect(emoji);
                    onClose();
                  }}
                  className="flex h-12 w-12 items-center justify-center text-2xl transition-all hover:scale-110 active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : (
            <>
              {/* Sticker category tabs */}
              <div className="flex gap-1 overflow-x-auto border-b border-[var(--card-border)] px-3 py-2">
                {STICKER_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setStickerCat(cat.id)}
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                      stickerCat === cat.id
                        ? "bg-[var(--brand-light)] text-[var(--brand)]"
                        : "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              {/* Sticker grid */}
              <div className="grid grid-cols-4 gap-3 p-4 max-sm:grid-cols-3 max-sm:gap-2 max-sm:p-3">
                {filteredStickers.map((sticker) => (
                  <button
                    key={sticker.id}
                    onClick={() => {
                      onStickerSelect(sticker);
                      onClose();
                    }}
                    className="group relative flex aspect-square items-center justify-center rounded-xl bg-[var(--background)] transition-all hover:bg-[var(--brand-light)] hover:scale-105 active:scale-95"
                    title={sticker.name}
                  >
                    {/* unoptimized: sticker adalah GIF animasi GIPHY, tak boleh dikonversi */}
                    <Image
                      src={sticker.url}
                      alt={sticker.name}
                      width={48}
                      height={48}
                      unoptimized
                      className="h-12 w-12 object-contain"
                    />
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 truncate rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {sticker.name}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
