import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { censorFields } from "@/lib/censor";
import { deletePostImages, parsePostImageUrls, deleteImageByUrl } from "@/lib/r2";

function parsePostImage(
  image: string | null
): { images: string[]; linkUrl: string | null; githubUrl: string | null } {
  if (!image) return { images: [], linkUrl: null, githubUrl: null };
  try {
    const parsed = JSON.parse(image);
    if (Array.isArray(parsed)) {
      return { images: parsed, linkUrl: null, githubUrl: null };
    }
    if (parsed && typeof parsed === "object") {
      return {
        images: Array.isArray(parsed.imgs) ? parsed.imgs : [],
        linkUrl: parsed.lnk || null,
        githubUrl: parsed.gh || null,
      };
    }
  } catch {
    // Not JSON — plain URL string
  }
  return { images: [image], linkUrl: null, githubUrl: null };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();

    const post = await prisma.post.findUnique({
      where: { slug },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
        project: {
          select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            tags: true,
            image: true,
            liveUrl: true,
            repoUrl: true,
            visibility: true,
          },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json(
        { message: "auth.postNotFound" },
        { status: 404 }
      );
    }

    if (
      post.type === "project" &&
      post.project?.visibility === "PRIVATE" &&
      post.userId !== session?.user?.id
    ) {
      return NextResponse.json(
        { message: "auth.postNotFound" },
        { status: 404 }
      );
    }

    const parsed = parsePostImage(post.image);

    return NextResponse.json({
      post: {
        ...post,
        images: parsed.images,
        linkUrl: parsed.linkUrl,
        githubUrl: parsed.githubUrl,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "auth.loginRequired" }, { status: 401 });
    }

    const url = new URL(req.url);
    const postId = url.searchParams.get("postId");
    const isRealSlug = slug && slug !== "null" && slug !== "_";
    const where = isRealSlug ? { slug } : postId ? { id: postId } : null;
    if (!where) {
      return NextResponse.json({ message: "auth.postNotFound" }, { status: 404 });
    }
    const post = await prisma.post.findUnique({ where });
    if (!post) {
      return NextResponse.json({ message: "auth.postNotFound" }, { status: 404 });
    }
    if (post.userId !== session.user.id) {
      return NextResponse.json({ message: "auth.notYourPost" }, { status: 403 });
    }

    const body = await req.json();
    const censored = censorFields(body, ['content', 'title', 'description']);

    const updateData: Record<string, unknown> = {};

    if (censored.content !== undefined) {
      updateData.content = (censored.content as string).trim();
    }

    if (censored.title !== undefined) {
      // Update project title too
      if (post.projectId) {
        await prisma.project.update({
          where: { id: post.projectId },
          data: { title: (censored.title as string).trim() },
        });
      }
    }

    if (censored.description !== undefined) {
      if (post.projectId) {
        await prisma.project.update({
          where: { id: post.projectId },
          data: { description: (censored.description as string).trim() || null },
        });
      }
    }

    const { images, linkUrl, githubUrl, tags, visibility } = body;

    // Update project tags & visibility if provided
    if (tags !== undefined && post.projectId) {
      await prisma.project.update({
        where: { id: post.projectId },
        data: { tags },
      });
    }
    if (visibility !== undefined && post.projectId) {
      await prisma.project.update({
        where: { id: post.projectId },
        data: { visibility: visibility as "PUBLIC" | "PRIVATE" },
      });
    }
    if (images !== undefined || linkUrl !== undefined || githubUrl !== undefined) {
      const imgArr: string[] = images || [];
      const data: { imgs?: string[]; lnk?: string; gh?: string } = {};
      if (imgArr.length > 0) data.imgs = imgArr;
      if (linkUrl) data.lnk = linkUrl;
      if (githubUrl) data.gh = githubUrl;
      updateData.image = Object.keys(data).length > 0 ? JSON.stringify(data) : null;

      // Update project image too
      if (post.projectId && imgArr.length > 0) {
        await prisma.project.update({
          where: { id: post.projectId },
          data: { image: imgArr[0] },
        });
      }

      // Hapus dari R2 gambar yang tidak dipakai lagi
      const oldUrls = parsePostImageUrls(post.image);
      const removed = oldUrls.filter((url) => !imgArr.includes(url));
      await Promise.all(removed.map((url) => deleteImageByUrl(url)));
    }

    const updated = await prisma.post.update({
      where,
      data: updateData,
      include: {
        user: { select: { id: true, name: true, username: true, avatar: true } },
        project: {
          select: { id: true, slug: true, title: true, description: true, tags: true, image: true, liveUrl: true, repoUrl: true, visibility: true },
        },
        _count: { select: { comments: true, likes: true } },
      },
    });

    return NextResponse.json({ post: { ...updated, ...parsePostImage(updated.image) } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "auth.loginRequired" }, { status: 401 });
    }

    const url = new URL(req.url);
    const postId = url.searchParams.get("postId");
    const isRealSlug = slug && slug !== "null" && slug !== "_";
    const where = isRealSlug ? { slug } : postId ? { id: postId } : null;
    if (!where) {
      return NextResponse.json({ message: "auth.postNotFound" }, { status: 404 });
    }
    const post = await prisma.post.findUnique({ where });
    if (!post) {
      return NextResponse.json({ message: "auth.postNotFound" }, { status: 404 });
    }
    if (post.userId !== session.user.id) {
      return NextResponse.json({ message: "auth.notYourPost" }, { status: 403 });
    }

    // Hapus gambar dari R2 sebelum hapus record
    await deletePostImages(post.image);

    // Hapus project terkait jika ini postingan project
    // (Post → Project punya onDelete: SetNull, jadi project tidak otomatis terhapus)
    if (post.projectId) {
      await prisma.project.delete({ where: { id: post.projectId } });
    }

    await prisma.post.delete({ where });

    return NextResponse.json({ message: "auth.postDeleted" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}
