import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const session = await auth();
    const url = new URL(req.url);
    const skip = parseInt(url.searchParams.get("skip") || "0", 10);
    const take = parseInt(url.searchParams.get("take") || "10", 10);
    const type = url.searchParams.get("type"); // "cerita" | "project" — pagination per tipe

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { message: "error.userNotFound" },
        { status: 404 }
      );
    }

    const isOwner = session?.user?.id === user.id;

    // Pagination per tipe: profil memuat cerita & project terpisah,
    // jadi load-more juga harus per tipe agar tidak saling menenggelamkan.
    const baseWhere: Record<string, unknown> = { userId: user.id };
    if (type === "cerita") {
      baseWhere.type = "cerita";
    } else if (type === "project") {
      baseWhere.type = "project";
      if (!isOwner) baseWhere.project = { visibility: "PUBLIC" };
    } else if (!isOwner) {
      baseWhere.OR = [
        { type: "cerita" },
        { project: { visibility: "PUBLIC" } },
      ];
    }

    const posts = await prisma.post.findMany({
      where: baseWhere,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        slug: true,
        content: true,
        image: true,
        createdAt: true,
        type: true,
        projectId: true,
        project: {
          select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            tags: true,
            image: true,
            liveUrl: true,
            repoUrl: true,
          },
        },
        _count: {
          select: { comments: true, likes: true },
        },
      },
    });

    return NextResponse.json({ posts });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "auth.errorOccurred";
    return NextResponse.json({ message }, { status: 500 });
  }
}
