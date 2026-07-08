import crypto from "node:crypto";

/**
 * AES-256-GCM token encryption for platform integration tokens.
 *
 * Wire format: base64( iv[12] || ciphertext[n] || authTag[16] )
 *
 * Implemented with Node's `crypto` (not WebCrypto `crypto.subtle`) because the
 * public API here is synchronous and `generateIV` returns a Node `Buffer` —
 * `crypto.subtle` is Promise-based and works in ArrayBuffers, so it cannot
 * satisfy those signatures. This module only runs server-side (API routes).
 */

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32; // AES-256
const IV_BYTES = 12; // 96-bit nonce — the size GCM is defined and optimized for
const AUTH_TAG_BYTES = 16;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY ?? process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("ENCRYPTION_KEY is not set — cannot encrypt/decrypt tokens.");
  }

  const key = Buffer.from(raw, "hex");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `ENCRYPTION_KEY must be ${KEY_BYTES} bytes (${KEY_BYTES * 2} hex chars); got ${key.length} bytes.`,
    );
  }
  return key;
}

/** A fresh random nonce for every encryption. Never reuse an IV with the same key. */
export function generateIV(): Buffer {
  return crypto.randomBytes(IV_BYTES);
}

export function encrypt(plaintext: string): string {
  const iv = generateIV();
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, ciphertext, authTag]).toString("base64");
}

export function decrypt(encrypted: string): string {
  const data = Buffer.from(encrypted, "base64");
  if (data.length < IV_BYTES + AUTH_TAG_BYTES) {
    throw new Error("Invalid encrypted payload: too short.");
  }

  const iv = data.subarray(0, IV_BYTES);
  const authTag = data.subarray(data.length - AUTH_TAG_BYTES);
  const ciphertext = data.subarray(IV_BYTES, data.length - AUTH_TAG_BYTES);

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
