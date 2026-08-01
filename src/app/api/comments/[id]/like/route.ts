import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { censorFields } from "@/lib/censor";
import { requireVerifiedEmail } from "@/lib/verified";

// Helper: cek session + kepemilikan
async function checkOwnership(commentId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ message: "auth.loginRequired" }, { status: 401 }) };
  }
  const comment = await prisma.comment.findUnique({ where: { id: commentId }, select: { userId: true } });
  if (!comment) {
    return { error: NextResponse.json({ message: "auth.commentNotFound" }, { status: 404 }) };
  }
  if (comment.userId !== session.user.id) {
    return { error: NextResponse.json({ message: "auth.notYourComment" }, { status: 403 }) };
  }
  return { session, userId: session.user.id };
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "auth.loginRequired" }, { status: 401 });
    }

    // Email harus terverifikasi untuk memberi mantap
    const verifiedError = requireVerifiedEmail(session);
    if (verifiedError) return verifiedError;

    const { id } = await params;
    const userId = session.user.id;

    const comment = await prisma.comment.findUnique({ where: { id }, select: { id: true } });
    if (!comment) {
      return NextResponse.json({ message: "auth.commentNotFound" }, { status: 404 });
    }

    const { liked, count } = await prisma.$transaction(async (tx) => {
      const existing = await tx.commentLike.findUnique({
        where: { userId_commentId: { userId, commentId: id } },
      });

      if (existing) {
        await tx.commentLike.delete({ where: { id: existing.id } });
      } else {
        await tx.commentLike.create({ data: { userId, commentId: id } });
      }

      const count = await tx.commentLike.count({ where: { commentId: id } });
      return { liked: !existing, count };
    });

    return NextResponse.json({ liked, count });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const owner = await checkOwnership(id);
    if ("error" in owner) return owner.error;

    const body = await req.json();
    const { content } = censorFields(body, ['content']);

    if (!content?.trim()) {
      return NextResponse.json({ message: "auth.contentCannotBeEmpty" }, { status: 400 });
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: { content: content.trim(), editedAt: new Date() },
    });

    return NextResponse.json({ comment: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const owner = await checkOwnership(id);
    if ("error" in owner) return owner.error;

    await prisma.comment.update({
      where: { id },
      data: { deleted: true, content: "[dihapus]" },
    });

    return NextResponse.json({ deleted: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}
