import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { noStoreHeaders } from "@/lib/cache";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "auth.loginRequired" }, { status: 401 });
    }

    const userId = session.user.id;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        actor: { select: { id: true, username: true, name: true, avatar: true } },
      },
    });

    const postIds = notifications.filter(n => n.postId).map(n => n.postId!);
    const projectIds = notifications.filter(n => n.projectId).map(n => n.projectId!);

    const [posts, projects] = await Promise.all([
      postIds.length ? prisma.post.findMany({ where: { id: { in: postIds } }, select: { id: true, slug: true, content: true, project: { select: { title: true } } } }) : [],
      projectIds.length ? prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, slug: true, title: true } }) : [],
    ]);

    const postMap = new Map(posts.map(p => [p.id, p]));
    const projectMap = new Map(projects.map(p => [p.id, p]));

    const enriched = notifications.map((n) => {
      const post = n.postId ? postMap.get(n.postId) : null;
      const project = n.projectId ? projectMap.get(n.projectId) : null;

      return {
        ...n,
        postTitle: post?.content?.slice(0, 60) || post?.project?.title || null,
        postSlug: post?.slug || null,
        projectTitle: project?.title || null,
        projectSlug: project?.slug || null,
      };
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, read: false },
    });

    // Data notifikasi PRIBADI per user — jangan pernah di-cache CDN publik
    // (tanpa Vary: Cookie, respons user lain bisa bocor ke user ini).
    return NextResponse.json({ notifications: enriched, unreadCount }, { headers: noStoreHeaders() });
  } catch {
    return NextResponse.json({ message: "auth.failedToLoadNotifications" }, { status: 500 });
  }
}

export async function PATCH() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "auth.loginRequired" }, { status: 401 });
    }

    await prisma.notification.updateMany({
      where: { userId: session.user.id, read: false },
      data: { read: true },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "auth.failedToUpdateNotifications" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "auth.loginRequired" }, { status: 401 });
    }

    await prisma.notification.deleteMany({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "auth.failedToDeleteNotifications" }, { status: 500 });
  }
}
