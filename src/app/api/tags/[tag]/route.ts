import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cacheHeaders } from "@/lib/cache";

// GET /api/tags/[tag] — ambil semua project (PUBLISHED & PUBLIC) yang memakai
// tag tersebut, dengan pagination + lazy loading.
// Pencocokan tag case-insensitive: tag di DB bisa campur huruf besar/kecil,
// sedangkan sidebar menampilkan tag dalam huruf kecil (lihat /api/tags).
export async function GET(
  req: Request,
  { params }: { params: Promise<{ tag: string }> }
) {
  try {
    const { tag } = await params;
    const url = new URL(req.url);
    const skip = parseInt(url.searchParams.get("skip") || "0", 10);
    const take = parseInt(url.searchParams.get("take") || "10", 10);

    const needle = decodeURIComponent(tag).toLowerCase().trim();

    const projects = await prisma.project.findMany({
      where: { status: "PUBLISHED", visibility: "PUBLIC" },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });

    // Filter case-insensitive: proyek dianggap cocok jika ada salah satu
    // tag miliknya yang sama persis (setelah dinormalkan) dengan tag dicari.
    const matched = projects.filter((p) =>
      p.tags.some((t) => t.toLowerCase().trim() === needle)
    );

    const total = matched.length;

    return NextResponse.json(
      { projects: matched.slice(skip, skip + take), total },
      { headers: cacheHeaders(300) }
    );
  } catch {
    return NextResponse.json({ projects: [], total: 0 }, { headers: cacheHeaders(300) });
  }
}