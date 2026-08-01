import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

// Hilangkan password dari response user
const userSelect = {
  id: true,
  name: true,
  username: true,
  bio: true,
  avatar: true,
  avatarPosition: true,
  coverImage: true,
  coverPosition: true,
  website: true,
  github: true,
  linkedin: true,
  links: true,
  createdAt: true,
} as const;

// Select post yang dipakai di profile — cerita & project diambil terpisah
// supaya salah satu tipe tidak tertelan oleh take 10 terbaru.
const postSelect = {
  id: true,
  slug: true,
  content: true,
  image: true,
  createdAt: true,
  type: true,
  projectId: true,
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
    select: { comments: true, likes: true },
  },
} as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const session = await auth();
    const isOwner = session?.user?.id === (await prisma.user.findUnique({ where: { username }, select: { id: true } }))?.id;

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        ...userSelect,
        _count: {
          select: {
            posts: {
              where: { type: "cerita" },
            },
            projects: {
              where: isOwner ? {} : { visibility: "PUBLIC" },
            },
            likes: true,
            jobs: true,
          },
        },
        projects: {
          where: { pinned: true, ...(isOwner ? {} : { visibility: "PUBLIC" }) },
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            image: true,
            tags: true,
            liveUrl: true,
            repoUrl: true,
            _count: { select: { comments: true, likes: true } },
          },
        },
        jobs: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            title: true,
            company: true,
            slug: true,
            description: true,
            location: true,
            type: true,
            salary: true,
            salaryMin: true,
            salaryMax: true,
            currency: true,
            tags: true,
            image: true,
            contactEmail: true,
            url: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "error.userNotFound" },
        { status: 404 }
      );
    }

    // Cerita & project diambil TERPISAH (masing-masing 10 terbaru),
    // bukan 10 post terbaru gabungan. Tanpa ini, project bisa tenggelam
    // di bawah banyak cerita dan tidak pernah muncul di profile.
    const [ceritaPosts, projectPosts] = await Promise.all([
      prisma.post.findMany({
        where: { userId: user.id, type: "cerita" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: postSelect,
      }),
      prisma.post.findMany({
        where: {
          userId: user.id,
          type: "project",
          ...(isOwner ? {} : { project: { visibility: "PUBLIC" } }),
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: postSelect,
      }),
    ]);

    const mergedPosts = [...ceritaPosts, ...projectPosts].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    const enrichedPosts = await Promise.all(mergedPosts.map(async (post) => {
      let comments = post._count.comments;
      let likes = post._count.likes;
      if (post.projectId) {
        const [pc, pl] = await Promise.all([
          prisma.comment.count({ where: { projectId: post.projectId } }),
          prisma.like.count({ where: { projectId: post.projectId } }),
        ]);
        comments += pc;
        likes = pl;
      }
      return { ...post, _count: { comments, likes } };
    }));

    return NextResponse.json({ user: { ...user, posts: enrichedPosts } });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "auth.errorOccurred";
    return NextResponse.json({ message }, { status: 500 });
  }
}
