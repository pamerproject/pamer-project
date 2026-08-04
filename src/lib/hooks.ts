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
 * input sedang fokus, dan menempel di dasar layar saat tidak fokus.
 *
 * Gunakan sebagai callback ref: <div ref={setEl}>
 *
 * Prinsip:
 * - `position: fixed` SUDAH membuat bar tidak ikut scroll halaman. Jadi
 *   kita TIDAK perlu mendengarkan event scroll atau memakai offsetTop —
 *   justru itu yang membuat bar naik-turun mengikuti halaman.
 * - Keyboard TERTUTUP → `bottom: 0px` (bar menempel di dasar layar).
 * - Keyboard TERBUKA → `bottom = max(0, innerHeight - vv.height)` = tinggi
 *   keyboard (layout viewport - visual viewport). Nilai KONSTAN, tidak
 *   berubah saat user scroll → bar tetap diam di atas keyboard.
 * - Android yang me-resize layout saat keyboard naik: `innerHeight` ikut
 *   menyusut → hasilnya ~0 → bar diam di dasar (sudah di atas keyboard).
 */
export function useKeepAboveKeyboard(focused: boolean) {
  const [el, setEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!el) return;

    if (!focused) {
      el.style.bottom = "0px";
      return;
    }

    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // Tinggi keyboard = layout viewport - visual viewport.
      // TANPA offsetTop: offsetTop berubah saat scroll & membuat bar goyang.
      const keyboardHeight = Math.max(0, window.innerHeight - vv.height);
      el.style.bottom = `${keyboardHeight}px`;
    };

    vv.addEventListener("resize", update);
    window.addEventListener("resize", update);
    update();

    // Fallback lambat untuk browser yang tidak memicu resize saat keyboard
    // naik. Nilainya stabil (tanpa offsetTop) sehingga tidak membuat goyang.
    const interval = window.setInterval(update, 500);

    return () => {
      vv.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      window.clearInterval(interval);
      el.style.bottom = "0px";
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