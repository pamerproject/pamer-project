import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notif";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "auth.loginRequired" }, { status: 401 });
    }

    // Rate limit (fix S5): maks. 20 kunjungan per user per menit —
    // cegah spam notifikasi VISIT ke user lain.
    const rl = await checkRateLimit(getRateLimitKey(req, `visit:${session.user.id}`), {
      max: 20,
      windowMs: 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { message: "auth.tooManyRequests" },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
        }
      );
    }

    const { username } = await params;
    const target = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!target) {
      return NextResponse.json({ message: "error.userNotFound" }, { status: 404 });
    }

    // Jangan buat notifikasi bila mengunjungi profil sendiri
    if (target.id === session.user.id) {
      return NextResponse.json({ success: true });
    }

    await createNotification({
      type: "VISIT",
      recipientId: target.id,
      actorId: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "error.failedToLoad" }, { status: 500 });
  }
}
