import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { buildSeoMetadata } from "@/lib/seo";
import { parsePostImageUrls } from "@/lib/r2";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

// SEO per konten: title = slug cerita (dibersihkan dari suffix angka),
// desc = isi konten, og = gambar cerita jika ada → jika tidak ada default.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.post
    .findUnique({
      where: { slug },
      select: { slug: true, content: true, image: true },
    })
    .catch(() => null);

  if (!post) {
    return buildSeoMetadata({ title: "Stories" });
  }

  // Bersihkan suffix "-1234" dari slug lalu kapitalisasi tiap kata
  // agar title tag rapi (mis. "Membuat Website Company Profile")
  const title =
    (post.slug || "Story")
      .replace(/-\d+$/, "")
      .replace(/-/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase()) || "Story";

  const ogImage = parsePostImageUrls(post.image)[0] || null;
  const description = post.content.trim();

  return buildSeoMetadata({
    title,
    description,
    ogImage,
  });
}

export default function PostDetailLayout({ children }: Props) {
  return children;
}
