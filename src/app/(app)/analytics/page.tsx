import { PostStatus } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AnalyticsView, type PostRow, type DayPoint, type PlatformRate } from "./analytics-view";

export default async function AnalyticsPage() {
  const user = await requireAuth();
  const orgId = user.organization!.id;

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const posts = await db.post.findMany({
    where: {
      orgId,
      status: { in: [PostStatus.PUBLISHED, PostStatus.PUBLISHED_PARTIAL] },
      publishedAt: { gte: since },
    },
    include: { analytics: { orderBy: { fetchedAt: "desc" } } },
    orderBy: { publishedAt: "desc" },
  });

  // Latest analytics snapshot per post+platform.
  const rows: PostRow[] = posts.map((post) => {
    const seen = new Set<string>();
    let impressions = 0;
    let engagements = 0;
    const perPlatform: PostRow["perPlatform"] = {};
    for (const snap of post.analytics) {
      if (seen.has(snap.platform)) continue;
      seen.add(snap.platform);
      impressions += snap.impressions;
      engagements += snap.engagements;
      perPlatform[snap.platform] = {
        impressions: snap.impressions,
        engagements: snap.engagements,
        likes: snap.likes,
        replies: snap.replies,
        reposts: snap.reposts,
        clicks: snap.clicks,
      };
    }
    return {
      id: post.id,
      content: post.content,
      platforms: post.platforms,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      impressions,
      engagements,
      perPlatform,
    };
  });

  // Impressions per day for the trailing week.
  const dayPoints: DayPoint[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const label = day.toLocaleDateString("en-US", { weekday: "short" });
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const impressions = rows
      .filter((row) => {
        if (!row.publishedAt) return false;
        const at = new Date(row.publishedAt);
        return at >= dayStart && at < dayEnd;
      })
      .reduce((sum, row) => sum + row.impressions, 0);
    dayPoints.push({ day: label, impressions });
  }

  // Engagement rate per platform.
  const platformTotals = new Map<string, { impressions: number; engagements: number }>();
  for (const row of rows) {
    for (const [platform, metrics] of Object.entries(row.perPlatform)) {
      const totals = platformTotals.get(platform) ?? { impressions: 0, engagements: 0 };
      totals.impressions += metrics.impressions;
      totals.engagements += metrics.engagements;
      platformTotals.set(platform, totals);
    }
  }
  const platformRates: PlatformRate[] = ["X", "LINKEDIN"]
    .filter((platform) => platformTotals.has(platform))
    .map((platform) => {
      const totals = platformTotals.get(platform)!;
      return {
        platform,
        rate:
          totals.impressions > 0
            ? Math.round((totals.engagements / totals.impressions) * 1000) / 10
            : 0,
      };
    });

  return (
    <AnalyticsView rows={rows} dayPoints={dayPoints} platformRates={platformRates} />
  );
}
