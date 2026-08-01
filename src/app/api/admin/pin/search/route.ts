import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/admin/pin/search?type=project|post&q=...
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "auth.loginRequired" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ message: "auth.forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const type = url.searchParams.get("type");

    if (!q) {
      return NextResponse.json({ items: [] });
    }

    const projectQuery = () =>
      prisma.project.findMany({
        where: {
          title: { contains: q, mode: "insensitive" },
          visibility: "PUBLIC",
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          title: true,
          slug: true,
          image: true,
          description: true,
          tags: true,
          user: {
            select: { name: true, username: true, avatar: true },
          },
        },
      });

    const storyQuery = () =>
      prisma.post.findMany({
        where: {
          type: "cerita",
          content: { contains: q, mode: "insensitive" },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          slug: true,
          content: true,
          image: true,
          user: {
            select: { name: true, username: true, avatar: true },
          },
        },
      });

    if (type === "project") {
      const items = await projectQuery();
      return NextResponse.json({ items: items.map((i) => ({ ...i, type: "project" })) });
    }

    if (type === "post") {
      const items = await storyQuery();
      return NextResponse.json({ items: items.map((i) => ({ ...i, type: "cerita" })) });
    }

    // Tanpa param type → cari project & cerita sekaligus
    const [projects, stories] = await Promise.all([projectQuery(), storyQuery()]);
    return NextResponse.json({
      items: [
        ...projects.map((i) => ({ ...i, type: "project" })),
        ...stories.map((i) => ({ ...i, type: "cerita" })),
      ],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}
