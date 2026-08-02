import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "@radix-ui/*"],
  },
  async headers() {
    return [
      {
        // Kritis untuk PWA: browser TIDAK boleh meng-cache sw.js berlama-lama,
        // karena itu menghambat deteksi update service worker (sebelumnya
        // max-age 14400 = 4 jam → HP user tetap pakai SW lama).
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
      {
        // Manifest selalu direvalidasi agar ikon/nama terbaru cepat diambil.
        source: "/manifest.json",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
