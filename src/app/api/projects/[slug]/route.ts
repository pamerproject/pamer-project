import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { cacheHeaders } from "@/lib/cache";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();
    const userId = session?.user?.id;

    const project = await prisma.project.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
        AND: userId
          ? [{ OR: [{ visibility: "PUBLIC" }, { userId }] }]
          : [{ visibility: "PUBLIC" }],
      },
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
          select: { likes: true, comments: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ message: "auth.projectNotFound" }, { status: 404 });
    }

    // Parse images dari Post yang terasosiasi
    let images: string[] = [];
    let linkUrl: string | null = null;
    let githubUrl: string | null = null;
    try {
      const post = await prisma.post.findFirst({
        where: { projectId: project.id },
        select: { image: true },
      });
      if (post?.image) {
        const parsed = JSON.parse(post.image);
        if (Array.isArray(parsed)) {
          images = parsed;
        } else if (parsed && typeof parsed === "object") {
          images = Array.isArray(parsed.imgs) ? parsed.imgs : [];
          linkUrl = parsed.lnk || null;
          githubUrl = parsed.gh || null;
        }
      }
    } catch {
      // Not JSON — fallback to project.image
      if (project.image) images = [project.image];
    }

    // Fallback: jika parsing gagal atau tidak ada Post, pakai project.image
    if (images.length === 0 && project.image) {
      images = [project.image];
    }

    // Cek apakah user sudah like
    let isLiked = false;
    if (userId) {
      const like = await prisma.like.findUnique({
        where: { userId_projectId: { userId, projectId: project.id } },
        select: { id: true },
      });
      isLiked = !!like;
    }

    return NextResponse.json({
      project: {
        ...project,
        images,
        linkUrl,
        githubUrl,
        isLiked,
      },
    }, { headers: cacheHeaders(30) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}
