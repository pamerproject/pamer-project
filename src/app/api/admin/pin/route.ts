import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    return { ok: false, status: 403 };
  }

  return { ok: true };
}

// GET /api/admin/pin — ambil project & cerita yang sedang di-pin
export async function GET() {
  try {
    const authResult = await requireAdmin();
    if (!authResult.ok) {
      return NextResponse.json({ message: "auth.forbidden" }, { status: authResult.status });
    }

    const [projectPost, post] = await Promise.all([
      prisma.post.findFirst({
        where: { type: "project", pinned: true, project: { visibility: "PUBLIC" } },
        select: {
          project: {
            select: {
              id: true,
              title: true,
              slug: true,
              description: true,
              image: true,
              tags: true,
            },
          },
          user: {
            select: { name: true, username: true, avatar: true },
          },
        },
      }),
      prisma.post.findFirst({
        where: { type: "cerita", pinned: true },
        select: {
          id: true,
          slug: true,
          content: true,
          image: true,
          pinned: true,
          user: {
            select: { name: true, username: true, avatar: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      project: projectPost?.project
        ? { ...projectPost.project, type: "project", user: projectPost.user }
        : null,
      post: post ? { ...post, type: "cerita" } : null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.ok) {
      return NextResponse.json({ message: "auth.forbidden" }, { status: authResult.status });
    }

    const body = await req.json();
    const { id, type } = body as { id?: string; type?: string };

    if (!id || !type || !["project", "post"].includes(type)) {
      return NextResponse.json(
        { message: "settings.pinTypeRequired" },
        { status: 400 }
      );
    }

    if (type === "project") {
      // Pin lewat Post (bukan Project.pinned) agar tidak bentrok dengan fitur pin profil user
      const existingPinned = await prisma.post.findFirst({
        where: { type: "project", pinned: true },
        select: { id: true },
      });
      if (existingPinned) {
        await prisma.post.update({
          where: { id: existingPinned.id },
          data: { pinned: false },
        });
      }
      const project = await prisma.project.findUnique({ where: { id } });
      if (!project) {
        return NextResponse.json({ message: "auth.projectNotFound" }, { status: 404 });
      }
      // Pastikan project punya Post (untuk project lama yang tidak punya Post)
      let projectPost = await prisma.post.findFirst({
        where: { type: "project", projectId: id },
        select: { id: true },
      });
      if (!projectPost) {
        projectPost = await prisma.post.create({
          data: {
            type: "project",
            content: "",
            projectId: id,
            userId: project.userId,
          },
          select: { id: true },
        });
      }
      await prisma.post.update({
        where: { id: projectPost.id },
        data: { pinned: true },
      });
      return NextResponse.json({
        item: {
          id: project.id,
          title: project.title,
          slug: project.slug,
          description: project.description,
          image: project.image,
          tags: project.tags,
          type: "project",
        },
      });
    }

    // type === "post" — pin cerita
    const existingPinnedPost = await prisma.post.findFirst({
      where: { type: "cerita", pinned: true },
      select: { id: true },
    });
    if (existingPinnedPost) {
      await prisma.post.update({
        where: { id: existingPinnedPost.id },
        data: { pinned: false },
      });
    }

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post || post.type !== "cerita") {
      return NextResponse.json({ message: "auth.postNotFound" }, { status: 404 });
    }
    const updated = await prisma.post.update({
      where: { id },
      data: { pinned: true },
      select: {
        id: true,
        slug: true,
        content: true,
        image: true,
        pinned: true,
        user: {
          select: { name: true, username: true, avatar: true },
        },
      },
    });
    return NextResponse.json({ item: { ...updated, type: "cerita" } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}

// DELETE /api/admin/pin?type=project|post — unpin per tipe
// DELETE /api/admin/pin — unpin semua
export async function DELETE(req: NextRequest) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.ok) {
      return NextResponse.json({ message: "auth.forbidden" }, { status: authResult.status });
    }

    const url = new URL(req.url);
    const type = url.searchParams.get("type");

    if (type === "project") {
      await prisma.post.updateMany({ where: { type: "project", pinned: true }, data: { pinned: false } });
    } else if (type === "post" || type === "cerita") {
      await prisma.post.updateMany({ where: { type: "cerita", pinned: true }, data: { pinned: false } });
    } else {
      await prisma.post.updateMany({ where: { pinned: true }, data: { pinned: false } });
    }

    return NextResponse.json({ success: true, message: "settings.pinCleared" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}
