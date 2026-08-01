import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ─── Validation ──────────────────────────────────────

function sanitizeQuery(input: string): string {
  // Hapus karakter berbahaya, hanya izinkan alfanumerik, spasi, @, #
  return input
    .replace(/[<>"'\\(){}|;`$]/g, "")  // Hapus karakter yang bisa dipakai XSS/SQLi
    .trim()
    .slice(0, 200); // Batasi panjang maksimal
}

// ─── GET /api/search?q=...&more=true ─────────────────

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const rawQuery = url.searchParams.get("q") || "";
    const isMore = url.searchParams.get("more") === "true";

    const query = sanitizeQuery(rawQuery);

    // Minimal 3 karakter
    if (query.length < 3) {
      return NextResponse.json({ results: [], total: 0 });
    }

    // Per-type limits: initial = 5 per type, "more" = 15 per type
    const limit = isMore ? 15 : 5;
    const userLimit = isMore ? 10 : 3;

    // ── Cari Users ──
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { username: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        bio: true,
      },
      take: userLimit,
    });

    // ── Cari Projects ──
    const projects = await prisma.project.findMany({
      where: {
        status: "PUBLISHED",
        visibility: "PUBLIC",
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        image: true,
        tags: true,
        liveUrl: true,
        repoUrl: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // ── Cari Posts (Cerita) ──
    const posts = await prisma.post.findMany({
      where: {
        type: "cerita",
        content: { contains: query, mode: "insensitive" },
      },
      select: {
        id: true,
        content: true,
        slug: true,
        image: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // ── Cari Jobs ──
    const jobs = await prisma.job.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { company: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
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
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Truncate descriptions
    const truncate = (text: string | null | undefined, max = 120) => {
      if (!text) return "";
      return text.length > max ? text.slice(0, max) + "..." : text;
    };

    const results = [
      ...users.map((u) => ({
        type: "user" as const,
        id: u.id,
        title: u.name || u.username,
        subtitle: "@" + u.username,
        description: truncate(u.bio),
        image: u.avatar,
        href: `/u/${u.username}`,
      })),
      ...projects.map((p) => ({
        type: "project" as const,
        id: p.id,
        title: p.title,
        subtitle: "oleh " + (p.user.name || p.user.username),
        description: truncate(p.description),
        image: p.image,
        tags: p.tags,
        href: `/project/${p.slug || p.id}`,
      })),
      ...posts.map((po) => ({
        type: "post" as const,
        id: po.id,
        title: truncate(po.content, 80),
        subtitle: "oleh " + (po.user.name || po.user.username),
        description: truncate(po.content, 150),
        image: null as string | null,
        href: `/post/${po.slug || po.id}`,
      })),
      ...jobs.map((j) => ({
        type: "job" as const,
        id: j.id,
        title: j.title,
        subtitle: j.company,
        description: truncate(j.description) + (j.location ? " — " + j.location : ""),
        image: j.image || j.user.avatar,
        href: `/freelance/${j.slug || j.id}`,
      })),
    ];

    return NextResponse.json({
      results,
      total: results.length,
      // Kasih flag apakah masih ada kemungkinan hasil lebih banyak
      // True jika salah satu kategori mencapai limit-nya
      hasMore: projects.length >= limit || posts.length >= limit || jobs.length >= limit,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}
