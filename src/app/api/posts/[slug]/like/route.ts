import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notif";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { cacheHeaders } from "@/lib/cache";
import { requireVerifiedEmail } from "@/lib/verified";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ liked: false });
    }

    const { slug } = await params;

    const post = await prisma.post.findFirst({
      where: { OR: [{ id: slug }, { slug }] },
      select: { id: true },
    });
    if (!post) {
      return NextResponse.json({ liked: false });
    }

    const existing = await prisma.like.findUnique({
      where: { userId_postId: { userId: session.user.id, postId: post.id } },
    });

    return NextResponse.json({ liked: !!existing }, { headers: cacheHeaders(5) });
  } catch {
    return NextResponse.json({ liked: false }, { headers: cacheHeaders(5) });
  }
}

export async function POST(
  req: Request,
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

    const { allowed } = await checkRateLimit(getRateLimitKey(req, "like"), { max: 30, windowMs: 60_000 });
    if (!allowed) {
      return NextResponse.json({ message: "auth.tooManyRequests" }, { status: 429 });
    }

    const { slug } = await params;

    const post = await prisma.post.findFirst({
      where: { OR: [{ id: slug }, { slug }] },
      select: { id: true, userId: true, projectId: true },
    });
    if (!post) {
      return NextResponse.json({ message: "auth.postNotFound" }, { status: 404 });
    }

    const userId = session.user.id;

    const { liked, count } = await prisma.$transaction(async (tx) => {
      const existing = await tx.like.findUnique({
        where: { userId_postId: { userId, postId: post.id } },
      });

      if (existing) {
        await tx.like.delete({ where: { id: existing.id } });
        if (post.projectId) {
          await tx.like.deleteMany({ where: { userId, projectId: post.projectId } });
        }
      } else {
        await tx.like.create({ data: { userId, postId: post.id } });
        if (post.projectId) {
          await tx.like.upsert({
            where: { userId_projectId: { userId, projectId: post.projectId } },
            create: { userId, projectId: post.projectId },
            update: {},
          });
        }
      }

      const count = await tx.like.count({ where: { postId: post.id } });
      return { liked: !existing, count };
    });

    if (liked) {
      await createNotification({
        type: "LIKE", recipientId: post.userId, actorId: userId, postId: post.id,
      });
    }

    return NextResponse.json({ liked, count });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}
