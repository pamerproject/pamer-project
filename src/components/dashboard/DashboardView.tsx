"use client";

import { useTranslation } from "@/lib/lang";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  type TooltipValueType,
} from "recharts";

export interface TrendPoint {
  label: string;
  count: number;
}

interface DashboardViewProps {
  totals: { users: number; projects: number; stories: number };
  trends: {
    users: TrendPoint[];
    projects: TrendPoint[];
    stories: TrendPoint[];
  };
}

const COLORS = {
  users: "#ef4444",
  projects: "#3b82f6",
  stories: "#10b981",
};

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="card-app rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}1a`, color }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{label}</p>
          <p className="text-2xl font-black text-[var(--foreground)]">{value.toLocaleString("id-ID")}</p>
        </div>
      </div>
    </div>
  );
}

function TrendChart({
  title,
  data,
  color,
}: {
  title: string;
  data: TrendPoint[];
  color: string;
}) {
  const tickCount = Math.min(6, data.length);
  return (
    <div className="card-app rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
      <h3 className="text-sm font-bold text-[var(--foreground)]">{title}</h3>
      <div className="mt-4 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--muted)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--card-border)" }}
              interval={Math.ceil(data.length / tickCount)}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10, fill: "var(--muted)" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ stroke: "var(--card-border)" }}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--card-border)",
                borderRadius: "0.75rem",
                fontSize: "12px",
                color: "var(--foreground)",
              }}
              labelStyle={{ color: "var(--muted)" }}
              formatter={(value: TooltipValueType | undefined) =>
                [Number(Array.isArray(value) ? value[0] : (value ?? 0)).toLocaleString("id-ID"), title]
              }
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke={color}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function DashboardView({ totals, trends }: DashboardViewProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label={t("dashboard.users")}
          value={totals.users}
          color={COLORS.users}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          }
        />
        <StatCard
          label={t("dashboard.projects")}
          value={totals.projects}
          color={COLORS.projects}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
          }
        />
        <StatCard
          label={t("dashboard.stories")}
          value={totals.stories}
          color={COLORS.stories}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          }
        />
      </div>

      <TrendChart title={t("dashboard.trendUsers")} data={trends.users} color={COLORS.users} />
      <TrendChart title={t("dashboard.trendProjects")} data={trends.projects} color={COLORS.projects} />
      <TrendChart title={t("dashboard.trendStories")} data={trends.stories} color={COLORS.stories} />
    </div>
  );
}
