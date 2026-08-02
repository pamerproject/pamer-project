"use client";

import { useTranslation } from "@/lib/lang";
import Breadcrumb from "@/components/Breadcrumb";
import renderContent from "@/lib/renderContent";

interface StaticPageViewProps {
  pageKey: string;
  title: string;
  content: string;
  published: boolean;
}

export default function StaticPageView({ pageKey, title, content, published }: StaticPageViewProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <Breadcrumb
        segments={[
          { label: t("sidebar.home"), href: "/" },
          { label: title || t(`contentTab.${pageKey}`) },
        ]}
      />

      <div className="card-app rounded-2xl border border-[var(--card-border)] bg-[var(--card)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--card-border)] px-6 py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-light)]">
            <svg className="h-5 w-5 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              {pageKey === "about" && (
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              )}
              {pageKey === "privacy" && (
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              )}
              {pageKey === "terms" && (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
              {pageKey === "contact" && (
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              )}
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-black leading-tight tracking-tight md:text-2xl">
              {title || t(`contentTab.${pageKey}`)}
            </h1>
            <p className="text-xs text-[var(--muted)]">{t(`contentTab.${pageKey}`)}</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {published ? (
            <div className="prose-sm max-w-none text-sm leading-relaxed text-[var(--foreground)] whitespace-pre-wrap break-words">
              {renderContent(content, false)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-light)]">
                <svg className="h-8 w-8 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold">{t("staticPage.emptyTitle")}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{t("staticPage.emptyDesc")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
