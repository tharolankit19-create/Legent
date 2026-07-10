import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/redis";
import {
  getMyPosts,
  getCompetitorPosts,
  getReplyTargets,
  generateViralPosts,
} from "@/lib/x-analyzer";

// This route pulls the X API and calls a paid LLM, so it must be authenticated
// and rate-limited like the other AI routes in this app.
const RATE_LIMIT = 5;
const RATE_WINDOW_SECONDS = 60 * 60;

// The competitor + reply-target loops make sequential X API calls; give the
// route room to finish on platforms that support a longer function timeout.
export const maxDuration = 300;

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.organization) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const limit = await rateLimit(`ratelimit:intelligence:${user.id}`, RATE_LIMIT, RATE_WINDOW_SECONDS);
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limit exceeded. You get 5 intelligence runs per hour." },
      { status: 429 },
    );
  }

  try {
    console.log("[intelligence] pulling X data...");
    const [myPosts, competitorPosts, replyTargets] = await Promise.all([
      getMyPosts(),
      getCompetitorPosts(),
      getReplyTargets(),
    ]);

    console.log(
      `[intelligence] my=${myPosts.length} competitors=${competitorPosts.length} targets=${replyTargets.length}`,
    );

    const topCount = myPosts.filter((p) => p.performance_tier === "top").length;
    const midCount = myPosts.filter((p) => p.performance_tier === "mid").length;
    const flopCount = myPosts.filter((p) => p.performance_tier === "flop").length;
    const avgEngagement = myPosts.length
      ? (myPosts.reduce((sum, p) => sum + p.engagement_rate, 0) / myPosts.length).toFixed(2)
      : "0.00";
    const impressionsEstimated = myPosts.some((p) => p.impressions_estimated);

    const bestFormat = (() => {
      const formatScores: Record<string, number[]> = {};
      for (const p of myPosts) {
        (formatScores[p.format] ??= []).push(p.engagement_rate);
      }
      return Object.entries(formatScores)
        .map(([format, rates]) => ({
          format,
          avg: rates.reduce((a, b) => a + b, 0) / rates.length,
        }))
        .sort((a, b) => b.avg - a.avg)[0];
    })();

    console.log("[intelligence] running LLM synthesis...");
    const intelligence = await generateViralPosts(myPosts, competitorPosts, replyTargets);

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        myStats: {
          totalPostsAnalyzed: myPosts.length,
          topPosts: topCount,
          midPosts: midCount,
          flopPosts: flopCount,
          avgEngagementRate: `${avgEngagement}%`,
          bestFormat: bestFormat?.format ?? "n/a",
          bestFormatAvgEngagement: bestFormat ? `${bestFormat.avg.toFixed(2)}%` : "n/a",
          impressionsEstimated,
        },
        competitorStats: {
          totalPostsAnalyzed: competitorPosts.length,
          topCompetitorPost:
            [...competitorPosts].sort(
              (a, b) => b.likes + b.retweets - (a.likes + a.retweets),
            )[0] ?? null,
        },
        intelligence,
        actionPlan: {
          doFirst: "40 replies BEFORE posting anything. Reply to the accounts in the reply-scripts section.",
          doSecond: "Post X Post 1 at 8:00 AM IST.",
          doThird: "Post LinkedIn Post 1 at 7:30 AM IST.",
          critical:
            "No post without 40 replies that day. Your own data: 43 replies = 1,043 impressions vs 0 replies = ~0 reach.",
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[intelligence] failed:", message);
    return NextResponse.json(
      {
        success: false,
        error: message,
        fix: message.includes("TWITTER")
          ? "Add TWITTER_BEARER_TOKEN and TWITTER_USER_ID to .env.local."
          : message.includes("OPENROUTER")
            ? "Check OPENROUTER_API_KEY in .env.local."
            : "Check server logs for details.",
      },
      { status: 500 },
    );
  }
}
