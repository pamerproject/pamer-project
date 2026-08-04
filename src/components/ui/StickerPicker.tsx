"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { STICKERS, STICKER_CATEGORIES, type Sticker } from "@/lib/stickers";

interface StickerPickerProps {
  onSelect: (sticker: Sticker) => void;
  onClose: () => void;
  disableOutsideClick?: boolean;
}

export default function StickerPicker({ onSelect, onClose, disableOutsideClick }: StickerPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [activeCat, setActiveCat] = useState(STICKER_CATEGORIES[0].id);

  const filtered = activeCat === "all"
    ? STICKERS
    : STICKERS.filter((s) => s.category === activeCat);

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
      className="w-[360px] max-w-[calc(100vw-24px)] rounded-2xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-[var(--card-border)] p-2">
        {STICKER_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCat(cat.id)}
            className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              activeCat === cat.id
                ? "bg-[var(--brand-light)] text-[var(--brand)]"
                : "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Sticker grid */}
      <div className="grid max-h-[260px] grid-cols-4 gap-2 overflow-y-auto p-3 max-sm:grid-cols-3 max-sm:gap-1.5 max-sm:p-2">
        {filtered.map((sticker) => (
          <button
            key={sticker.id}
            onClick={() => {
              onSelect(sticker);
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
              className="h-10 w-10 object-contain md:h-12 md:w-12"
            />
            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 truncate rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
              {sticker.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
