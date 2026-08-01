import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { censorArray, censorFields } from "@/lib/censor";
import { composeDurationLabel, durationToMs, parseEventDuration } from "@/lib/eventDuration";
import { deleteImageByUrl } from "@/lib/r2";

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

// GET /api/events/[slug] — detail event + peserta (maks 20) + status diikuti
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();
    const userId = session?.user?.id;

    const event = await prisma.event.findUnique({
      where: { slug },
      include: {
        participants: {
          orderBy: { createdAt: "asc" },
          take: 20,
          include: {
            user: {
              select: { name: true, username: true, avatar: true },
            },
          },
        },
        _count: { select: { participants: true } },
      },
    });

    if (!event) {
      return NextResponse.json({ message: "event.notFound" }, { status: 404 });
    }

    const joined = userId
      ? await prisma.eventParticipant.findUnique({
          where: {
            eventId_userId: { eventId: event.id, userId },
          },
          select: { id: true },
        })
      : null;

    return NextResponse.json({
      event: {
        id: event.id,
        slug: event.slug,
        title: event.title,
        description: event.description,
        image: event.image,
        badge: event.badge,
        duration: event.duration,
        durationValue: event.durationValue,
        durationUnit: event.durationUnit,
        endsAt: event.endsAt ? event.endsAt.toISOString() : null,
        active: event.active,
        period: event.period,
        howTo: event.howTo,
        requirements: event.requirements,
        prizes: event.prizes,
        participantCount: event._count.participants,
        joined: !!joined,
        participants: event.participants.map((p) => ({
          name: p.user.name || p.user.username,
          username: p.user.username,
          avatar: p.user.avatar,
        })),
        createdAt: event.createdAt.toISOString(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}

// DELETE /api/events/[slug] — hapus event (khusus admin)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.ok) {
      return NextResponse.json({ message: "auth.forbidden" }, { status: authResult.status });
    }

    const { slug } = await params;

    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) {
      return NextResponse.json({ message: "event.notFound" }, { status: 404 });
    }

    await deleteImageByUrl(event.image);
    await prisma.event.delete({ where: { id: event.id } });

    return NextResponse.json({ success: true, message: "event.deletedSuccess" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}

// PUT /api/events/[slug] — perbarui event (khusus admin)
// Slug tetap dipertahankan agar link yang sudah ada (detail, join, sidebar) tidak rusak.
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.ok) {
      return NextResponse.json({ message: "auth.forbidden" }, { status: authResult.status });
    }

    const { slug } = await params;

    const existing = await prisma.event.findUnique({ where: { slug } });
    if (!existing) {
      return NextResponse.json({ message: "event.notFound" }, { status: 404 });
    }

    const body = await req.json();
    const { title, description, image, badge, duration, period } = censorFields(body, ["title", "description", "badge", "duration", "period"]);
    // Status aktif: default pertahankan nilai existing, terima boolean eksplisit
    const active = typeof body.active === "boolean" ? body.active : existing.active;

    // Sensor array konten item-by-item (sama seperti POST)
    const howTo = censorArray(body.howTo);
    const requirements = censorArray(body.requirements);
    const prizes = censorArray(body.prizes);

    // Durasi terstruktur: hitung ulang endsAt HANYA jika durasi benar-benar berubah
    // (mis. edit judul/deskripsi saja → countdown tidak di-reset)
    const parsedDuration = parseEventDuration(body.durationValue, body.durationUnit);
    const durationChanged =
      !!parsedDuration &&
      (existing.durationValue !== parsedDuration.value ||
        existing.durationUnit !== parsedDuration.unit);

    const durationLabel =
      durationChanged && parsedDuration
        ? composeDurationLabel(parsedDuration.value, parsedDuration.unit)
        : duration?.trim() || existing.duration;
    const endsAt =
      durationChanged && parsedDuration
        ? new Date(Date.now() + durationToMs(parsedDuration.value, parsedDuration.unit))
        : existing.endsAt;

    if (!title || !title.trim()) {
      return NextResponse.json({ message: "event.createTitleRequired" }, { status: 400 });
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ message: "event.createDescriptionRequired" }, { status: 400 });
    }
    if (!durationLabel) {
      return NextResponse.json({ message: "event.createDurationRequired" }, { status: 400 });
    }

    const newImage = image?.trim() || null;

    const event = await prisma.event.update({
      where: { id: existing.id },
      data: {
        title: title.trim(),
        description: description.trim(),
        image: newImage,
        badge: badge?.trim() || existing.badge,
        duration: durationLabel,
        durationValue: durationChanged && parsedDuration ? parsedDuration.value : existing.durationValue,
        durationUnit: durationChanged && parsedDuration ? parsedDuration.unit : existing.durationUnit,
        endsAt,
        active,
        period: period?.trim() || "",
        howTo,
        requirements,
        prizes,
      },
    });

    // Hapus gambar lama dari R2 SETELAH update sukses (hindari referensi rusak jika update gagal)
    if (existing.image && existing.image !== newImage) {
      await deleteImageByUrl(existing.image);
    }

    return NextResponse.json({
      event: {
        id: event.id,
        slug: event.slug,
        title: event.title,
        description: event.description,
        image: event.image,
        badge: event.badge,
        duration: event.duration,
        durationValue: event.durationValue,
        durationUnit: event.durationUnit,
        endsAt: event.endsAt ? event.endsAt.toISOString() : null,
        active: event.active,
        period: event.period,
        howTo: event.howTo,
        requirements: event.requirements,
        prizes: event.prizes,
        createdAt: event.createdAt.toISOString(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}
