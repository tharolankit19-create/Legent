import { z } from "zod";
import { Platform, type Integration } from "@prisma/client";
import { decrypt } from "@/lib/encryption";
import { refreshXToken, getXApiHeaders } from "@/lib/x-oauth";
import { ensureLinkedInToken, getLinkedInApiHeaders } from "@/lib/linkedin-oauth";

const X_API_BASE = process.env.X_API_BASE ?? "https://api.twitter.com";
const LINKEDIN_API_BASE = process.env.LINKEDIN_API_BASE ?? "https://api.linkedin.com";

export type PublishOutcome =
  | { ok: true; platform: Platform; platformPostId: string }
  | { ok: false; platform: Platform; reason: string };

const tweetResponseSchema = z.object({
  data: z.object({ id: z.string() }),
});

async function publishToX(integration: Integration, content: string): Promise<string> {
  const fresh = await refreshXToken(integration);
  const res = await fetch(`${X_API_BASE}/2/tweets`, {
    method: "POST",
    headers: {
      ...getXApiHeaders(decrypt(fresh.accessToken)),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: content }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`X publish failed (${res.status}).`);
  }

  return tweetResponseSchema.parse(await res.json()).data.id;
}

async function publishToLinkedIn(integration: Integration, content: string): Promise<string> {
  const fresh = await ensureLinkedInToken(integration);
  if (!fresh.externalId) {
    throw new Error("LinkedIn member id missing; reconnect the integration.");
  }

  const res = await fetch(`${LINKEDIN_API_BASE}/v2/ugcPosts`, {
    method: "POST",
    headers: {
      ...getLinkedInApiHeaders(decrypt(fresh.accessToken)),
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: `urn:li:person:${fresh.externalId}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: content },
          shareMediaCategory: "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`LinkedIn publish failed (${res.status}).`);
  }

  const restliId = res.headers.get("x-restli-id");
  if (restliId) return restliId;
  const json = (await res.json().catch(() => null)) as { id?: string } | null;
  return json?.id ?? "unknown";
}

/**
 * Publish content to one platform using its stored integration.
 * Errors are captured, never thrown — the caller aggregates outcomes.
 * Failure reasons must never contain token material.
 */
export async function publishToPlatform(
  platform: Platform,
  integration: Integration,
  content: string,
): Promise<PublishOutcome> {
  try {
    if (platform === Platform.X) {
      return { ok: true, platform, platformPostId: await publishToX(integration, content) };
    }
    if (platform === Platform.LINKEDIN) {
      return { ok: true, platform, platformPostId: await publishToLinkedIn(integration, content) };
    }
    return { ok: false, platform, reason: `Publishing to ${platform} is not supported yet.` };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown publish error";
    return { ok: false, platform, reason };
  }
}

/** Public URL for a published platform post, when derivable. */
export function platformPostUrl(platform: Platform, platformPostId: string, username?: string | null): string | null {
  if (platform === Platform.X) {
    return `https://x.com/${username ?? "i"}/status/${platformPostId}`;
  }
  if (platform === Platform.LINKEDIN) {
    return `https://www.linkedin.com/feed/update/${platformPostId}`;
  }
  return null;
}
