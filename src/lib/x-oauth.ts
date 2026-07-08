import crypto from "node:crypto";
import { z } from "zod";
import type { Integration } from "@prisma/client";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";

/**
 * X (Twitter) OAuth 2.0 Authorization Code flow with PKCE, confidential client.
 *
 * NOTE ON ENDPOINTS: the documented, working X OAuth 2 hosts are used here
 * (api.twitter.com / twitter.com), not the `oauth2.platform.twitter.com` host
 * from the original spec, which does not resolve.
 */

export const X_AUTHORIZE_URL = "https://twitter.com/i/oauth2/authorize";
export const X_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
export const X_USERS_ME_URL = "https://api.twitter.com/2/users/me";

// offline.access is REQUIRED for X to return a refresh_token.
export const X_SCOPES = [
  "tweet.read",
  "tweet.write",
  "users.read",
  "follows.read",
  "follows.write",
  "offline.access",
];

// Refresh when the access token is within this window of expiring.
const REFRESH_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function base64Url(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateCodeVerifier(): string {
  // 32 random bytes -> 43 base64url chars (within X's 43–128 range).
  return base64Url(crypto.randomBytes(32));
}

export function generateCodeChallenge(verifier: string): string {
  return base64Url(crypto.createHash("sha256").update(verifier).digest());
}

export function generateState(): string {
  return base64Url(crypto.randomBytes(32));
}

function getClientId(): string {
  const id = process.env.X_CLIENT_ID ?? process.env.X_API_KEY;
  if (!id) throw new Error("X_CLIENT_ID is not set.");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.X_CLIENT_SECRET ?? process.env.X_API_SECRET;
  if (!secret) throw new Error("X_CLIENT_SECRET is not set.");
  return secret;
}

function appBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function getRedirectUri(): string {
  return `${appBaseUrl()}/api/auth/x/callback`;
}

export function buildAuthorizeUrl(params: { state: string; codeChallenge: string }): string {
  const query = new URLSearchParams({
    response_type: "code",
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    scope: X_SCOPES.join(" "),
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: "S256",
  });
  return `${X_AUTHORIZE_URL}?${query.toString()}`;
}

function basicAuthHeader(): string {
  const creds = `${getClientId()}:${getClientSecret()}`;
  return `Basic ${Buffer.from(creds).toString("base64")}`;
}

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
  scope: z.string().optional(),
  token_type: z.string().optional(),
});

export type XTokenResponse = z.infer<typeof tokenResponseSchema>;

const xUserSchema = z.object({
  data: z.object({
    id: z.string(),
    name: z.string(),
    username: z.string(),
    profile_image_url: z.string().optional(),
  }),
});

export type XUser = z.infer<typeof xUserSchema>["data"];

/** Thrown when a refresh_token can no longer be exchanged (user must reconnect). */
export class XReconnectRequiredError extends Error {
  constructor(message = "X integration needs to be reconnected.") {
    super(message);
    this.name = "XReconnectRequiredError";
  }
}

/** Exchange an authorization code for tokens (called from the OAuth callback). */
export async function exchangeCodeForToken(params: {
  code: string;
  codeVerifier: string;
}): Promise<XTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: getRedirectUri(),
    code_verifier: params.codeVerifier,
    client_id: getClientId(),
  });

  const res = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`X token exchange failed (${res.status}).`);
  }

  return tokenResponseSchema.parse(await res.json());
}

/** Fetch the authenticated X user's profile using a bearer access token. */
export async function fetchXUser(accessToken: string): Promise<XUser> {
  const url = new URL(X_USERS_ME_URL);
  url.searchParams.set("user.fields", "profile_image_url");

  const res = await fetch(url, {
    headers: getXApiHeaders(accessToken),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`X /users/me failed (${res.status}).`);
  }

  return xUserSchema.parse(await res.json()).data;
}

export function getXApiHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

/**
 * Ensure the integration has a valid (non-expiring-soon) access token.
 *
 * - If it expires more than 1h out, returns it unchanged (no network call).
 * - Otherwise refreshes via the refresh_token, re-encrypts, and persists.
 * - On refresh failure, marks the integration inactive and throws
 *   XReconnectRequiredError so callers can surface a "Reconnect" prompt.
 */
export async function refreshXToken(integration: Integration): Promise<Integration> {
  const expiresAt = integration.expiresAt?.getTime() ?? 0;
  if (expiresAt > Date.now() + REFRESH_WINDOW_MS) {
    return integration;
  }

  if (!integration.refreshToken) {
    await markStale(integration.id);
    throw new XReconnectRequiredError("No refresh token stored for X integration.");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: decrypt(integration.refreshToken),
    client_id: getClientId(),
  });

  const res = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    await markStale(integration.id);
    throw new XReconnectRequiredError(`X token refresh failed (${res.status}).`);
  }

  const tokens = tokenResponseSchema.parse(await res.json());

  return db.integration.update({
    where: { id: integration.id },
    data: {
      accessToken: encrypt(tokens.access_token),
      // X rotates refresh tokens; keep the previous one if none returned.
      refreshToken: tokens.refresh_token
        ? encrypt(tokens.refresh_token)
        : integration.refreshToken,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      isActive: true,
    },
  });
}

async function markStale(integrationId: string): Promise<void> {
  await db.integration.update({
    where: { id: integrationId },
    data: { isActive: false },
  });
}
