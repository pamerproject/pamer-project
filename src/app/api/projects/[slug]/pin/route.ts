import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "auth.loginRequired" }, { status: 401 });
    }

    const { slug } = await params;

    const project = await prisma.project.findUnique({
      where: slug === "_" ? { id: _req.nextUrl.searchParams.get("projectId")! } : { slug },
      select: { id: true, userId: true, pinned: true },
    });

    if (!project) {
      return NextResponse.json({ message: "auth.projectNotFound" }, { status: 404 });
    }

    if (project.userId !== session.user.id) {
      return NextResponse.json({ message: "auth.forbidden" }, { status: 403 });
    }

    if (project.pinned) {
      const updated = await prisma.project.update({
        where: { id: project.id },
        data: { pinned: false },
        select: { id: true, pinned: true },
      });
      return NextResponse.json({ project: updated });
    }

    const pinnedCount = await prisma.project.count({
      where: { userId: session.user.id, pinned: true },
    });

    if (pinnedCount >= 5) {
      return NextResponse.json(
        { message: "rightSidebar.maxPinnedWarning" },
        { status: 400 }
      );
    }

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { pinned: true },
      select: { id: true, pinned: true },
    });

    return NextResponse.json({ project: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}
