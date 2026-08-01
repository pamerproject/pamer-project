import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { censorArray, censorFields } from "@/lib/censor";
import { composeDurationLabel, durationToMs, parseEventDuration } from "@/lib/eventDuration";

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

  return { ok: true, userId: session.user.id };
}

// Helper: generate slug unik dari judul event
async function generateUniqueEventSlug(title: string): Promise<string> {
  let slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!slug) slug = "event";

  let finalSlug = slug;
  let counter = 0;
  while (true) {
    const existing = await prisma.event.findUnique({ where: { slug: finalSlug } });
    if (!existing) break;
    counter++;
    finalSlug = `${slug}-${counter}`;
  }

  return finalSlug;
}

// GET /api/events — daftar event untuk sidebar (dengan jumlah peserta + status diikuti)
export async function GET(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    const events = await prisma.event.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { participants: true } },
      },
    });

    // Id event yang sedang diikuti user (untuk badge "Diikuti")
    let joinedIds = new Set<string>();
    if (userId) {
      const rows = await prisma.eventParticipant.findMany({
        where: { userId },
        select: { eventId: true },
      });
      joinedIds = new Set(rows.map((r) => r.eventId));
    }

    return NextResponse.json({
      events: events.map((ev) => ({
        id: ev.id,
        slug: ev.slug,
        title: ev.title,
        description: ev.description,
        image: ev.image,
        badge: ev.badge,
        duration: ev.duration,
        durationValue: ev.durationValue,
        durationUnit: ev.durationUnit,
        endsAt: ev.endsAt ? ev.endsAt.toISOString() : null,
        active: ev.active,
        participantCount: ev._count.participants,
        joined: joinedIds.has(ev.id),
        createdAt: ev.createdAt.toISOString(),
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}

// POST /api/events — buat event baru (khusus admin)
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.ok) {
      return NextResponse.json({ message: "auth.forbidden" }, { status: authResult.status });
    }

    const body = await req.json();
    const { title, description, image, badge, duration, period } = censorFields(body, ["title", "description", "badge", "duration", "period"]);
    // Status aktif default true; hanya terima boolean eksplisit
    const active = typeof body.active === "boolean" ? body.active : true;

    // Sensor array konten item-by-item (censorFields hanya proses field string)
    const howTo = censorArray(body.howTo);
    const requirements = censorArray(body.requirements);
    const prizes = censorArray(body.prizes);

    // Durasi terstruktur: angka + satuan (hari/minggu/bulan) → hitung endsAt
    const parsedDuration = parseEventDuration(body.durationValue, body.durationUnit);
    const durationLabel = parsedDuration
      ? composeDurationLabel(parsedDuration.value, parsedDuration.unit)
      : duration?.trim() || "";
    const endsAt = parsedDuration
      ? new Date(Date.now() + durationToMs(parsedDuration.value, parsedDuration.unit))
      : null;

    if (!title || !title.trim()) {
      return NextResponse.json({ message: "event.createTitleRequired" }, { status: 400 });
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ message: "event.createDescriptionRequired" }, { status: 400 });
    }
    if (!durationLabel) {
      return NextResponse.json({ message: "event.createDurationRequired" }, { status: 400 });
    }

    const slug = await generateUniqueEventSlug(title.trim());

    const event = await prisma.event.create({
      data: {
        title: title.trim(),
        slug,
        description: description.trim(),
        image: image?.trim() || null,
        badge: badge?.trim() || "Lomba",
        duration: durationLabel,
        durationValue: parsedDuration?.value ?? null,
        durationUnit: parsedDuration?.unit ?? null,
        endsAt,
        active,
        period: period?.trim() || "",
        howTo,
        requirements,
        prizes,
        userId: authResult.userId!,
      },
    });

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
        participantCount: 0,
        joined: false,
        createdAt: event.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}
