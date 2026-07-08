import crypto from "node:crypto";
import { z } from "zod";

/**
 * Dodo Payments: checkout creation + webhook signature verification.
 *
 * Webhook verification supports both schemes seen in the wild:
 *  1. `X-Dodo-Signature`: hex or base64 HMAC-SHA256 of the raw body.
 *  2. Standard-webhooks (`webhook-id`/`webhook-timestamp`/`webhook-signature`):
 *     HMAC-SHA256 over `${id}.${timestamp}.${body}`, base64, `v1,` prefixed.
 * Both use DODO_WEBHOOK_SECRET (fallback DODO_SECRET_KEY).
 */

const DODO_API_BASE = process.env.DODO_API_BASE ?? "https://test.dodopayments.com";

function getApiKey(): string {
  const key = process.env.DODO_API_KEY;
  if (!key) throw new Error("DODO_API_KEY is not set.");
  return key;
}

function getWebhookSecret(): string {
  const secret = process.env.DODO_WEBHOOK_SECRET ?? process.env.DODO_SECRET_KEY;
  if (!secret) throw new Error("DODO_WEBHOOK_SECRET is not set.");
  // Standard-webhooks secrets are often prefixed with "whsec_" and base64-encoded.
  return secret;
}

const checkoutResponseSchema = z
  .object({
    checkout_url: z.string().optional(),
    payment_link: z.string().optional(),
    url: z.string().optional(),
  })
  .passthrough();

export async function createDodoCheckout(params: {
  amountCents: number;
  currency: string;
  description: string;
  customerEmail: string;
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ checkoutUrl: string }> {
  const res = await fetch(`${DODO_API_BASE}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amountCents,
      currency: params.currency,
      description: params.description,
      customer_email: params.customerEmail,
      metadata: params.metadata,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Dodo checkout creation failed (${res.status}).`);
  }

  const json = checkoutResponseSchema.parse(await res.json());
  const checkoutUrl = json.checkout_url ?? json.payment_link ?? json.url;
  if (!checkoutUrl) {
    throw new Error("Dodo checkout response did not include a URL.");
  }
  return { checkoutUrl };
}

function secretBytes(): Buffer {
  const raw = getWebhookSecret();
  if (raw.startsWith("whsec_")) {
    return Buffer.from(raw.slice("whsec_".length), "base64");
  }
  return Buffer.from(raw, "utf8");
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function verifyDodoSignature(rawBody: string, headers: Headers): boolean {
  const key = secretBytes();

  const direct = headers.get("x-dodo-signature");
  if (direct) {
    const mac = crypto.createHmac("sha256", key).update(rawBody).digest();
    const candidates = [mac.toString("hex"), mac.toString("base64")];
    return candidates.some((c) => safeEqual(Buffer.from(c), Buffer.from(direct.trim())));
  }

  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signature = headers.get("webhook-signature");
  if (id && timestamp && signature) {
    const mac = crypto
      .createHmac("sha256", key)
      .update(`${id}.${timestamp}.${rawBody}`)
      .digest("base64");
    // Header may contain multiple space-separated "v1,<sig>" entries.
    return signature.split(" ").some((part) => {
      const value = part.includes(",") ? part.split(",")[1] : part;
      return safeEqual(Buffer.from(mac), Buffer.from(value));
    });
  }

  return false;
}

const webhookEventSchema = z.object({
  type: z.string(),
  data: z
    .object({
      payment_id: z.string().optional(),
      metadata: z.record(z.string(), z.string()).optional(),
    })
    .passthrough()
    .optional(),
});

export type DodoWebhookEvent = z.infer<typeof webhookEventSchema>;

export function parseDodoEvent(rawBody: string): DodoWebhookEvent | null {
  try {
    return webhookEventSchema.parse(JSON.parse(rawBody));
  } catch {
    return null;
  }
}
