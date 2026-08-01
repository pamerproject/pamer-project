import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notif";
import { censorFields } from "@/lib/censor";
import { requireVerifiedEmail } from "@/lib/verified";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const url = new URL(req.url);
    const skip = parseInt(url.searchParams.get("skip") || "0", 10);
    const take = parseInt(url.searchParams.get("take") || "10", 10);

    const project = await prisma.project.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ message: "auth.projectNotFound" }, { status: 404 });
    }

    const session = await auth();
    const userId = session?.user?.id;

    const totalComments = await prisma.comment.count({
      where: { projectId: project.id, parentId: null },
    });

    const comments = await prisma.comment.findMany({
      where: { projectId: project.id, parentId: null },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      skip: skip > 0 ? skip : 0,
      take,
      include: {
        user: {
          select: { id: true, name: true, username: true, avatar: true },
        },
        replies: {
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: { id: true, name: true, username: true, avatar: true },
            },
            _count: { select: { likes: true } },
            likes: userId
              ? { where: { userId }, select: { id: true } }
              : false,
          },
        },
        _count: { select: { likes: true } },
        likes: userId
          ? { where: { userId }, select: { id: true } }
          : false,
      },
    });

    const formatted = comments.map((c) => ({
      ...c,
      isLiked: Array.isArray(c.likes) ? c.likes.length > 0 : false,
      likes: undefined,
      replies: c.replies.map((r) => ({
        ...r,
        isLiked: Array.isArray(r.likes) ? r.likes.length > 0 : false,
        likes: undefined,
      })),
    }));

    return NextResponse.json({ comments: formatted, total: totalComments });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
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

    // Email harus terverifikasi untuk berkomentar
    const verifiedError = requireVerifiedEmail(session);
    if (verifiedError) return verifiedError;

    const { slug } = await params;
    const project = await prisma.project.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      select: { id: true, userId: true },
    });
    if (!project) {
      return NextResponse.json({ message: "auth.projectNotFound" }, { status: 404 });
    }

    const body = await req.json();
    const { content, parentId, ogTitle, ogDescription, ogImage, ogSiteName } = censorFields(body, ['content', 'ogTitle', 'ogDescription', 'ogSiteName']);

    if (!content?.trim()) {
      return NextResponse.json({ message: "auth.commentCannotBeEmpty" }, { status: 400 });
    }

    let parentUserId: string | null = null;
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { id: true, projectId: true, parentId: true, userId: true },
      });
      if (!parentComment || parentComment.projectId !== project.id) {
        return NextResponse.json({ message: "auth.parentCommentNotFound" }, { status: 400 });
      }
      if (parentComment.parentId !== null) {
        return NextResponse.json(
          { message: "auth.cannotReplyToReply" },
          { status: 400 }
        );
      }
      parentUserId = parentComment.userId;
    }

    // Sanitasi OG metadata — trim & batasi panjang
    const sanitizeStr = (v: string | undefined, maxLen = 500): string | null =>
      v ? String(v).trim().slice(0, maxLen) : null;

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        userId: session.user.id,
        projectId: project.id,
        parentId: parentId || null,
        ogTitle: sanitizeStr(ogTitle, 300),
        ogDescription: sanitizeStr(ogDescription, 500),
        ogImage: sanitizeStr(ogImage, 1000),
        ogSiteName: sanitizeStr(ogSiteName, 200),
      },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatar: true },
        },
        _count: { select: { likes: true } },
      },
    });

    await createNotification({
      type: "COMMENT", recipientId: project.userId, actorId: session.user.id, projectId: project.id,
    });

    if (parentUserId && parentUserId !== session.user.id) {
      await createNotification({
        type: "REPLY", recipientId: parentUserId, actorId: session.user.id, projectId: project.id,
      });
    }

    return NextResponse.json({
      comment: {
        ...comment,
        isLiked: false,
        replies: [],
      },
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}
