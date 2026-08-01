import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { buildSeoMetadata } from "@/lib/seo";
import { parsePostImageUrls } from "@/lib/r2";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

// SEO per konten: title = judul project, desc = isi konten/deskripsi,
// og = gambar project jika ada, jika tidak ada → default dari settings.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project
    .findUnique({
      where: { slug },
      select: { title: true, slug: true, description: true, content: true, image: true },
    })
    .catch(() => null);

  if (!project) {
    return buildSeoMetadata({ title: "Projects" });
  }

  const ogImage = parsePostImageUrls(project.image)[0] || null;
  const description =
    project.description?.trim() ||
    project.content?.trim() ||
    project.title.trim();

  return buildSeoMetadata({
    title: project.title.trim(),
    description,
    ogImage,
  });
}

export default function ProjectDetailLayout({ children }: Props) {
  return children;
}
