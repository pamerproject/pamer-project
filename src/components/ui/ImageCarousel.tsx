"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "@/lib/lang";

interface ImageCarouselProps {
  images: string[];
  /** Alt text prefix for each image */
  alt?: string;
  /** Max height for the carousel */
  maxHeight?: number;
}

export default function ImageCarousel({
  images,
  alt = "",
  maxHeight = 300,
}: ImageCarouselProps) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);
  const wheelTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback(
    (index: number) => {
      setCurrent(Math.max(0, Math.min(index, images.length - 1)));
    },
    [images.length]
  );

  // --- Touch swipe (layar sentuh) ---
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const diffX = touchStartX.current - touchEndX.current;
    const diffY = touchStartY.current - touchEndY.current;

    // Hanya proses swipe jika horizontal DOMINAN (cegah scroll vertikal)
    if (Math.abs(diffX) < 50) return;
    if (Math.abs(diffX) < Math.abs(diffY) * 1.5) return;

    if (diffX > 0 && current < images.length - 1) {
      goTo(current + 1);
    } else if (diffX < 0 && current > 0) {
      goTo(current - 1);
    }
  }, [current, images.length, goTo]);

  // --- Wheel / trackpad swipe (dua jari) ---
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      // Cuma proses kalo dominan horizontal (trackpad swipe 2 jari)
      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);
      if (absX < absY || absX < 20) return;

      // Debounce: tunggu 400ms antar navigasi
      if (wheelTimeout.current) return;

      if (e.deltaX > 0 && current < images.length - 1) {
        goTo(current + 1);
      } else if (e.deltaX < 0 && current > 0) {
        goTo(current - 1);
      }

      wheelTimeout.current = setTimeout(() => {
        wheelTimeout.current = null;
      }, 400);
    },
    [current, images.length, goTo]
  );

  // Reset current index kalo images berubah
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrent(0);
  }, [images]);

  // Cleanup wheel timeout
  useEffect(() => {
    return () => {
      if (wheelTimeout.current) clearTimeout(wheelTimeout.current);
    };
  }, []);

  if (images.length === 0) return null;

  return (
    <div
      className="group relative overflow-hidden"
      onWheel={handleWheel}
    >
      {/* Image container */}
      <div
        className="relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={images[current]}
          alt={alt ? `${alt} ${current + 1}` : ""}
          className="w-full select-none bg-[var(--background)]"
          style={{ maxHeight, objectFit: "cover" }}
          draggable={false}
        />

        {/* Prev button — muncul pas hover di area gambar */}
        {images.length > 1 && current > 0 && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goTo(current - 1);
            }}
            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 shadow-lg backdrop-blur-sm transition-all duration-200 group-hover:opacity-100 hover:bg-black/70 hover:scale-110 active:scale-95"
            aria-label={t("imageCarousel.prev")}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Next button — muncul pas hover di area gambar */}
        {images.length > 1 && current < images.length - 1 && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goTo(current + 1);
            }}
            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 shadow-lg backdrop-blur-sm transition-all duration-200 group-hover:opacity-100 hover:bg-black/70 hover:scale-110 active:scale-95"
            aria-label={t("imageCarousel.next")}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Dots navigation */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-3">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goTo(i);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current
                  ? "w-6 bg-[var(--brand)]"
                  : "w-2 bg-[var(--card-border)] hover:bg-[var(--muted)]"
              }`}
              aria-label={t("imageCarousel.imageAlt", { n: i + 1 })}
            />
          ))}
        </div>
      )}

      {/* Image counter */}
      {images.length > 1 && (
        <div className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white">
          {current + 1}/{images.length}
        </div>
      )}
    </div>
  );
}
