import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { censorFields } from "@/lib/censor";
import { deleteImageByUrl } from "@/lib/r2";

const jobInclude = {
  user: {
    select: { id: true, username: true, name: true, avatar: true },
  },
};

function formatJob(job: Record<string, unknown>) {
  return {
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
    postedAt: (job.createdAt as Date).toISOString(),
    createdAt: (job.createdAt as Date).toISOString(),
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await prisma.job.findFirst({
      where: {
        OR: [
          { slug: id },
          { id },
        ],
      },
      include: jobInclude,
    });

    if (!job) {
      return NextResponse.json({ message: "auth.jobNotFound" }, { status: 404 });
    }

    return NextResponse.json({ job: formatJob(job as Record<string, unknown>) });
  } catch {
    return NextResponse.json({ message: "auth.errorOccurred" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "auth.loginRequired" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.job.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: "auth.jobNotFound" }, { status: 404 });
    }
    if (existing.userId !== session.user.id) {
      return NextResponse.json({ message: "auth.notYourJob" }, { status: 403 });
    }

    const oldImage = existing.image;

    const body = await req.json();
    const { title, company, description, location, type, salary, salaryMin, salaryMax, currency, tags, contactEmail, url, image, status } = censorFields(body, ['title', 'company', 'description', 'location', 'salary', 'contactEmail', 'url']);

    const job = await prisma.job.update({
      where: { id },
      data: {
        ...(title?.trim() && { title: title.trim() }),
        ...(company?.trim() && { company: company.trim() }),
        description: description?.trim() || null,
        location: location?.trim() || null,
        type: type?.trim() || null,
        salary: salary?.trim() || null,
        salaryMin: salaryMin != null && salaryMin !== "" && !isNaN(Number(salaryMin)) ? Number(salaryMin) : null,
        salaryMax: salaryMax != null && salaryMax !== "" && !isNaN(Number(salaryMax)) ? Number(salaryMax) : null,
        currency: currency || "IDR",
        tags: Array.isArray(tags) ? tags.slice(0, 10) : existing.tags,
        contactEmail: contactEmail?.trim() || null,
        url: url?.trim() || null,
        image: image?.trim() || null,
        status: status || "PUBLISHED",
      },
      include: jobInclude,
    });

    if (image && image !== oldImage) {
      await deleteImageByUrl(oldImage);
    }

    return NextResponse.json({ job: formatJob(job as Record<string, unknown>) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "auth.loginRequired" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.job.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: "auth.jobNotFound" }, { status: 404 });
    }
    if (existing.userId !== session.user.id) {
      return NextResponse.json({ message: "auth.notYourJob" }, { status: 403 });
    }

    await deleteImageByUrl(existing.image);
    await prisma.job.delete({ where: { id } });
    return NextResponse.json({ message: "auth.jobDeleted" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}