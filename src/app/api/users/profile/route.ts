import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { censorFields } from "@/lib/censor";
import { deleteImageByUrl } from "@/lib/r2";

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "auth.loginRequired" }, { status: 401 });
    }

    const body = await req.json();
    const { name, bio, website, github, linkedin, links, avatar, avatarPosition, coverImage, coverPosition } = censorFields(body, ['name', 'bio', 'website', 'github', 'linkedin']);

    // Validasi posisi — dukung format baru "position:zoom" (e.g. "center:150")
    const VALID_POSITIONS = ["top", "center", "bottom"];
    const isValidPosition = (val: string) => {
      const base = val.split(":")[0];
      return VALID_POSITIONS.includes(base);
    };
    if (avatarPosition !== undefined && !isValidPosition(avatarPosition)) {
      return NextResponse.json({ message: "auth.invalidPosition" }, { status: 400 });
    }
    if (coverPosition !== undefined && !isValidPosition(coverPosition)) {
      return NextResponse.json({ message: "auth.invalidPosition" }, { status: 400 });
    }

    // Hanya update field yang dikirim
    const data: Record<string, string | null> = {};

    if (name !== undefined) data.name = name;
    if (bio !== undefined) data.bio = bio;
    if (website !== undefined) data.website = website;
    if (github !== undefined) data.github = github;
    if (linkedin !== undefined) data.linkedin = linkedin;
    if (links !== undefined) data.links = links;
    if (avatar !== undefined) data.avatar = avatar;
    if (avatarPosition !== undefined) data.avatarPosition = avatarPosition;
    if (coverImage !== undefined) data.coverImage = coverImage;
    if (coverPosition !== undefined) data.coverPosition = coverPosition;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ message: "auth.noDataToUpdate" }, { status: 400 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatar: true, coverImage: true },
    });

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: {
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
      },
    });

    if (avatar !== undefined && avatar !== currentUser?.avatar) {
      await deleteImageByUrl(currentUser?.avatar);
    }
    if (coverImage !== undefined && coverImage !== currentUser?.coverImage) {
      await deleteImageByUrl(currentUser?.coverImage);
    }

    return NextResponse.json({ user });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "auth.errorOccurred";
    return NextResponse.json({ message }, { status: 500 });
  }
}
