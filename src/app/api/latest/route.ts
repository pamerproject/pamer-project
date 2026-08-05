import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/latest — timestamp konten terbaru (cerita, project, event)
// Dipakai MobileNav untuk menampilkan titik merah "ada yang baru".
// Feed harus fresh — tidak di-cache.
export async function GET() {
  try {
    const [latestStory, latestProject, latestEvent] = await Promise.all([
      prisma.post.findFirst({
        where: { type: "cerita" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.project.findFirst({
        where: { status: "PUBLISHED", visibility: "PUBLIC" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.event.findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    return NextResponse.json({
      latestStory: latestStory?.createdAt.toISOString() ?? null,
      latestProject: latestProject?.createdAt.toISOString() ?? null,
      latestEvent: latestEvent?.createdAt.toISOString() ?? null,
    }, {
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