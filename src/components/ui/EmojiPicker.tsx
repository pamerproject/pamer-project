"use client";

import { useRef, useEffect } from "react";

const EMOJIS = [
  "😊", "👍", "❤️", "😂", "🔥", "🎉",
  "👏", "🙏", "💪", "✨", "🥳", "😍",
  "😭", "🥺", "🤣", "😎", "🤔", "👀",
  "💀", "🙌", "💯", "🎊", "🥇", "🍿",
  "🥰", "😘", "😤", "🤗", "🫡", "😅",
  "🤩", "😱", "🥶", "🤯", "🫠", "😈",
];

/**
 * Check if text content is ONLY emoji characters (for large emoji display).
 */
export function isOnlyEmoji(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > 30) return false;
  const stripped = trimmed.replace(
    /[\p{Emoji_Presentation}\p{Emoji}\uFE0F\u200D\u20E3\u{1F1E6}-\u{1F1FF}\p{So}]/gu,
    ""
  );
  return stripped.trim().length === 0;
}

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  disableOutsideClick?: boolean;
}

export default function EmojiPicker({ onSelect, onClose, disableOutsideClick }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disableOutsideClick) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, disableOutsideClick]);

  return (
    <div
      ref={ref}
      className="w-[380px] max-w-[calc(100vw-24px)] rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-3 shadow-xl md:p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="grid grid-cols-6 gap-1.5 md:gap-2">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onSelect(emoji);
              onClose();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-2xl transition-all hover:bg-[var(--brand-light)] hover:scale-110 active:scale-95 md:h-12 md:w-12 md:text-3xl"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
