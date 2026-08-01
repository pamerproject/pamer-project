import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { deleteImageByUrl, deletePostImages } from "@/lib/r2";

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "auth.loginRequired" }, { status: 401 });
    }

    const { username } = await req.json();
    if (!username || typeof username !== "string") {
      return NextResponse.json({ error: "auth.usernameRequired" }, { status: 400 });
    }

    // Verifikasi user & username cocok
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "error.userNotFound" }, { status: 404 });
    }
    if (user.username !== username.trim()) {
      return NextResponse.json({ error: "settings.usernameMismatch" }, { status: 400 });
    }

    // Hapus gambar dari R2 sebelum akun dihapus
    await deleteImageByUrl(user.avatar);
    await deleteImageByUrl(user.coverImage);

    const userPosts = await prisma.post.findMany({
      where: { userId },
      select: { image: true },
    });
    await Promise.all(userPosts.map(p => deletePostImages(p.image)));

    // Hapus user (cascade akan menghapus semua data terkait)
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ deleted: true });
  } catch (err: unknown) {
    console.error("[DELETE ACCOUNT ERROR]", err);
    return NextResponse.json({ error: "settings.deleteError" }, { status: 500 });
  }
}
