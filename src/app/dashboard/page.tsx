import { redirect } from "next/navigation";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import DashboardTabs from "@/components/dashboard/DashboardTabs";

export const dynamic = "force-dynamic";

const DAYS = 30;

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function lastNDays(n: number): { key: string; label: string }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({ key: dateKey(d), label: `${d.getDate()}/${d.getMonth() + 1}` });
  }
  return days;
}

export default async function DashboardPage() {
  const session = await auth();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN";

  if (!isAdmin) {
    redirect("/");
  }

  const days = lastNDays(DAYS);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (DAYS - 1));
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const [totalUsers, totalProjects, totalStories, userRows, projectRows, storyRows] =
    await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.post.count({ where: { type: "cerita" } }),
      prisma.user.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { createdAt: true },
      }),
      prisma.project.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { createdAt: true },
      }),
      prisma.post.findMany({
        where: { type: "cerita", createdAt: { gte: start, lte: end } },
        select: { createdAt: true },
      }),
    ]);

  const index = new Map(days.map((d, i) => [d.key, i]));
  const aggregate = (rows: { createdAt: Date }[]): number[] => {
    const counts = days.map(() => 0);
    for (const row of rows) {
      const idx = index.get(dateKey(row.createdAt));
      if (idx !== undefined) counts[idx]++;
    }
    return counts;
  };

  const userCounts = aggregate(userRows);
  const projectCounts = aggregate(projectRows);
  const storyCounts = aggregate(storyRows);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-black leading-tight tracking-tight md:text-xl">
          Dashboard
        </h1>
      </div>

      <DashboardTabs
        totals={{ users: totalUsers, projects: totalProjects, stories: totalStories }}
        trends={{
          users: days.map((d, i) => ({ label: d.label, count: userCounts[i] })),
          projects: days.map((d, i) => ({ label: d.label, count: projectCounts[i] })),
          stories: days.map((d, i) => ({ label: d.label, count: storyCounts[i] })),
        }}
      />
    </div>
  );
}
