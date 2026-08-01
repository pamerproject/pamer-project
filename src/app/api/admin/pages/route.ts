import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { censorFields } from "@/lib/censor";

// Key halaman statis yang dikelola admin (About, Privacy, Terms, Contact)
const PAGE_KEYS = ["about", "privacy", "terms", "contact"] as const;
type PageKey = (typeof PAGE_KEYS)[number];

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

// GET /api/admin/pages — ambil semua konten halaman statis (khusus admin)
export async function GET() {
  try {
    const authResult = await requireAdmin();
    if (!authResult.ok) {
      return NextResponse.json({ message: "auth.forbidden" }, { status: authResult.status });
    }

    const rows = await prisma.pageContent.findMany({
      orderBy: { id: "asc" },
    });

    // Selalu kembalikan keempat key (kosong jika belum dibuat) agar UI
    // konsisten — form create & edit jadi satu.
    const pages = PAGE_KEYS.map((key) => {
      const row = rows.find((r) => r.id === key);
      return {
        key,
        title: row?.title || "",
        content: row?.content || "",
        updatedAt: row?.updatedAt.toISOString() || null,
      };
    });

    return NextResponse.json({ pages });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}

// PUT /api/admin/pages — simpan konten satu halaman (upsert, khusus admin)
export async function PUT(req: NextRequest) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.ok) {
      return NextResponse.json({ message: "auth.forbidden" }, { status: authResult.status });
    }

    const body = await req.json();
    const { title, content } = censorFields(body, ["title", "content"]);

    const key = body.key as string;
    if (!PAGE_KEYS.includes(key as PageKey)) {
      return NextResponse.json({ message: "contentTab.unknownPage" }, { status: 400 });
    }
    if (!title || !title.trim()) {
      return NextResponse.json({ message: "contentTab.titleRequired" }, { status: 400 });
    }
    if (!content || !content.trim()) {
      return NextResponse.json({ message: "contentTab.contentRequired" }, { status: 400 });
    }

    const page = await prisma.pageContent.upsert({
      where: { id: key },
      update: {
        title: title.trim(),
        content: content.trim(),
      },
      create: {
        id: key,
        title: title.trim(),
        content: content.trim(),
      },
    });

    return NextResponse.json({
      page: {
        key,
        title: page.title,
        content: page.content,
        updatedAt: page.updatedAt.toISOString(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "contentTab.saveFailed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
