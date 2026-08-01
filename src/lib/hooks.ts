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
  }, [hasMore, loading, options?.threshold]); // loadMore di-ref, tidak perlu di deps

  return { sentinelRef };
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
