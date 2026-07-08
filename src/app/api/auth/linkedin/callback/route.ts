import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { kvDel, kvGet } from "@/lib/redis";
import {
  exchangeLinkedInCode,
  fetchLinkedInUser,
  LINKEDIN_SCOPES,
} from "@/lib/linkedin-oauth";

function appUrl(): string {
  return (
    process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
}

function redirectWithError(message: string): NextResponse {
  return NextResponse.redirect(
    new URL(`/integrations?error=${encodeURIComponent(message)}`, appUrl()),
  );
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.organization) {
    return NextResponse.redirect(new URL("/auth/login", appUrl()));
  }

  const { searchParams } = request.nextUrl;

  if (searchParams.get("error")) {
    return redirectWithError("LinkedIn authorization was cancelled.");
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    return new NextResponse("Missing code or state", { status: 400 });
  }

  const expectedState = await kvGet(`oauth:linkedin:${user.id}`);
  if (!expectedState) {
    return new NextResponse("OAuth session expired or not found", { status: 400 });
  }
  if (state !== expectedState) {
    return new NextResponse("Invalid state parameter", { status: 400 });
  }

  // One-time use.
  await kvDel(`oauth:linkedin:${user.id}`);

  try {
    const tokens = await exchangeLinkedInCode(code);
    const profile = await fetchLinkedInUser(tokens.access_token);
    const displayName = profile.name ?? profile.given_name ?? profile.email ?? "LinkedIn user";

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    const grantedScopes = tokens.scope ? tokens.scope.split(/[ ,]+/) : LINKEDIN_SCOPES;

    await db.integration.upsert({
      where: { orgId_platform: { orgId: user.organization.id, platform: "LINKEDIN" } },
      create: {
        orgId: user.organization.id,
        platform: "LINKEDIN",
        accessToken: encrypt(tokens.access_token),
        // LinkedIn issues no refresh token on the self-serve tier.
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        username: displayName,
        avatar: profile.picture ?? null,
        externalId: profile.sub,
        expiresAt,
        scopes: grantedScopes,
        isActive: true,
      },
      update: {
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        username: displayName,
        avatar: profile.picture ?? null,
        externalId: profile.sub,
        expiresAt,
        scopes: grantedScopes,
        isActive: true,
      },
    });

    return NextResponse.redirect(
      new URL(
        `/integrations?success=${encodeURIComponent(`Connected as ${displayName}`)}`,
        appUrl(),
      ),
    );
  } catch (error) {
    console.error(
      "[linkedin/callback] OAuth exchange failed:",
      error instanceof Error ? error.message : "unknown",
    );
    return redirectWithError("Could not connect LinkedIn. Please try again.");
  }
}
