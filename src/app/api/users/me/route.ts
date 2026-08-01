import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ user: null });
    }

    const [user, pwCheck] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          bio: true,
          avatar: true,
          avatarPosition: true,
          coverImage: true,
          coverPosition: true,
          website: true,
          github: true,
          linkedin: true,
          links: true,
          projects: {
            where: { pinned: true },
            orderBy: { updatedAt: "desc" },
            take: 5,
            select: {
              id: true,
              title: true,
              description: true,
              image: true,
              tags: true,
              liveUrl: true,
              repoUrl: true,
            },
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { password: true },
      }),
    ]);

    return NextResponse.json({
      user: user
        ? { ...user, hasPassword: pwCheck?.password !== null }
        : null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "auth.errorOccurred";
    return NextResponse.json({ message }, { status: 500 });
  }
}
