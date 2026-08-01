import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { cacheHeaders } from "@/lib/cache";
import { censorFields } from "@/lib/censor";
import { requireVerifiedEmail } from "@/lib/verified";
import { isUniqueConstraintError } from "@/lib/username.server";

// ─── GET /api/jobs ─────────────────────────────────────
// Query params: ?skip=0&take=10 or ?page=1&limit=10&userId=xxx (optional filter)
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const skipParam = url.searchParams.get("skip");
    const takeParam = url.searchParams.get("take");
    const pageParam = url.searchParams.get("page");
    const limitParam = url.searchParams.get("limit");
    const userId = url.searchParams.get("userId");

    let skip: number, take: number;
    if (skipParam !== null && takeParam !== null) {
      skip = parseInt(skipParam, 10);
      take = Math.min(50, Math.max(1, parseInt(takeParam, 10)));
    } else {
      const page = Math.max(1, parseInt(pageParam || "1", 10));
      const limit = Math.min(50, Math.max(1, parseInt(limitParam || "10", 10)));
      skip = (page - 1) * limit;
      take = limit;
    }

    const where: Record<string, unknown> = { status: "PUBLISHED" };
    if (userId) where.userId = userId;

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: take,
        include: {
          user: {
            select: { id: true, username: true, name: true, avatar: true },
          },
        },
      }),
      prisma.job.count({ where }),
    ]);

    return NextResponse.json({
      jobs: jobs.map((job) => ({
        id: job.id,
        title: job.title,
        company: job.company,
        slug: job.slug,
        description: job.description,
        location: job.location,
        type: job.type,
        salary: job.salary,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        currency: job.currency,
        tags: job.tags,
        contactEmail: job.contactEmail,
        url: job.url,
        image: job.image,
        status: job.status,
        user: job.user,
        postedAt: job.createdAt.toISOString(),
        createdAt: job.createdAt.toISOString(),
      })),
      pagination: {
        page: Math.floor(skip / take) + 1,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    }, { headers: cacheHeaders(60) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}

// ─── POST /api/jobs ────────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "auth.loginRequired" }, { status: 401 });
    }

    // Email harus terverifikasi untuk memposting lowongan
    const verifiedError = requireVerifiedEmail(session);
    if (verifiedError) return verifiedError;

    const body = await req.json();
    const { title, company, description, location, type, salary, salaryMin, salaryMax, currency, tags, contactEmail, url, image } = censorFields(body, ['title', 'company', 'description', 'location', 'salary', 'contactEmail', 'url']);

    if (!title || !title.trim()) {
      return NextResponse.json({ message: "auth.jobTitleRequired" }, { status: 400 });
    }
    if (!company || !company.trim()) {
      return NextResponse.json({ message: "auth.companyNameRequired" }, { status: 400 });
    }

    // Generate slug from title
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
    const randomSuffix = Math.random().toString(36).slice(2, 6);
    const slug = `${baseSlug}-${randomSuffix}`;

    // Optimistic create + retry saat slug bentrok (fix B2) — kolisi random
    // suffix jarang, tapi tetap di-hardening agar tidak pernah jadi 500.
    const attemptJobCreate = async (s: string) => {
      try {
        return await prisma.job.create({
          data: {
            title: title.trim(),
            company: company.trim(),
            slug: s,
            description: description?.trim() || null,
            location: location?.trim() || null,
            type: type?.trim() || null,
            salary: salary?.trim() || null,
            salaryMin: salaryMin != null && salaryMin !== "" && !isNaN(Number(salaryMin)) ? Number(salaryMin) : null,
            salaryMax: salaryMax != null && salaryMax !== "" && !isNaN(Number(salaryMax)) ? Number(salaryMax) : null,
            currency: currency || "USD",
            tags: Array.isArray(tags) ? tags.slice(0, 10) : [],
            contactEmail: contactEmail?.trim() || null,
            url: url?.trim() || null,
            image: image?.trim() || null,
            status: "PUBLISHED",
            userId: session.user.id,
          },
          include: {
            user: {
              select: { id: true, username: true, name: true, avatar: true },
            },
          },
        });
      } catch (err) {
        if (isUniqueConstraintError(err, ["slug"])) return null;
        throw err;
      }
    };

    let job = await attemptJobCreate(slug);
    for (let i = 1; i < 100 && !job; i++) {
      job = await attemptJobCreate(`${baseSlug}-${randomSuffix}-${i}`);
    }
    if (!job) throw new Error("Gagal membuat slug unik");

    return NextResponse.json({
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
        slug: job.slug,
        description: job.description,
        location: job.location,
        type: job.type,
        salary: job.salary,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        currency: job.currency,
        tags: job.tags,
        contactEmail: job.contactEmail,
        url: job.url,
        image: job.image,
        status: job.status,
        user: job.user,
        postedAt: job.createdAt.toISOString(),
        createdAt: job.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}
