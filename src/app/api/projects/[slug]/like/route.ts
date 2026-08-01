import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notif";
import { requireVerifiedEmail } from "@/lib/verified";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "auth.loginRequired" }, { status: 401 });
    }

    // Email harus terverifikasi untuk memberi mantap
    const verifiedError = requireVerifiedEmail(session);
    if (verifiedError) return verifiedError;

    const { slug } = await params;
    const project = await prisma.project.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      select: { id: true, userId: true },
    });
    if (!project) {
      return NextResponse.json({ message: "auth.projectNotFound", status: 404 });
    }

    const userId = session.user.id;

    const { liked, count } = await prisma.$transaction(async (tx) => {
      const existing = await tx.like.findUnique({
        where: { userId_projectId: { userId, projectId: project.id } },
      });

      if (existing) {
        await tx.like.delete({ where: { id: existing.id } });
        await tx.like.deleteMany({
          where: { userId, post: { projectId: project.id } },
        });
      } else {
        await tx.like.create({ data: { userId, projectId: project.id } });
        const linkedPost = await tx.post.findFirst({
          where: { projectId: project.id },
          select: { id: true },
        });
        if (linkedPost) {
          await tx.like.upsert({
            where: { userId_postId: { userId, postId: linkedPost.id } },
            create: { userId, postId: linkedPost.id },
            update: {},
          });
        }
      }

      const count = await tx.like.count({ where: { projectId: project.id } });
      return { liked: !existing, count };
    });

    if (liked) {
      await createNotification({
        type: "LIKE", recipientId: project.userId, actorId: userId, projectId: project.id,
      });
    }

    return NextResponse.json({ liked, count });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}
