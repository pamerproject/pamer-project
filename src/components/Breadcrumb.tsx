"use client";

import Link from "next/link";

interface Segment {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  segments: Segment[];
}

export default function Breadcrumb({ segments }: BreadcrumbProps) {
  return (
    <div className="mb-4 flex items-center gap-2 text-sm text-[var(--muted)]">
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span>/</span>}
          {seg.href ? (
            <Link href={seg.href} className="hover:text-[var(--brand)] transition-colors">
              {seg.label}
            </Link>
          ) : (
            <span className="truncate text-[var(--foreground)] max-w-[200px]">{seg.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}
