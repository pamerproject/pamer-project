import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const projects = await prisma.project.findMany({
      where: {
        status: "PUBLISHED",
        visibility: "PUBLIC",
        createdAt: { gte: sevenDaysAgo },
      },
      include: {
        user: {
          select: { username: true, avatar: true },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const scored = projects
      .map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        image: p.image,
        tags: p.tags,
        user: { username: p.user.username, avatar: p.user.avatar },
        likes: p._count.likes,
        comments: p._count.comments,
        engagement: p._count.likes + p._count.comments,
      }))
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 5)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    return NextResponse.json({ trending: scored }, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch {
    return NextResponse.json({ trending: [] });
  }
}
