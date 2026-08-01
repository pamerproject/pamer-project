import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "auth.loginRequired" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    // Cari komentar + post-nya
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: { post: { select: { userId: true } } },
    });
    if (!comment) {
      return NextResponse.json({ message: "auth.commentNotFound" }, { status: 404 });
    }

    // Hanya pemilik post yang bisa pin komentar
    if (!comment.post || comment.post.userId !== userId) {
      return NextResponse.json({ message: "auth.onlyPostOwnerCanPin" }, { status: 403 });
    }

    // Toggle pin
    const updated = await prisma.comment.update({
      where: { id },
      data: { pinned: !comment.pinned },
    });

    return NextResponse.json({ pinned: updated.pinned });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}
