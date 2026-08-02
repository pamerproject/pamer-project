import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
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
              document.addEventListener('gesturestart', function(e) { e.preventDefault(); });
            `,
          }}
        />
      </body>
    </html>
  );
}
