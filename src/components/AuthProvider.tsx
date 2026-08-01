"use client";

import { useEffect } from "react";
import { SessionProvider, getSession } from "next-auth/react";

/**
 * SessionProvider + proteksi bfcache / post-logout.
 *
 * Chrome men-disable bfcache saat DevTools terbuka — itu kenapa logout
 * "berhasil" hanya saat F12. Tanpa DevTools, halaman bisa di-restore
 * dari cache dengan session client yang masih authenticated.
 */
function AuthLifecycle({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Setelah land di /?logged_out=... — bersihkan query + paksa re-sync session
    const params = new URLSearchParams(window.location.search);
    if (params.has("logged_out")) {
      window.history.replaceState({}, "", "/");
      // Re-fetch session dari server (harusnya null karena cookie sudah di-clear)
      void getSession();
    }

    // Halaman di-restore dari bfcache → reload agar state auth fresh
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return <>{children}</>;
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider refetchOnWindowFocus refetchWhenOffline={false}>
      <AuthLifecycle>{children}</AuthLifecycle>
    </SessionProvider>
  );
}
