import { NextResponse } from "next/server";

interface FreelanceJob {
  id: string;
  title: string;
  description: string;
  url: string;
  budget: string | null;
  skills: string[];
  type: string | null;
  bids: number;
  avgBid: number | null;
  currency: string | null;
  timeLeft: string | null;
  postedAt: string;
}

interface HimalayasJob {
  id?: string;
  title?: string;
  description?: string;
  url?: string;
  applyUrl?: string;
  salary?: SalaryValue;
  currency?: string;
  tags?: unknown[];
  commitment?: string;
  type?: string;
  remote?: boolean;
  publishedAt?: string;
  createdAt?: string;
}

type SalaryValue = number | string | { min?: number; max?: number } | null;

// ─── Himalayas API (gratis, tanpa auth) ──────────────

async function fetchJobs(): Promise<FreelanceJob[]> {
  try {
    const res = await fetch("https://himalayas.app/jobs/api", {
      next: { revalidate: 600 }, // cache 10 menit
    });

    if (!res.ok) return [];
    const data: unknown = await res.json();

    // Himalayas returns: { jobs: [{ id, title, description, url, company, ... }] }
    const raw = data as { jobs?: unknown };
    const jobs = raw.jobs || data || [];

    // If it's an array directly
    const jobList: HimalayasJob[] = Array.isArray(jobs) ? (jobs as HimalayasJob[]) : [];

    return jobList.slice(0, 20).map((j) => ({
      id: `himalayas-${j.id || Math.random().toString(36).slice(2)}`,
      title: j.title?.trim() || "",
      description: j.description?.trim()?.slice(0, 300) || j.title || "",
      url: j.url || j.applyUrl || "",
      budget: j.salary ? formatSalary(j.salary, j.currency) : null,
      skills: extractTechnologies(j.title || "", j.description || "", j.tags || []),
      type: j.commitment || j.type || (j.remote ? "Remote" : "Freelance"),
      bids: 0,
      avgBid: null,
      currency: null,
      timeLeft: null,
      postedAt: j.publishedAt || j.createdAt || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

// ─── Helpers ──────────────────────────────────────────

function formatSalary(salary: SalaryValue, currency?: string): string | null {
  if (!salary) return null;
  const curr = currency || "USD";
  const sym = curr === "IDR" ? "Rp" : "$";

  if (typeof salary === "number") return `${sym}${salary.toLocaleString()}`;
  if (typeof salary === "string") {
    const num = parseInt(salary.replace(/[^0-9]/g, ""));
    if (num) return `${sym}${num.toLocaleString()}`;
    return salary;
  }
  if (salary.min && salary.max) {
    return `${sym}${salary.min.toLocaleString()} - ${sym}${salary.max.toLocaleString()}`;
  }
  if (salary.min) return `${sym}${salary.min.toLocaleString()}+`;
  if (salary.max) return `Up to ${sym}${salary.max.toLocaleString()}`;
  return null;
}

function extractTechnologies(title: string, description: string, tags: unknown[]): string[] {
  const techs = new Set<string>();

  // From tags
  tags.forEach((tag) => {
    if (typeof tag === "string" && tag.trim()) techs.add(tag.trim());
  });

  // From title + description
  const common = [
    "React", "Angular", "Vue", "Next.js", "Node.js", "TypeScript",
    "JavaScript", "Python", "Go", "Rust", "Ruby", "PHP", "Java",
    "Kotlin", "Swift", "Flutter", "React Native", "Docker",
    "AWS", "GCP", "Azure", "GraphQL", "REST", "API",
    "PostgreSQL", "MongoDB", "Redis", "SQL", "NoSQL",
    "Tailwind", "SASS", "CSS", "HTML", "Figma", "UI/UX",
    "Machine Learning", "AI", "Data Science", "DevOps",
    "Blockchain", "Web3", "Solidity", "Smart Contract",
  ];

  const text = `${title} ${description}`;
  common.forEach((tech) => {
    if (text.toLowerCase().includes(tech.toLowerCase())) {
      techs.add(tech);
    }
  });

  return Array.from(techs).slice(0, 5);
}

// ─── GET ────────────────────────────────────────────────

export async function GET() {
  try {
    const jobs = await fetchJobs();
    return NextResponse.json({ jobs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "error.failedToLoad";
    return NextResponse.json({ message }, { status: 500 });
  }
}
