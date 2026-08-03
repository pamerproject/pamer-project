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
 * keyboard naik/turun — `position:fixed; bottom:0` saja tidak cukup karena
 * posisinya dihitung terhadap layout viewport (jadi terlihat ikut scroll
 * saat keyboard terbuka). Hook ini mendengarkan event resize/scroll pada
 * `window.visualViewport` dan menyesuaikan `bottom` elemen secara real-time.
 *
 * Untuk mencegah bar melayang di atas dasar layar saat scroll biasa (URL bar
 * iOS berubah), hook hanya aktif saat `focused` true.
 * Saat `focused` berubah ke false, hook langsung mereset bottom ke "0px"
 * dalam satu siklus effect yang sama — menghindari race condition antar dua
 * effect terpisah yang bisa menyebabkan bar tidak kembali ke posisi flush.
 *
 * Gunakan sebagai callback ref: <div ref={setEl}>.
 */
export function useKeepAboveKeyboard(focused: boolean) {
  const [el, setEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!el) return;

    // Saat tidak fokus, reset bar ke dasar layar, pulihkan padding asli,
    // dan jangan pasang listener.
    if (!focused) {
      el.style.bottom = "0px";
      el.style.paddingBottom = "";
      return;
    }

    const vv = window.visualViewport;
    if (!vv) return;

    // Keyboard sudah menutupi area home-indicator → kecilkan padding bawah
    // agar tidak ada sisa ruang kosong antara input dan keyboard.
    el.style.paddingBottom = "4px";

    const update = () => {
      const keyboardHeight = Math.max(
        0,
        window.innerHeight - vv.height - vv.offsetTop
      );
      el.style.bottom = `${keyboardHeight}px`;
    };

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    update();

    // iOS: animasi keyboard naik butuh waktu — rehitung beberapa kali
    // setelah fokus agar posisi bar tidak tertinggal (menyisakan gap).
    const t1 = window.setTimeout(update, 150);
    const t2 = window.setTimeout(update, 400);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      // Cleanup: kembalikan ke bottom 0 & padding asli
      el.style.bottom = "0px";
      el.style.paddingBottom = "";
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