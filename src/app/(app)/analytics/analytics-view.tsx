"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RefreshCw, X as CloseIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

// Categorical palette, fixed order, validated (six checks, light+dark): X then LinkedIn.
const SERIES_COLORS: Record<string, string> = {
  X: "#8B5CF6",
  LINKEDIN: "#0891B2",
};
const SINGLE_HUE = "#8B5CF6";

export type PostRow = {
  id: string;
  content: string;
  platforms: string[];
  publishedAt: string | null;
  impressions: number;
  engagements: number;
  perPlatform: Record<
    string,
    {
      impressions: number;
      engagements: number;
      likes: number;
      replies: number;
      reposts: number;
      clicks: number;
    }
  >;
};

export type DayPoint = { day: string; impressions: number };
export type PlatformRate = { platform: string; rate: number };

type SortKey = "content" | "impressions" | "engagements" | "rate" | "publishedAt";

function rateOf(row: PostRow): number {
  return row.impressions > 0 ? (row.engagements / row.impressions) * 100 : 0;
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--popover-foreground))",
  fontSize: 12,
};

export function AnalyticsView({
  rows,
  dayPoints,
  platformRates,
}: {
  rows: PostRow[];
  dayPoints: DayPoint[];
  platformRates: PlatformRate[];
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("publishedAt");
  const [sortDesc, setSortDesc] = useState(true);
  const [detail, setDetail] = useState<PostRow | null>(null);

  const totalImpressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  const totalEngagements = rows.reduce((sum, row) => sum + row.engagements, 0);
  const bestPost = rows.reduce<PostRow | null>(
    (best, row) => (best === null || row.impressions > best.impressions ? row : best),
    null,
  );
  const avgRate = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0;

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "content") cmp = a.content.localeCompare(b.content);
      else if (sortKey === "impressions") cmp = a.impressions - b.impressions;
      else if (sortKey === "engagements") cmp = a.engagements - b.engagements;
      else if (sortKey === "rate") cmp = rateOf(a) - rateOf(b);
      else cmp = (a.publishedAt ?? "").localeCompare(b.publishedAt ?? "");
      return sortDesc ? -cmp : cmp;
    });
    return copy;
  }, [rows, sortKey, sortDesc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDesc((d) => !d);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  async function sync() {
    setSyncing(true);
    toast.info("Syncing analytics…");
    try {
      const res = await fetch("/api/analytics/sync", { method: "POST" });
      const data = (await res.json()) as { synced?: number; errors?: string[]; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Sync failed. Try again.");
        return;
      }
      toast.success(`Synced ${data.synced ?? 0} platform snapshot(s).`);
      if (data.errors && data.errors.length > 0) {
        toast.error(`${data.errors.length} fetch(es) failed — see server logs.`);
      }
      router.refresh();
    } catch {
      toast.error("Sync failed. Try again.");
    } finally {
      setSyncing(false);
    }
  }

  const empty = rows.length === 0;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Last 7 days of published posts.</p>
        </div>
        <button
          onClick={sync}
          disabled={syncing}
          className="flex h-12 items-center gap-2 rounded-md border border-border px-4 text-sm hover:bg-secondary disabled:opacity-50"
        >
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Sync Analytics
        </button>
      </div>

      {empty ? (
        <div className="mt-10 rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          Start posting to see analytics.
        </div>
      ) : (
        <>
          {/* Stat tiles */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Impressions (7d)", value: totalImpressions.toLocaleString() },
              { label: "Engagements (7d)", value: totalEngagements.toLocaleString() },
              {
                label: "Best post",
                value: bestPost ? bestPost.impressions.toLocaleString() : "—",
                sub: bestPost
                  ? bestPost.content.slice(0, 40) + (bestPost.content.length > 40 ? "…" : "")
                  : undefined,
              },
              { label: "Avg engagement rate", value: `${avgRate.toFixed(1)}%` },
            ].map((tile, index) => (
              <div
                key={tile.label}
                style={{ animationDelay: `${index * 50}ms` }}
                className="card-lift animate-fade-in-up rounded-xl border border-border bg-card p-4"
              >
                <p className="text-xs text-muted-foreground">{tile.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{tile.value}</p>
                {tile.sub && <p className="mt-1 truncate text-xs text-muted-foreground">{tile.sub}</p>}
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-medium">Impressions — last 7 days</p>
              <div className="mt-3 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayPoints} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip cursor={{ fill: "hsl(var(--secondary))" }} contentStyle={tooltipStyle} />
                    <Bar
                      dataKey="impressions"
                      fill={SINGLE_HUE}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-medium">Engagement rate by platform</p>
              <div className="mt-3 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platformRates} margin={{ top: 20, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis
                      dataKey="platform"
                      tickFormatter={(v: string) => (v === "LINKEDIN" ? "LinkedIn" : v)}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      unit="%"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--secondary))" }}
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => [`${value}%`, "Engagement rate"]}
                    />
                    <Bar
                      dataKey="rate"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={48}
                      label={{ position: "top", fill: "hsl(var(--muted-foreground))", fontSize: 12, formatter: (v: number) => `${v}%` }}
                    >
                      {platformRates.map((entry) => (
                        <Cell key={entry.platform} fill={SERIES_COLORS[entry.platform] ?? SINGLE_HUE} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex gap-4">
                {platformRates.map((entry) => (
                  <span key={entry.platform} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: SERIES_COLORS[entry.platform] ?? SINGLE_HUE }}
                    />
                    {entry.platform === "LINKEDIN" ? "LinkedIn" : "X"}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Performance table */}
          <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  {(
                    [
                      ["content", "Content"],
                      ["impressions", "Impressions"],
                      ["engagements", "Engagements"],
                      ["rate", "Rate"],
                      ["publishedAt", "Posted at"],
                    ] as [SortKey, string][]
                  ).map(([key, label]) => (
                    <th key={key} className="px-4 py-3">
                      <button onClick={() => toggleSort(key)} className="hover:text-foreground">
                        {label}
                        {sortKey === key && <span className="ml-1">{sortDesc ? "↓" : "↑"}</span>}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setDetail(row)}
                    className="cursor-pointer border-b border-border/50 last:border-0 hover:bg-secondary/50"
                  >
                    <td className="max-w-[280px] truncate px-4 py-3">{row.content.slice(0, 50)}</td>
                    <td className="px-4 py-3 tabular-nums">{row.impressions.toLocaleString()}</td>
                    <td className="px-4 py-3 tabular-nums">{row.engagements.toLocaleString()}</td>
                    <td className="px-4 py-3 tabular-nums">{rateOf(row).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.publishedAt ? new Date(row.publishedAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Detail modal */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold">Post detail</h2>
              <button
                onClick={() => setDetail(null)}
                aria-label="Close"
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 whitespace-pre-wrap rounded-md bg-secondary/50 p-3 text-sm">
              {detail.content}
            </p>
            <div className="mt-4 space-y-3">
              {Object.entries(detail.perPlatform).map(([platform, metrics]) => (
                <div key={platform} className="rounded-md border border-border p-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: SERIES_COLORS[platform] ?? SINGLE_HUE }}
                    />
                    {platform === "LINKEDIN" ? "LinkedIn" : "X"}
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground sm:grid-cols-6">
                    {(
                      [
                        ["Impr.", metrics.impressions],
                        ["Engage.", metrics.engagements],
                        ["Likes", metrics.likes],
                        ["Replies", metrics.replies],
                        ["Reposts", metrics.reposts],
                        ["Clicks", metrics.clicks],
                      ] as const
                    ).map(([label, value]) => (
                      <span key={label} className={cn("flex flex-col")}>
                        <span>{label}</span>
                        <span className="font-medium tabular-nums text-foreground">
                          {value.toLocaleString()}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {Object.keys(detail.perPlatform).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No synced metrics yet — hit Sync Analytics.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
