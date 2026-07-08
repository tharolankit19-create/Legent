import { NextResponse } from "next/server";
import { z } from "zod";
import { Platform, PostStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { rateLimit } from "@/lib/redis";
import { refreshXToken, getXApiHeaders } from "@/lib/x-oauth";
import { ensureLinkedInToken, getLinkedInApiHeaders } from "@/lib/linkedin-oauth";

const X_API_BASE = process.env.X_API_BASE ?? "https://api.twitter.com";
const LINKEDIN_API_BASE = process.env.LINKEDIN_API_BASE ?? "https://api.linkedin.com";

const xMetricsSchema = z.object({
  data: z.object({
    public_metrics: z.object({
      impression_count: z.number().optional().default(0),
      like_count: z.number().optional().default(0),
      reply_count: z.number().optional().default(0),
      retweet_count: z.number().optional().default(0),
      quote_count: z.number().optional().default(0),
    }),
  }),
});

// LinkedIn's viral/impression analytics need restricted API products; the
// self-serve socialActions endpoint at least yields likes + comments.
const linkedInSocialSchema = z
  .object({
    likesSummary: z.object({ totalLikes: z.number().optional().default(0) }).optional(),
    commentsSummary: z
      .object({ totalFirstLevelComments: z.number().optional().default(0) })
      .optional(),
  })
  .passthrough();

export async function POST() {
  const user = await getCurrentUser();
  if (!user?.organization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = user.organization.id;

  const limit = await rateLimit(`ratelimit:analytics-sync:${user.id}`, 10, 3600);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many syncs. Try again later." }, { status: 429 });
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const posts = await db.post.findMany({
    where: {
      orgId,
      status: { in: [PostStatus.PUBLISHED, PostStatus.PUBLISHED_PARTIAL] },
      publishedAt: { gte: since },
    },
  });

  const integrations = new Map(
    (await db.integration.findMany({ where: { orgId } })).map((i) => [i.platform, i]),
  );

  let synced = 0;
  const errors: string[] = [];

  for (const post of posts) {
    const ids = (post.platformPostIds ?? {}) as Record<string, string>;

    for (const [platformKey, platformPostId] of Object.entries(ids)) {
      const platform = platformKey as Platform;
      const integration = integrations.get(platform);
      if (!integration) {
        errors.push(`${platform}: not connected`);
        continue;
      }

      try {
        if (platform === Platform.X) {
          const fresh = await refreshXToken(integration);
          const res = await fetch(
            `${X_API_BASE}/2/tweets/${platformPostId}?tweet.fields=public_metrics`,
            { headers: getXApiHeaders(decrypt(fresh.accessToken)), cache: "no-store" },
          );
          if (!res.ok) throw new Error(`X metrics fetch failed (${res.status})`);
          const metrics = xMetricsSchema.parse(await res.json()).data.public_metrics;
          await db.analytics.create({
            data: {
              postId: post.id,
              platform,
              impressions: metrics.impression_count,
              likes: metrics.like_count,
              replies: metrics.reply_count,
              reposts: metrics.retweet_count + metrics.quote_count,
              engagements:
                metrics.like_count +
                metrics.reply_count +
                metrics.retweet_count +
                metrics.quote_count,
            },
          });
          synced += 1;
        } else if (platform === Platform.LINKEDIN) {
          const fresh = await ensureLinkedInToken(integration);
          const res = await fetch(
            `${LINKEDIN_API_BASE}/v2/socialActions/${encodeURIComponent(platformPostId)}`,
            { headers: getLinkedInApiHeaders(decrypt(fresh.accessToken)), cache: "no-store" },
          );
          if (!res.ok) throw new Error(`LinkedIn metrics fetch failed (${res.status})`);
          const social = linkedInSocialSchema.parse(await res.json());
          const likes = social.likesSummary?.totalLikes ?? 0;
          const comments = social.commentsSummary?.totalFirstLevelComments ?? 0;
          await db.analytics.create({
            data: {
              postId: post.id,
              platform,
              likes,
              replies: comments,
              engagements: likes + comments,
            },
          });
          synced += 1;
        }
      } catch (error) {
        errors.push(
          `${platform}/${post.id}: ${error instanceof Error ? error.message : "unknown error"}`,
        );
      }
    }
  }

  return NextResponse.json({ synced, errors });
}
