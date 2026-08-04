"use client";

import { useEffect, useRef, useCallback, useState } from "react";

export function useTabVisibility() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const handle = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", handle);
    return () => document.removeEventListener("visibilitychange", handle);
  }, []);
  return visible;
}

/**
 * Hook untuk infinite scroll dengan IntersectionObserver.
 * loadMore disimpan di ref agar observer tetap stabil.
 * Effect bergantung pada hasMore + loading — saat loading selesai,
 * observer otomatis terhubung dengan sentinel.
 */
export function useInfiniteScroll(
  loadMore: () => void,
  hasMore: boolean,
  loading: boolean,
  options?: { threshold?: number }
) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(loadMore);

  // Sinkron loadMore ke ref untuk hindari dependency change
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMoreRef.current();
        }
      },
      { threshold: options?.threshold ?? 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, options?.threshold]);

  return { sentinelRef };
}

/**
 * Hook agar elemen (bar input mobile) tetap menempel di atas keyboard saat
 * input sedang fokus. iOS/Android mengubah ukuran visual viewport saat
 * keyboard naik/turun.
 *
 * Gunakan sebagai callback ref: <div ref={setEl}>
 *
 * Masalah: saat keyboard terbuka dan user scroll, `visualViewport.offsetTop`
 * berubah (negatif) — ini membuat perhitungan `bottom` jadi over-estimate
 * dan bar melayang di atas keyboard. Solusi: clamp offsetTop ke 0.
 *
 * Masalah kedua: `visualViewport.scroll` event dipicu terus-menerus saat
 * scroll, dan interval 120ms terus mengoreksi — menyebabkan bar naik-turun
 * (bergetar). Solusi: hanya update `bottom` jika perubahan keyboardHeight
 * lebih dari 5px (debounce dengan threshold).
 */
export function useKeepAboveKeyboard(focused: boolean) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const lastBottomRef = useRef(0);

  useEffect(() => {
    if (!el) return;

    if (!focused) {
      el.style.bottom = "0px";
      el.style.paddingBottom = "";
      lastBottomRef.current = 0;
      return;
    }

    const vv = window.visualViewport;
    if (!vv) return;

    el.style.paddingBottom = "2px";

    const update = () => {
      const keyboardHeight = Math.max(
        0,
        window.innerHeight - vv.height - Math.max(0, vv.offsetTop)
      );
      // Hanya update jika ada perubahan signifikan (≥5px) — mencegah
      // bar naik-turun saat scroll (offsetTop berfluktuasi kecil).
      if (Math.abs(keyboardHeight - lastBottomRef.current) >= 5) {
        el.style.bottom = `${keyboardHeight}px`;
        lastBottomRef.current = keyboardHeight;
      }
    };

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    update();

    // Interval diperlambat jadi 300ms agar tidak terlalu agresif saat scroll
    const interval = window.setInterval(update, 300);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.clearInterval(interval);
      el.style.bottom = "0px";
      el.style.paddingBottom = "";
      lastBottomRef.current = 0;
    };
  }, [el, focused]);

  return setEl;
}

/**
 * Custom hook untuk pagination tak terbatas (load 10 per batch).
 * Memberikan state dan fungsi untuk memuat data secara bertahap.
 */
export function usePaginatedFetch<T>({
  fetchFn,
  pageSize = 10,
  resetKey,
}: {
  fetchFn: (skip: number, take: number) => Promise<T[]>;
  pageSize?: number;
  resetKey?: number;
}) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const skipRef = useRef(0);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError("");
    skipRef.current = 0;
    try {
      const data = await fetchFn(0, pageSize);
      setItems(data);
      setHasMore(data.length >= pageSize);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [fetchFn, pageSize]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextSkip = skipRef.current + pageSize;
    try {
      const data = await fetchFn(nextSkip, pageSize);
      if (data.length === 0 || data.length < pageSize) {
        setHasMore(false);
      }
      setItems((prev) => [...prev, ...data]);
      skipRef.current = nextSkip;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setLoadingMore(false);
    }
  }, [fetchFn, pageSize, loadingMore, hasMore]);

  // Reset ketika resetKey berubah
  useEffect(() => {
    loadInitial();
  }, [loadInitial, resetKey]);

  return { items, loading, loadingMore, hasMore, error, loadMore, loadInitial };
}