import Link from "next/link";
import { PlanType, PostStatus } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { UpcomingPosts, type UpcomingPost } from "./upcoming-posts";
import { UpgradeButton } from "./upgrade-button";

export default async function DashboardPage() {
  const user = await requireAuth();
  const org = user.organization!;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [publishedThisWeek, upcomingRaw, recent, integrations, analytics] = await Promise.all([
    db.post.count({
      where: {
        orgId: org.id,
        status: { in: [PostStatus.PUBLISHED, PostStatus.PUBLISHED_PARTIAL] },
        publishedAt: { gte: weekAgo },
      },
    }),
    db.post.findMany({
      where: {
        orgId: org.id,
        status: PostStatus.SCHEDULED,
        scheduledAt: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { scheduledAt: "asc" },
      take: 10,
    }),
    db.post.findMany({
      where: {
        orgId: org.id,
        status: { in: [PostStatus.PUBLISHED, PostStatus.PUBLISHED_PARTIAL, PostStatus.FAILED] },
      },
      orderBy: { updatedAt: "desc" },
      take: 3,
    }),
    db.integration.findMany({ where: { orgId: org.id }, select: { platform: true, isActive: true } }),
    db.analytics.findMany({
      where: { post: { orgId: org.id }, fetchedAt: { gte: weekAgo } },
      include: { post: { select: { id: true, content: true } } },
      orderBy: { fetchedAt: "desc" },
    }),
  ]);

  // Latest snapshot per post+platform → weekly impressions/engagements + best post.
  const seen = new Set<string>();
  let impressions = 0;
  let engagements = 0;
  const perPost = new Map<string, { content: string; impressions: number }>();
  for (const snap of analytics) {
    const key = `${snap.postId}:${snap.platform}`;
    if (seen.has(key)) continue;
    seen.add(key);
    impressions += snap.impressions;
    engagements += snap.engagements;
    const entry = perPost.get(snap.postId) ?? { content: snap.post.content, impressions: 0 };
    entry.impressions += snap.impressions;
    perPost.set(snap.postId, entry);
  }
  const bestPost = [...perPost.values()].sort((a, b) => b.impressions - a.impressions)[0] ?? null;

  const upcoming: UpcomingPost[] = upcomingRaw.map((post) => ({
    id: post.id,
    content: post.content,
    platforms: post.platforms,
    scheduledAt: post.scheduledAt!.toISOString(),
    status: post.status,
  }));

  const firstName = user.name?.split(" ")[0] ?? user.email.split("@")[0];
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const isEarlyAccess = org.planType === PlanType.EARLY_ACCESS;

  const tiles = [
    { label: "Posts this week", value: String(publishedThisWeek), sub: undefined },
    { label: "Impressions this week", value: impressions.toLocaleString(), sub: undefined },
    {
      label: "Best post",
      value: bestPost ? bestPost.impressions.toLocaleString() : "—",
      sub: bestPost ? bestPost.content.slice(0, 40) : "No synced posts yet",
    },
    { label: "Engagements this week", value: engagements.toLocaleString(), sub: undefined },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Welcome back, {firstName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {today} · {org.name}
          </p>
        </div>
        {isEarlyAccess ? (
          <span className="rounded-full bg-primary/15 px-3 py-1.5 text-sm font-medium text-primary">
            Early Access · 40% off Pro
          </span>
        ) : (
          <UpgradeButton />
        )}
      </div>

      {/* Metric tiles */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile, index) => (
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

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section
          className="animate-fade-in-up rounded-xl border border-border bg-card p-5"
          style={{ animationDelay: "200ms" }}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Upcoming posts</h2>
            <Link href="/compose" className="text-sm text-primary hover:underline">
              + New post
            </Link>
          </div>
          <UpcomingPosts posts={upcoming} />
        </section>

        <section
          className="animate-fade-in-up rounded-xl border border-border bg-card p-5"
          style={{ animationDelay: "250ms" }}
        >
          <h2 className="font-medium">Recent posts</h2>
          {recent.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nothing published yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {recent.map((post) => {
                const ids = (post.platformPostIds ?? {}) as Record<string, string>;
                return (
                  <li key={post.id} className="rounded-md border border-border p-3">
                    <p className="truncate text-sm">{post.content.slice(0, 80)}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className={
                          post.status === "FAILED"
                            ? "text-red-500"
                            : post.status === "PUBLISHED_PARTIAL"
                              ? "text-yellow-500"
                              : "text-green-500"
                        }
                      >
                        {post.status.replaceAll("_", " ").toLowerCase()}
                      </span>
                      {ids.X && (
                        <a
                          href={`https://x.com/i/status/${ids.X}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          View on X
                        </a>
                      )}
                      {ids.LINKEDIN && (
                        <a
                          href={`https://www.linkedin.com/feed/update/${ids.LINKEDIN}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          View on LinkedIn
                        </a>
                      )}
                      {post.failureReason && (
                        <span className="text-red-400">{post.failureReason.slice(0, 60)}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {integrations.filter((i) => i.isActive).length === 0 && (
        <div className="mt-6 rounded-xl border border-primary/40 bg-primary/5 p-5 text-sm">
          Connect X or LinkedIn to start publishing —{" "}
          <Link href="/integrations" className="font-medium text-primary hover:underline">
            go to Integrations
          </Link>
        </div>
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        More coming soon: AI agent drafts, best-time-to-post, Instagram &amp; Threads.
      </p>
    </div>
  );
}
