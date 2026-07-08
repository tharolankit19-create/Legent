import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { kvSetEx, rateLimit } from "@/lib/redis";
import {
  buildAuthorizeUrl,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from "@/lib/x-oauth";

const OAUTH_TTL_SECONDS = 5 * 60;
const RATE_LIMIT = 5;
const RATE_WINDOW_SECONDS = 60 * 60;

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.organization) {
    return NextResponse.redirect(new URL("/auth/login", appUrl()));
  }

  const limit = await rateLimit(`ratelimit:oauth:x:${user.id}`, RATE_LIMIT, RATE_WINDOW_SECONDS);
  if (!limit.allowed) {
    return NextResponse.redirect(
      new URL("/integrations?error=Too%20many%20attempts.%20Try%20again%20later.", appUrl()),
    );
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  await kvSetEx(
    `oauth:x:${user.id}`,
    JSON.stringify({ codeVerifier, state }),
    OAUTH_TTL_SECONDS,
  );

  return NextResponse.redirect(buildAuthorizeUrl({ state, codeChallenge }));
}

function appUrl(): string {
  return (
    process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
}
