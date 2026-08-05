import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";

const DEFAULT_SEO = {
  title: "PamerProject.com | Pamerkan Projectmu, Bangun Relasi dan Temukan Peluang!",
  description:
    "PamerProject adalah platform sosial untuk memamerkan project, membangun portofolio, dan terhubung dengan sesama kreator dari seluruh Indonesia. Punya project? Jangan disimpan sendiri — pamerkan, dapatkan feedback, bangun relasi, dan temukan peluang baru di sini!",
  keywords: "pamerproject, pamer project, portofolio, developer indonesia, project showcase, kreator, komunitas IT",
  ogImage: null as string | null,
  favicon: null as string | null,
};

// SEO settings di-cache (tag "seo-settings") — di-invalidate lewat
// revalidateTag() saat admin menyimpan di Dashboard → Pengaturan.
export const getSeoSettings = unstable_cache(
  async () => {
    try {
      const s = await prisma.seoSettings.findUnique({
        where: { id: "singleton" },
      });
      return s;
    } catch {
      return null;
    }
  },
  ["seo-settings"],
  { tags: ["seo-settings"], revalidate: 3600 }
);

export interface SeoMetadataOptions {
  /** Judul spesifik halaman (tanpa suffix brand). Default: judul dari settings. */
  title?: string;
  /** Deskripsi spesifik. Default: deskripsi utama dari settings. */
  description?: string;
  /** Gambar OG spesifik konten. Default: ogImage dari settings. */
  ogImage?: string | null;
}

/**
 * Bangun Metadata untuk halaman.
 *
 * - Halaman list (mis. /projects): cukup `{ title: "Projects" }` — description
 *   dan ogImage otomatis memakai nilai default dari settings.
 * - Halaman konten (mis. /project/[slug]): beri title + description konten dan
 *   ogImage gambar konten — jika tidak ada gambar, otomatis pakai default.
 */
export async function buildSeoMetadata(opts: SeoMetadataOptions = {}): Promise<Metadata> {
  const settings = (await getSeoSettings()) || DEFAULT_SEO;
  const settingsTitle = settings.title || DEFAULT_SEO.title;
  const settingsDesc = settings.description || DEFAULT_SEO.description;
  const settingsKeywords = settings.keywords || DEFAULT_SEO.keywords;
  const settingsOg = settings.ogImage || DEFAULT_SEO.ogImage;
  const favicon = settings.favicon || null;

  const title = opts.title?.trim() || settingsTitle;
  const description = opts.description?.trim() || settingsDesc;
  const keywords = settingsKeywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  const ogImage = opts.ogImage || settingsOg || null;

  return {
    title,
    description,
    keywords,
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title,
    },
    icons: {
      // Apple touch icon tetap PNG (iOS tidak mendukung webp untuk ini)
      apple: "/icon-180.png",
      ...(favicon ? { icon: [{ url: favicon }] } : {}),
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "id_ID",
      siteName: "PamerProject",
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}
