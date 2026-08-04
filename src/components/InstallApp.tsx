"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/lang";

// Tipe event beforeinstallprompt (tidak ada di lib.dom standar)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Tombol Install Aplikasi (PWA).
 *
 * - Android/Chrome: menangkap event `beforeinstallprompt` → tampilkan tombol
 *   "Install Aplikasi" yang memicu prompt install resmi browser.
 * - iOS Safari: TIDAK mendukung beforeinstallprompt & tidak ada prompt
 *   otomatis — tampilkan tombol yang membuka panduan "Add to Home Screen"
 *   (Share → Tambahkan ke Layar Utama).
 * - Otomatis tersembunyi jika app sudah berjalan sebagai standalone (installed).
 */
export default function InstallApp() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // Flag mount — hindari hydration mismatch: keputusan tampil hanya diambil
  // setelah komponen ter-mount di client (SSR & render pertama selalu null).
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- flag mount (client-only, aman SSR)
    setMounted(true);
    // Dismiss permanen disimpan di localStorage agar tombol tidak muncul lagi
    // setelah pengguna menutupnya (kecuali mereka install app-nya).
    try {
      if (localStorage.getItem("pwa_install_dismissed") === "1") setDismissed(true);
    } catch {
      // localStorage tidak tersedia
    }
  }, []);

  // Cek apakah sudah berjalan sebagai PWA standalone (client-only)
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true);

  // iOS tidak mengirim beforeinstallprompt — deteksi via user-agent.
  // iPadOS 13+ melaporkan "Macintosh" di userAgent, jadi tambahkan fallback
  // maxTouchPoints untuk menangkap iPad (touch device + desktop UA).
  const isIos =
    typeof navigator !== "undefined" &&
    (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Belum ter-mount (SSR / render pertama) → selaras dengan server (null)
  if (!mounted) return null;

  // Sudah terpasang / sudah ditutup pengguna → jangan tampilkan
  if (installed || isStandalone || dismissed) return null;

  // Detail feed pages punya fixed comment bar di bawah — hindari tabrakan
  if (pathname && /^\/(post|project)\/.+/.test(pathname)) return null;

  // Belum installable (desktop non-Chrome, dll) & bukan iOS → sembunyikan
  if (!deferredPrompt && !isIos) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("pwa_install_dismissed", "1");
    } catch {
      // localStorage tidak tersedia
    }
  };

  return (
    <>
      {/* Tombol mengambang — di atas MobileNav (bottom bar) di mobile */}
      <div className="fixed bottom-24 right-4 z-40 flex items-center gap-1.5 md:bottom-6 md:right-6">
        <button
          onClick={() => (isIos && !deferredPrompt ? setShowGuide(true) : handleInstall())}
          className="flex items-center gap-2 rounded-full bg-[var(--brand)] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-all hover:bg-[var(--brand-hover)] active:scale-95"
          aria-label={t("pwa.install")}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {t("pwa.install")}
        </button>
        {/* Tombol tutup permanen (tersimpan di localStorage) */}
        <button
          onClick={handleDismiss}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-white shadow transition-all hover:bg-black/60"
          aria-label={t("nav.close")}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Panduan iOS — Add to Home Screen */}
      {showGuide && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 animate-fade-in"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-extrabold text-[var(--foreground)]">{t("pwa.iosTitle")}</h3>
              <button
                onClick={() => setShowGuide(false)}
                className="rounded-lg p-1.5 text-[var(--muted)] transition-all hover:bg-[var(--brand-light)] hover:text-[var(--brand)]"
                aria-label={t("nav.close")}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ol className="mt-4 space-y-3 text-sm text-[var(--muted)]">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-light)] text-xs font-bold text-[var(--brand)]">1</span>
                <span>{t("pwa.iosStep1")}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-light)] text-xs font-bold text-[var(--brand)]">2</span>
                <span>{t("pwa.iosStep2")}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-light)] text-xs font-bold text-[var(--brand)]">3</span>
                <span>{t("pwa.iosStep3")}</span>
              </li>
            </ol>
            <button
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-[var(--brand-hover)]"
            >
              {t("nav.close")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
