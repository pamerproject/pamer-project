import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/projects — ambil semua project PUBLISHED dengan pagination
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const skip = parseInt(url.searchParams.get("skip") || "0", 10);
    const take = parseInt(url.searchParams.get("take") || "10", 10);

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        skip,
        take,
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
      }),
      prisma.project.count({ where: { status: "PUBLISHED", visibility: "PUBLIC" } }),
    ]);

    return NextResponse.json({ projects, total }, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}
