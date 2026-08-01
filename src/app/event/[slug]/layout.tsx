import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { buildSeoMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

// SEO per konten: title = judul event, desc = deskripsi event,
// og = gambar event jika ada, jika tidak ada → default dari settings.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await prisma.event
    .findUnique({
      where: { slug },
      select: { title: true, description: true, image: true },
    })
    .catch(() => null);

  if (!event) {
    return buildSeoMetadata({ title: "Events" });
  }

  return buildSeoMetadata({
    title: event.title.trim(),
    description: event.description.trim(),
    ogImage: event.image || null,
  });
}

export default function EventDetailLayout({ children }: Props) {
  return children;
}
