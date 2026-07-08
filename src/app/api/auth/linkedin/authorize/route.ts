import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { kvSetEx, rateLimit } from "@/lib/redis";
import { buildLinkedInAuthorizeUrl, generateState } from "@/lib/linkedin-oauth";

const OAUTH_TTL_SECONDS = 5 * 60;
const RATE_LIMIT = 5;
const RATE_WINDOW_SECONDS = 60 * 60;

function appUrl(): string {
  return (
    process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.organization) {
    return NextResponse.redirect(new URL("/auth/login", appUrl()));
  }

  const limit = await rateLimit(
    `ratelimit:oauth:linkedin:${user.id}`,
    RATE_LIMIT,
    RATE_WINDOW_SECONDS,
  );
  if (!limit.allowed) {
    return NextResponse.redirect(
      new URL("/integrations?error=Too%20many%20attempts.%20Try%20again%20later.", appUrl()),
    );
  }

  const state = generateState();
  await kvSetEx(`oauth:linkedin:${user.id}`, state, OAUTH_TTL_SECONDS);

  return NextResponse.redirect(buildLinkedInAuthorizeUrl(state));
}
