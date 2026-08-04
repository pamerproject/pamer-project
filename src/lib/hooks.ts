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
 * Prinsip per platform:
 * - Android (default `interactive-widget: resizes-visual`): elemen `fixed`
 *   diposisikan relatif ke VISUAL viewport — `bottom: 0` dari class Tailwind
 *   SUDAH otomatis menempatkan bar tepat di atas keyboard. Menyetel `bottom`
 *   via JS justru membuat bar melayang tinggi (gap di bawah bar) dan ikut
 *   naik-turun saat scroll. Jadi di Android: JANGAN sentuh `bottom` sama sekali.
 * - iOS Safari: `position: fixed; bottom: 0` otomatis menempel di atas
 *   keyboard. Saat halaman di-scroll dgn keyboard terbuka, `fixed` desync
 *   dgn visual viewport (offsetTop stale selama gesture) → bar ikut
 *   naik-turun. Solusi: scroll halaman DIKUNCI saat input fokus
 *   (body overflow:hidden) sehingga bar dijamin diam; dipulihkan saat blur.
 * - Keyboard TERTUTUP → `bottom: 0px` (bar menempel di dasar layar).
 */
export function useKeepAboveKeyboard(focused: boolean) {
  // Pakai ref + callback ref (bukan useState) — elemen DOM memang harus
  // dimutasi langsung (style.bottom), dan mutasi nilai useState dilarang
  // oleh aturan lint react-hooks/immutability.
  const elRef = useRef<HTMLElement | null>(null);
  const setEl = useCallback((node: HTMLElement | null) => {
    elRef.current = node;
  }, []);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    if (!focused) {
      el.style.bottom = "0px";
      return;
    }

    const vv = window.visualViewport;
    if (!vv) return;

    // Deteksi iOS Safari (termasuk iPad dengan desktop mode).
    const ua = navigator.userAgent;
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    // Android: biarkan `bottom: 0` dari class Tailwind bekerja sendiri —
    // browser sudah menempelkan bar tepat di atas keyboard.
    if (!isIOS) {
      el.style.bottom = "0px";
      return;
    }

    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // Tinggi keyboard = layout viewport - visual viewport.
        const keyboardHeight = Math.max(0, window.innerHeight - vv.height);
        // Kompensasi scroll: di iOS elemen fixed "ikut" layout viewport saat
        // halaman di-scroll, kurangi offsetTop agar bar tetap di atas keyboard.
        const bottom = Math.max(0, keyboardHeight - vv.offsetTop);
        el.style.bottom = `${bottom}px`;
      });
    };

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    // PENTING: saat keyboard terbuka di iOS dan user scroll halaman, scroll
    // dokumen memicu event `window.scroll` (visualViewport.scroll TIDAK
    // selalu terpicu di iOS). Tanpa listener ini, offsetTop tidak ter-update
    // sehingga bar ikut naik-turun mengikuti scroll.
    window.addEventListener("scroll", update);
    update();

    // Fallback lambat untuk browser yang tidak memicu resize saat keyboard
    // naik/turun. Nilainya stabil (rAF + input konsisten) sehingga aman.
    const interval = window.setInterval(update, 300);

    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
      window.clearInterval(interval);
      el.style.bottom = "0px";
    };
  }, [focused]);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset data saat resetKey berubah (pola standar)
    loadInitial();
  }, [loadInitial, resetKey]);

  return { items, loading, loadingMore, hasMore, error, loadMore, loadInitial };
}