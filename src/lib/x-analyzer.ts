import { z } from "zod";
import { OpenRouterClient } from "@/lib/openrouter";

/**
 * Social media intelligence: pulls the founder's own X posts + competitor posts
 * + reply-target posts, then asks the LLM (via OpenRouter, matching the rest of
 * the codebase) to produce a structured content plan.
 *
 * REQUIRED ENV (add to .env.local — do NOT commit real values, .env.local is
 * ignored going forward):
 *   TWITTER_BEARER_TOKEN  App-only bearer token (developer.twitter.com).
 *                         Reading /2/users/:id/tweets with public_metrics +
 *                         impression_count requires the paid Basic tier ($200/mo)
 *                         or higher. On the Free tier these calls are heavily
 *                         rate-limited and impression_count is absent.
 *   TWITTER_USER_ID       Your numeric X user id (see scripts/get-my-user-id.ts).
 *
 * The LLM call reuses OPENROUTER_API_KEY / OPENROUTER_MODEL (default
 * anthropic/claude-sonnet-4-5) — the same infra as src/lib/openrouter.ts.
 */

const X_API_BASE = process.env.X_API_BASE ?? "https://api.twitter.com";

function getBearer(): string {
  const token = process.env.TWITTER_BEARER_TOKEN;
  if (!token) {
    throw new Error(
      "TWITTER_BEARER_TOKEN is not set. Add it to .env.local (app-only bearer token from developer.twitter.com).",
    );
  }
  return token;
}

function getMyUserId(): string {
  const id = process.env.TWITTER_USER_ID;
  if (!id) {
    throw new Error(
      "TWITTER_USER_ID is not set. Run `npx tsx scripts/get-my-user-id.ts` to find it, then add it to .env.local.",
    );
  }
  return id;
}

// Competitors on X (Legent competitors)
const COMPETITOR_USERNAMES = [
  "PostizHQ",
  "buffer",
  "hootsuite",
  "LaterMedia",
  "publer_io",
  "SocialBee_io",
  "recur_post",
];

// Big accounts to reply to (borrowed reach targets)
const REPLY_TARGET_ACCOUNTS = [
  "marc_louvion",
  "levelsio",
  "AnthonyMayfield",
  "GoodMarketingHQ",
  "thepatwalls",
];

export interface PostAnalysis {
  id: string;
  text: string;
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
  impressions_estimated: boolean;
  engagement_rate: number;
  format: string;
  has_number: boolean;
  has_question: boolean;
  word_count: number;
  posted_at: string;
  performance_tier: "top" | "mid" | "flop";
}

export interface CompetitorPost {
  username: string;
  text: string;
  likes: number;
  retweets: number;
  replies: number;
  posted_at: string;
  topic: string;
}

export interface ReplyTarget {
  username: string;
  posts: Array<{ id: string; text: string; created_at?: string }>;
}

export interface ViralContent {
  analysis: string;
  xPosts: string[];
  linkedinPosts: string[];
  replyScript: string[];
  contentPillars: string;
  whatWorked: string;
  whatFailed: string;
  competitorGaps: string;
}

function bearerHeaders() {
  return { Authorization: `Bearer ${getBearer()}` };
}

// ---- Data pulls -----------------------------------------------------------

// Pull MY last 100 posts with full metrics.
export async function getMyPosts(): Promise<PostAnalysis[]> {
  const url =
    `${X_API_BASE}/2/users/${getMyUserId()}/tweets?` +
    `max_results=100` +
    `&tweet.fields=public_metrics,created_at,text` +
    `&exclude=retweets,replies`;

  const res = await fetch(url, { headers: bearerHeaders() });
  if (!res.ok) {
    throw new Error(`X API error (${res.status}) fetching my posts: ${await res.text()}`);
  }

  const data = await res.json();
  const tweets: any[] = data.data ?? [];

  return tweets.map((t) => {
    const m = t.public_metrics ?? {};
    const likes = m.like_count ?? 0;
    const retweets = m.retweet_count ?? 0;
    const replies = m.reply_count ?? 0;
    const total = likes + retweets + replies;

    // impression_count is only present on paid tiers. Flag the estimate rather
    // than silently inventing a denominator.
    const hasImpressions = typeof m.impression_count === "number" && m.impression_count > 0;
    const impressions = hasImpressions ? m.impression_count : 500;
    const engagement_rate = Number(((total / impressions) * 100).toFixed(2));

    const text: string = t.text ?? "";
    let format = "statement";
    if (text.includes("?")) format = "question";
    if (/^\d/.test(text)) format = "number-first";
    if (text.includes("\n→") || text.includes("\n-")) format = "list";
    if (text.toLowerCase().includes("day ")) format = "build-in-public";
    if (text.includes("vs") || text.includes("vs.")) format = "comparison";

    let performance_tier: "top" | "mid" | "flop" = "flop";
    if (engagement_rate >= 5) performance_tier = "top";
    else if (engagement_rate >= 2) performance_tier = "mid";

    return {
      id: t.id,
      text,
      likes,
      retweets,
      replies,
      impressions,
      impressions_estimated: !hasImpressions,
      engagement_rate,
      format,
      has_number: /\d/.test(text.substring(0, 50)),
      has_question: text.includes("?"),
      word_count: text.split(/\s+/).filter(Boolean).length,
      posted_at: t.created_at,
      performance_tier,
    };
  });
}

async function resolveUserId(username: string): Promise<string | null> {
  const res = await fetch(`${X_API_BASE}/2/users/by/username/${username}`, {
    headers: bearerHeaders(),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data?.id ?? null;
}

// Pull competitor posts (top 5 by engagement each).
export async function getCompetitorPosts(): Promise<CompetitorPost[]> {
  const allPosts: CompetitorPost[] = [];

  for (const username of COMPETITOR_USERNAMES) {
    try {
      const userId = await resolveUserId(username);
      if (!userId) continue;

      const tweetsRes = await fetch(
        `${X_API_BASE}/2/users/${userId}/tweets?` +
          `max_results=20&tweet.fields=public_metrics,created_at&exclude=retweets`,
        { headers: bearerHeaders() },
      );
      if (!tweetsRes.ok) continue;

      const tweetsData = await tweetsRes.json();
      const tweets: any[] = tweetsData.data ?? [];

      const sorted = tweets
        .map((t) => ({
          ...t,
          total:
            (t.public_metrics?.like_count ?? 0) +
            (t.public_metrics?.retweet_count ?? 0) +
            (t.public_metrics?.reply_count ?? 0),
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      for (const tweet of sorted) {
        allPosts.push({
          username,
          text: tweet.text ?? "",
          likes: tweet.public_metrics?.like_count ?? 0,
          retweets: tweet.public_metrics?.retweet_count ?? 0,
          replies: tweet.public_metrics?.reply_count ?? 0,
          posted_at: tweet.created_at,
          topic: "unknown",
        });
      }

      // Gentle spacing to avoid hammering the rate limiter.
      await new Promise((r) => setTimeout(r, 300));
    } catch (e) {
      console.warn(`[x-analyzer] skipping competitor ${username}:`, e);
    }
  }

  return allPosts;
}

// Fresh posts from reply targets (for borrowed reach).
export async function getReplyTargets(): Promise<ReplyTarget[]> {
  const targets: ReplyTarget[] = [];

  for (const username of REPLY_TARGET_ACCOUNTS) {
    try {
      const userId = await resolveUserId(username);
      if (!userId) continue;

      const tweetsRes = await fetch(
        `${X_API_BASE}/2/users/${userId}/tweets?` +
          `max_results=5&tweet.fields=public_metrics,created_at&exclude=retweets`,
        { headers: bearerHeaders() },
      );
      if (!tweetsRes.ok) continue;

      const tweetsData = await tweetsRes.json();
      targets.push({ username, posts: tweetsData.data ?? [] });

      await new Promise((r) => setTimeout(r, 300));
    } catch (e) {
      console.warn(`[x-analyzer] skipping reply target ${username}:`, e);
    }
  }

  return targets;
}

// ---- LLM synthesis --------------------------------------------------------

const intelligenceSchema = z.object({
  whatWorking: z.string(),
  whatFailing: z.string(),
  contentPillars: z.string(),
  xPosts: z.array(z.string()).min(1).max(3),
  linkedinPosts: z.array(z.string()).min(1).max(3),
  replyScripts: z.string(),
  competitorGaps: z.string(),
});

// MAIN BRAIN: the LLM analyzes everything and writes the plan.
export async function generateViralPosts(
  myPosts: PostAnalysis[],
  competitorPosts: CompetitorPost[],
  replyTargets: ReplyTarget[],
): Promise<ViralContent> {
  const topPosts = myPosts.filter((p) => p.performance_tier === "top").slice(0, 10);
  const flopPosts = myPosts.filter((p) => p.performance_tier === "flop").slice(0, 10);
  const topCompetitorPosts = [...competitorPosts]
    .sort((a, b) => b.likes + b.retweets - (a.likes + a.retweets))
    .slice(0, 10);

  const anyEstimated = myPosts.some((p) => p.impressions_estimated);

  const systemPrompt = `You are a top-tier ghostwriter and X growth expert who makes indie founders go viral through radical transparency.

Return ONLY valid JSON (no markdown, no preamble) with EXACTLY these keys:
{
  "whatWorking": <string: 3 specific patterns from top posts, with exact numbers>,
  "whatFailing": <string: 3 specific patterns from flop posts, with exact numbers>,
  "contentPillars": <string: top 4 pillars ranked by the data, not generic advice>,
  "xPosts": [<3 strings, each a full X post under 280 chars, number-first, no hashtags, no link in the post>],
  "linkedinPosts": [<3 strings, each 150-300 words, ends with ONE specific question, Legent mentioned naturally>],
  "replyScripts": <string: 5 reply templates per target account (${REPLY_TARGET_ACCOUNTS.join(", ")}), each adding a specific number/insight from Ankit's data — never "great post!">,
  "competitorGaps": <string: 3 things competitors are NOT posting about that Ankit can own>
}

RULES:
1. Every X post starts with a number or specific data point.
2. Radical transparency over polished content.
3. Legent mentioned naturally, never pitched.
4. No hashtags on X. No "let me know in the comments" — ask ONE specific question.
5. LinkedIn posts may include a link; X posts never carry a link in the post body.
6. Write like a real founder, not a marketer.`;

  const userPrompt = `MY PROFILE:
- Name: Ankit (@ankittharol)
- Product: Legent (AI social media manager for founders)
- Current: 59 followers, $0 revenue, 10 days building
- Goal: $500 revenue (17-18 early access at $29), 500 followers
- Brand: Radical transparency, ugly numbers, real founder journey
- CRITICAL DATA: 43 replies in one day = 1,043 impressions. Near-zero replies = near-zero reach.
${anyEstimated ? "- NOTE: impression_count was unavailable (Free tier), so some engagement rates are estimates against an assumed 500 impressions. Weight likes/retweets/replies over engagement_rate where they conflict." : ""}

MY TOP PERFORMING POSTS:
${topPosts
  .map(
    (p) =>
      `"${p.text.substring(0, 200)}"\nFormat: ${p.format} | Engagement: ${p.engagement_rate}%${p.impressions_estimated ? " (est)" : ""} | Likes: ${p.likes} | Number-first: ${p.has_number}`,
  )
  .join("\n\n") || "(none scored as top yet)"}

MY FLOP POSTS:
${flopPosts
  .map((p) => `"${p.text.substring(0, 150)}"\nFormat: ${p.format} | Engagement: ${p.engagement_rate}%`)
  .join("\n\n") || "(none)"}

TOP COMPETITOR POSTS:
${topCompetitorPosts
  .map((p) => `@${p.username}: "${p.text.substring(0, 200)}"\nLikes: ${p.likes} | RTs: ${p.retweets}`)
  .join("\n\n") || "(no competitor data pulled)"}

ACCOUNTS TO REPLY TO (borrowed reach):
${replyTargets
  .map(
    (t) =>
      `@${t.username}: ${(t.posts ?? [])
        .slice(0, 2)
        .map((p) => `"${(p.text ?? "").substring(0, 100)}"`)
        .join(" | ")}`,
  )
  .join("\n") || "(no reply-target data pulled)"}

Produce the JSON now.`;

  const client = new OpenRouterClient();
  const result = await client.createJsonCompletion({
    schema: intelligenceSchema,
    temperature: 0.7,
    maxTokens: 4000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  return {
    analysis: JSON.stringify(result, null, 2),
    whatWorked: result.whatWorking,
    whatFailed: result.whatFailing,
    contentPillars: result.contentPillars,
    xPosts: result.xPosts,
    linkedinPosts: result.linkedinPosts,
    replyScript: [result.replyScripts],
    competitorGaps: result.competitorGaps,
  };
}
