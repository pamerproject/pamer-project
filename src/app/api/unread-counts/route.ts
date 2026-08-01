import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const defaultSince = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const berandaSince = url.searchParams.get("beranda") ? new Date(parseInt(url.searchParams.get("beranda")!)) : defaultSince;
  const projectsSince = url.searchParams.get("projects") ? new Date(parseInt(url.searchParams.get("projects")!)) : defaultSince;

  const [newPosts, newProjects, totalJobs, totalActiveEvents] = await Promise.all([
    prisma.post.count({ where: { createdAt: { gte: berandaSince } } }),
    prisma.project.count({ where: { createdAt: { gte: projectsSince }, status: "PUBLISHED" } }),
    prisma.job.count({ where: { status: "PUBLISHED" } }),
    prisma.event.count({ where: { active: true } }),
  ]);

  return NextResponse.json({
    beranda: newPosts + newProjects,
    projects: newProjects,
    jobs: totalJobs,
    events: totalActiveEvents,
  });
}
