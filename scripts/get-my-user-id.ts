/**
 * Finds your numeric X (Twitter) user id from your @username.
 *
 * Usage:
 *   npx tsx scripts/get-my-user-id.ts            # reads TWITTER_BEARER_TOKEN from .env.local
 *   npx tsx scripts/get-my-user-id.ts SomeHandle # override the username
 *
 * Then add the printed id to .env.local as TWITTER_USER_ID=...
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadBearerToken(): string {
  if (process.env.TWITTER_BEARER_TOKEN) return process.env.TWITTER_BEARER_TOKEN;
  try {
    const envFile = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of envFile.split("\n")) {
      const match = line.match(/^\s*TWITTER_BEARER_TOKEN\s*=\s*(.+)\s*$/);
      if (match) return match[1].replace(/^["']|["']$/g, "").trim();
    }
  } catch {
    // fall through to error below
  }
  throw new Error("TWITTER_BEARER_TOKEN not found in env or .env.local");
}

async function main() {
  const username = process.argv[2] ?? "ankittharol";
  const token = loadBearerToken();

  const res = await fetch(`https://api.twitter.com/2/users/by/username/${username}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.error(`X API error (${res.status}):`, await res.text());
    process.exit(1);
  }

  const data = await res.json();
  const id = data.data?.id;
  if (!id) {
    console.error("No user id returned. Response:", JSON.stringify(data));
    process.exit(1);
  }

  console.log(`@${username} user id: ${id}`);
  console.log(`Add this to .env.local:\nTWITTER_USER_ID=${id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
