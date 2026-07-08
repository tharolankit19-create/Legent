import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { kvDel, kvGet } from "@/lib/redis";
import { exchangeCodeForToken, fetchXUser, X_SCOPES } from "@/lib/x-oauth";

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

  // X returns ?error=access_denied if the user declines authorization.
  if (searchParams.get("error")) {
    return redirectWithError("X authorization was cancelled.");
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    return new NextResponse("Missing code or state", { status: 400 });
  }

  // Validate state (CSRF) against the value we stored before redirecting.
  const stored = await kvGet(`oauth:x:${user.id}`);
  if (!stored) {
    return new NextResponse("OAuth session expired or not found", { status: 400 });
  }

  let codeVerifier: string;
  let expectedState: string;
  try {
    const parsed = JSON.parse(stored) as { codeVerifier: string; state: string };
    codeVerifier = parsed.codeVerifier;
    expectedState = parsed.state;
  } catch {
    return new NextResponse("Corrupt OAuth session", { status: 400 });
  }

  if (state !== expectedState) {
    return new NextResponse("Invalid state parameter", { status: 400 });
  }

  // One-time use: consume the stored PKCE state regardless of outcome below.
  await kvDel(`oauth:x:${user.id}`);

  try {
    const tokens = await exchangeCodeForToken({ code, codeVerifier });
    const profile = await fetchXUser(tokens.access_token);

    const grantedScopes = tokens.scope ? tokens.scope.split(" ") : X_SCOPES;
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await db.integration.upsert({
      where: { orgId_platform: { orgId: user.organization.id, platform: "X" } },
      create: {
        orgId: user.organization.id,
        platform: "X",
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        username: profile.username,
        avatar: profile.profile_image_url ?? null,
        expiresAt,
        scopes: grantedScopes,
        isActive: true,
      },
      update: {
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        username: profile.username,
        avatar: profile.profile_image_url ?? null,
        expiresAt,
        scopes: grantedScopes,
        isActive: true,
      },
    });

    return NextResponse.redirect(
      new URL(`/integrations?success=${encodeURIComponent(`Connected as @${profile.username}`)}`, appUrl()),
    );
  } catch (error) {
    // Never leak token material; log a generic reason only.
    console.error("[x/callback] OAuth exchange failed:", error instanceof Error ? error.message : "unknown");
    return redirectWithError("Could not connect X. Please try again.");
  }
}
