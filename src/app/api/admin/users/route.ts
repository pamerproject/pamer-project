import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const PAGE_SIZE = 20;

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

// GET /api/admin/users?skip=0&take=20 — daftar user terdaftar (khusus admin)
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.ok) {
      return NextResponse.json({ message: "auth.forbidden" }, { status: authResult.status });
    }

    const sp = req.nextUrl.searchParams;
    const skip = Math.max(0, parseInt(sp.get("skip") || "0", 10) || 0);
    const take = Math.min(50, Math.max(1, parseInt(sp.get("take") || String(PAGE_SIZE), 10) || PAGE_SIZE));

    const users = await prisma.user.findMany({
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        role: true,
        createdAt: true,
      },
    });

    const hasMore = users.length === take;

    return NextResponse.json({
      users: users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      })),
      hasMore,
    });
  } catch (err) {
    console.error("Failed to load admin users:", err);
    return NextResponse.json({ message: "error.failedToLoad" }, { status: 500 });
  }
}
