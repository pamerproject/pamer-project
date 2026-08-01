"use client";

import { useTranslation } from "@/lib/lang";
import Avatar from "./ui/Avatar";

export default function CreatePost() {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
      <div className="flex items-center gap-3">
        <Avatar
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23dc2626' width='100' height='100'/%3E%3Ctext x='50' y='65' text-anchor='middle' fill='white' font-size='40' font-weight='800' font-family='Inter'%3EU%3C/text%3E%3C/svg%3E"
          name="Kamu"
        />
        <button className="flex-1 rounded-full border border-[var(--card-border)] bg-gray-50 px-4 py-2.5 text-left text-sm text-[var(--muted)] hover:bg-gray-100">
          {t("createPost.placeholder")}
        </button>
      </div>
      <div className="mt-3 flex items-center gap-4 border-t border-[var(--card-border)] pt-3">
        <button className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-green-500">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          {t("createPost.photo")}
        </button>
        <button className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-blue-500">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
          {t("createPost.link")}
        </button>
        <button className="ml-auto rounded-lg bg-[var(--brand)] px-5 py-1.5 text-sm font-medium text-white hover:bg-[var(--brand-hover)]">
          {t("createPost.post")}
        </button>
      </div>
    </div>
  );
}
