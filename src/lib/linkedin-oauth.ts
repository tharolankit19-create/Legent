import { z } from "zod";
import type { Integration } from "@prisma/client";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { generateState } from "@/lib/x-oauth";

/**
 * LinkedIn OAuth 2.0 Authorization Code flow (confidential client, no PKCE).
 *
 * LinkedIn member tokens last ~60 days and — without the restricted
 * "programmatic refresh" product — cannot be refreshed; users reconnect.
 *
 * Scope note: the spec asked for "openid profile email", but publishing posts
 * requires w_member_social, so it is added here. Profile data comes from
 * /v2/userinfo (the OIDC endpoint that matches these scopes; /v2/me needs the
 * legacy r_liteprofile permission that new apps don't get).
 */

const LINKEDIN_WEB_BASE = process.env.LINKEDIN_WEB_BASE ?? "https://www.linkedin.com";
const LINKEDIN_API_BASE = process.env.LINKEDIN_API_BASE ?? "https://api.linkedin.com";

export const LINKEDIN_SCOPES = ["openid", "profile", "email", "w_member_social"];

// Ask users to reconnect when within this window of the ~60-day expiry.
const RECONNECT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 1 month

export { generateState };

function getClientId(): string {
  const id = process.env.LINKEDIN_CLIENT_ID;
  if (!id) throw new Error("LINKEDIN_CLIENT_ID is not set.");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!secret) throw new Error("LINKEDIN_CLIENT_SECRET is not set.");
  return secret;
}

function appBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function getLinkedInRedirectUri(): string {
  return `${appBaseUrl()}/api/auth/linkedin/callback`;
}

export function buildLinkedInAuthorizeUrl(state: string): string {
  const query = new URLSearchParams({
    response_type: "code",
    client_id: getClientId(),
    redirect_uri: getLinkedInRedirectUri(),
    scope: LINKEDIN_SCOPES.join(" "),
    state,
  });
  return `${LINKEDIN_WEB_BASE}/oauth/v2/authorization?${query.toString()}`;
}

const tokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
});

export type LinkedInTokenResponse = z.infer<typeof tokenResponseSchema>;

const userInfoSchema = z.object({
  sub: z.string(),
  name: z.string().optional(),
  given_name: z.string().optional(),
  email: z.string().optional(),
  picture: z.string().optional(),
});

export type LinkedInUser = z.infer<typeof userInfoSchema>;

export class LinkedInReconnectRequiredError extends Error {
  constructor(message = "LinkedIn integration needs to be reconnected.") {
    super(message);
    this.name = "LinkedInReconnectRequiredError";
  }
}

export async function exchangeLinkedInCode(code: string): Promise<LinkedInTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: getClientId(),
    client_secret: getClientSecret(),
    redirect_uri: getLinkedInRedirectUri(),
  });

  const res = await fetch(`${LINKEDIN_WEB_BASE}/oauth/v2/accessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`LinkedIn token exchange failed (${res.status}).`);
  }

  return tokenResponseSchema.parse(await res.json());
}

export async function fetchLinkedInUser(accessToken: string): Promise<LinkedInUser> {
  const res = await fetch(`${LINKEDIN_API_BASE}/v2/userinfo`, {
    headers: getLinkedInApiHeaders(accessToken),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`LinkedIn /v2/userinfo failed (${res.status}).`);
  }

  return userInfoSchema.parse(await res.json());
}

export function getLinkedInApiHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

/**
 * LinkedIn has no self-serve refresh flow. If the token is more than a month
 * from expiry, use it as-is; otherwise mark the integration stale and ask the
 * user to reconnect.
 */
export async function ensureLinkedInToken(integration: Integration): Promise<Integration> {
  const expiresAt = integration.expiresAt?.getTime() ?? 0;
  if (integration.isActive && expiresAt > Date.now() + RECONNECT_WINDOW_MS) {
    return integration;
  }

  await db.integration.update({
    where: { id: integration.id },
    data: { isActive: false },
  });
  throw new LinkedInReconnectRequiredError();
}

/** Decrypted bearer headers for an integration (does not hit the network). */
export function linkedInHeadersFor(integration: Integration): Record<string, string> {
  return getLinkedInApiHeaders(decrypt(integration.accessToken));
}
