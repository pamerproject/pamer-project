"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/lang";
import DashboardView from "./DashboardView";
import EventTab from "./EventTab";
import SeoTab from "./SeoTab";
import ContentTab from "./ContentTab";
import type { TrendPoint } from "./DashboardView";

type Tab = "statistic" | "event" | "setting";

interface DashboardTabsProps {
  totals: { users: number; projects: number; stories: number };
  trends: {
    users: TrendPoint[];
    projects: TrendPoint[];
    stories: TrendPoint[];
  };
}

export default function DashboardTabs({ totals, trends }: DashboardTabsProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("statistic");

  const tabs: { key: Tab; label: string }[] = [
    { key: "statistic", label: t("dashboard.tabStatistic") },
    { key: "event", label: t("dashboard.tabEvent") },
    { key: "setting", label: t("dashboard.tabSetting") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex border-b border-[var(--card-border)]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative flex-1 px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === tab.key
                ? "text-[var(--brand)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand)]" />
            )}
          </button>
        ))}
      </div>

      {activeTab === "statistic" && <DashboardView totals={totals} trends={trends} />}

      {activeTab === "event" && <EventTab />}

      {activeTab === "setting" && (
        <div className="space-y-6">
          <SeoTab />
          <div className="border-t border-dashed border-[var(--card-border)] pt-6">
            <ContentTab />
          </div>
        </div>
      )}
    </div>
  );
}
