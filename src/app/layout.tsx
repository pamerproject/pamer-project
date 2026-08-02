import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import InstallApp from "@/components/InstallApp";
import { LangProvider } from "@/lib/lang";
import { buildSeoMetadata } from "@/lib/seo";
import dynamic from "next/dynamic";

const MobileNav = dynamic(() => import("@/components/MobileNav"));
const Sidebar = dynamic(() => import("@/components/Sidebar"));
const RightSidebar = dynamic(() => import("@/components/RightSidebar"));

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#dc2626",
};

// Metadata default situs — dibaca dari SeoSettings (DB) via helper bersama.
// Halaman lain (list/konten) menimpa title/desc/og lewat layout masing-masing.
export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata();
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Nonce CSP dari middleware (header x-nonce) — dipakai untuk inline script
  // di bawah ini (fix S3: hapus 'unsafe-inline' script di production).
  const h = await headers();
  const nonce = h.get("x-nonce") || "";

  return (
    <html
      lang="id"
      className={`${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full" suppressHydrationWarning>
        <AuthProvider>
          <LangProvider>
            <Navbar />
            <div className="layout-bottom-pad pb-20 pt-14 md:pb-0">
              <div className="mx-auto max-w-7xl px-4 py-6">
                <div className="flex justify-center gap-8">
                  <Sidebar />
                  <main className="w-full max-w-[640px]">{children}</main>
                  <RightSidebar />
                </div>
              </div>
            </div>
            <MobileNav />
            <InstallApp />
          </LangProvider>
        </AuthProvider>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                  localStorage.setItem('theme', 'dark');
                }
              } catch(e) {}
            `,
          }}
        />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  // updateViaCache:'none' → browser selalu revalidasi sw.js ke
                  // server (tidak memakai HTTP cache), jadi update SW cepat
                  // menyebar ke perangkat pengguna.
                  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(function() {});
                });
              }
            `,
          }}
        />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              // SW enforcer — paksa perangkat yang masih dikuasai service worker
              // LAMA (v1/v2) langsung membuang cache usang & memasang SW terbaru.
              // Tanpa ini, update SW hanya terjadi saat browser kebetulan mengecek
              // (bisa berhari-hari) — itulah kenapa garis kiri/kanan card masih
              // muncul di banyak HP padahal CSS baru sudah live.
              if ('serviceWorker' in navigator && 'caches' in window) {
                // 1) Hapus cache lama, sisakan versi tertinggi pamerproject-vN
                //    (self-maintaining: tidak perlu hardcode nomor versi).
                caches.keys().then(function(keys) {
                  var maxVer = -1, keep = null, regex = /^pamerproject-v(\\d+)$/;
                  for (var i = 0; i < keys.length; i++) {
                    var m = keys[i].match(regex);
                    if (m && parseInt(m[1], 10) > maxVer) { maxVer = parseInt(m[1], 10); keep = keys[i]; }
                  }
                  // Guard: hanya hapus bila ada cache ber-versi (keep !== null),
                  // supaya jangan menghapus cache lain di origin yang tak dikenal.
                  if (keep !== null) {
                    for (var j = 0; j < keys.length; j++) {
                      if (keys[j] !== keep) caches.delete(keys[j]);
                    }
                  }
                }).catch(function() {});
                // 2) Paksa browser cek & pasang service worker terbaru sekarang.
                //    sw.js v3 punya skipWaiting + clients.claim + activate yang
                //    membersihkan cache lama — jadi begitu update() berjalan,
                //    SW baru langsung mengambil alih.
                navigator.serviceWorker.ready.then(function(reg) {
                  reg.update().catch(function() {});
                }).catch(function() {});
              }
            `,
          }}
        />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('gesturestart', function(e) { e.preventDefault(); });
            `,
          }}
        />
      </body>
    </html>
  );
}
