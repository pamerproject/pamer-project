import type { Metadata } from "next";
import { buildSeoMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  // Title = nama link menu; desc & og otomatis memakai default dari settings.
  return buildSeoMetadata({ title: "Events" });
}

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
