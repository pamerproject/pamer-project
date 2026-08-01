import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { buildSeoMetadata } from "@/lib/seo";
import StaticPageView from "@/components/StaticPageView";

const KEY = "contact";

// Selalu render fresh agar konten yang diedit admin langsung tampil
// (halaman ini membaca DB langsung, bukan client-side fetch).
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await prisma.pageContent
    .findUnique({ where: { id: KEY } })
    .catch(() => null);
  return buildSeoMetadata({
    title: page?.title || "Contact",
    description: page?.content?.slice(0, 160) || undefined,
  });
}

export default async function ContactPage() {
  const page = await prisma.pageContent
    .findUnique({ where: { id: KEY } })
    .catch(() => null);

  return (
    <StaticPageView
      pageKey={KEY}
      title={page?.title || ""}
      content={page?.content || ""}
      published={!!page}
    />
  );
}
