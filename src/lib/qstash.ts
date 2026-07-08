import crypto from "node:crypto";

/**
 * Minimal QStash REST client for delayed webhook delivery.
 *
 * Verification strategy: when publishing we attach a forwarded secret header
 * (`Upstash-Forward-X-Legent-Token`) derived from QSTASH_TOKEN. QStash relays
 * it to our /api/posts/publish endpoint as `X-Legent-Token`, where we compare
 * it in constant time. This proves the request originated from our own
 * publish call without needing QStash's JWT signing keys. (QStash's own
 * `Upstash-Signature` JWT could be layered on later with the signing keys.)
 *
 * Local dev: when QSTASH_TOKEN is unset, publishing is skipped and a
 * `dev-<timestamp>` message id is returned — fire /api/posts/publish manually
 * with the X-Legent-Token header to simulate delivery.
 */

const QSTASH_API_BASE = process.env.QSTASH_URL ?? "https://qstash.upstash.io";

function getToken(): string | null {
  // Empty-string env values (common in committed .env templates) count as unset.
  const token = process.env.QSTASH_TOKEN;
  return token && token.length > 0 ? token : null;
}

/** Deterministic shared secret derived from QSTASH_TOKEN (never the raw token). */
export function publishAuthToken(): string {
  const token = getToken() ?? process.env.NEXTAUTH_SECRET ?? "legent-dev";
  return crypto.createHash("sha256").update(`legent-publish:${token}`).digest("hex");
}

export function verifyPublishAuthToken(header: string | null): boolean {
  if (!header) return false;
  const expected = publishAuthToken();
  const got = Buffer.from(header);
  const want = Buffer.from(expected);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

export async function qstashPublishJSON(params: {
  url: string;
  body: unknown;
  notBefore: Date;
}): Promise<{ messageId: string }> {
  const token = getToken();
  if (!token) {
    return { messageId: `dev-${Date.now()}` };
  }

  const res = await fetch(`${QSTASH_API_BASE}/v2/publish/${params.url}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Upstash-Not-Before": String(Math.floor(params.notBefore.getTime() / 1000)),
      "Upstash-Forward-X-Legent-Token": publishAuthToken(),
      "Upstash-Retries": "3",
    },
    body: JSON.stringify(params.body),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`QStash publish failed (${res.status}).`);
  }

  const json = (await res.json()) as { messageId?: string };
  return { messageId: json.messageId ?? "unknown" };
}

/** Cancel a scheduled message. Best-effort: a 404 (already delivered/removed) is fine. */
export async function qstashDeleteMessage(messageId: string): Promise<void> {
  const token = getToken();
  if (!token || messageId.startsWith("dev-") || messageId === "unknown") {
    return;
  }

  const res = await fetch(`${QSTASH_API_BASE}/v2/messages/${messageId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok && res.status !== 404) {
    throw new Error(`QStash message delete failed (${res.status}).`);
  }
}
