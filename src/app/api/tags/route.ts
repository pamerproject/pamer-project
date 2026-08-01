import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cacheHeaders } from "@/lib/cache";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      where: { status: "PUBLISHED", visibility: "PUBLIC" },
      select: { tags: true },
    });

    const tagCount = new Map<string, number>();
    for (const p of projects) {
      const seen = new Set<string>();
      for (const tag of p.tags) {
        const key = tag.toLowerCase().trim();
        if (key && !seen.has(key)) {
          seen.add(key);
          tagCount.set(key, (tagCount.get(key) || 0) + 1);
        }
      }
    }

    const tags = Array.from(tagCount.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return NextResponse.json({ tags }, { headers: cacheHeaders(300) });
  } catch {
    return NextResponse.json({ tags: [] }, { headers: cacheHeaders(300) });
  }
}
