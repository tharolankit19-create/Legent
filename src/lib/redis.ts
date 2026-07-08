/**
 * Minimal key/value store for short-lived OAuth PKCE state.
 *
 * Uses Upstash Redis REST when configured (production/Vercel), and falls back to
 * an in-process Map with TTL for local dev where Upstash creds are absent.
 *
 * The in-memory fallback is DEV-ONLY: it does not survive a server restart and
 * is not shared across processes. That's acceptable for a single-worker `next
 * dev`, but production must have UPSTASH_REDIS_REST_URL + TOKEN set.
 */

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

function hasUpstash(): boolean {
  return Boolean(UPSTASH_URL && UPSTASH_TOKEN);
}

async function upstashCommand<T>(command: (string | number)[]): Promise<T> {
  const res = await fetch(UPSTASH_URL!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Upstash command failed (${res.status})`);
  }

  const json = (await res.json()) as { result: T };
  return json.result;
}

// --- in-memory fallback ---
type MemoryEntry = { value: string; expiresAt: number };
const memoryStore = new Map<string, MemoryEntry>();

function memoryGet(key: string): string | null {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

/** Store a value with a TTL in seconds. */
export async function kvSetEx(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (hasUpstash()) {
    await upstashCommand(["SETEX", key, ttlSeconds, value]);
    return;
  }
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

/** Read a value, or null if missing/expired. */
export async function kvGet(key: string): Promise<string | null> {
  if (hasUpstash()) {
    return upstashCommand<string | null>(["GET", key]);
  }
  return memoryGet(key);
}

/** Delete a key. */
export async function kvDel(key: string): Promise<void> {
  if (hasUpstash()) {
    await upstashCommand(["DEL", key]);
    return;
  }
  memoryStore.delete(key);
}

export function isUsingUpstash(): boolean {
  return hasUpstash();
}

type MemoryCounter = { count: number; expiresAt: number };
const memoryCounters = new Map<string, MemoryCounter>();

/**
 * Fixed-window rate limiter. Increments the counter for `key`, setting the
 * window TTL on first hit. Returns whether the caller is within `limit`.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; count: number; remaining: number }> {
  let count: number;

  if (hasUpstash()) {
    count = await upstashCommand<number>(["INCR", key]);
    if (count === 1) {
      await upstashCommand(["EXPIRE", key, windowSeconds]);
    }
  } else {
    const now = Date.now();
    const existing = memoryCounters.get(key);
    if (!existing || existing.expiresAt <= now) {
      count = 1;
      memoryCounters.set(key, { count, expiresAt: now + windowSeconds * 1000 });
    } else {
      existing.count += 1;
      count = existing.count;
    }
  }

  return { allowed: count <= limit, count, remaining: Math.max(0, limit - count) };
}
