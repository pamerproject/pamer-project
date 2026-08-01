import type { Metadata } from "next";
import { buildSeoMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  // Title = nama link menu; desc & og otomatis memakai default dari settings.
  return buildSeoMetadata({ title: "Projects" });
}

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
