import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { requireVerifiedEmail } from "@/lib/verified";

// POST /api/events/[slug]/join — ikut / batalkan ikut event (toggle)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "auth.loginRequired" }, { status: 401 });
    }

    // Email harus terverifikasi untuk ikut event
    const verifiedError = requireVerifiedEmail(session);
    if (verifiedError) return verifiedError;

    const { slug } = await params;

    const event = await prisma.event.findUnique({
      where: { slug },
      select: { id: true, active: true },
    });
    if (!event) {
      return NextResponse.json({ message: "event.notFound" }, { status: 404 });
    }

    const eventId = event.id;

    const existing = await prisma.eventParticipant.findUnique({
      where: {
        eventId_userId: { eventId, userId: session.user.id },
      },
      select: { id: true },
    });

    // Event nonaktif: blokir join baru, tapi tetap izinkan membatalkan ikut
    if (!event.active && !existing) {
      return NextResponse.json({ message: "event.notActive" }, { status: 400 });
    }

    if (existing) {
      await prisma.eventParticipant.delete({ where: { id: existing.id } });
    } else {
      await prisma.eventParticipant.create({
        data: { eventId, userId: session.user.id },
      });
    }

    const count = await prisma.eventParticipant.count({ where: { eventId } });

    return NextResponse.json({
      joined: !existing,
      participantCount: count,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "auth.errorOccurred";
    return NextResponse.json({ message }, { status: 500 });
  }
}
