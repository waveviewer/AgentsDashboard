import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Prefix shown in the UI to help operators identify a key without revealing it. */
const KEY_PREFIX = "adk_"; // Agents Dashboard Key
const RANDOM_BYTES = 32;
const PREFIX_DISPLAY_LEN = 12;

export interface GeneratedApiKey {
  /** Full plaintext key — shown to the operator exactly once. */
  plaintext: string;
  /** SHA-256 hex hash — the only form persisted. */
  hash: string;
  /** Short non-secret prefix stored for display (e.g. "adk_a1b2c3d4"). */
  prefix: string;
}

/** Hash a plaintext key with SHA-256. Deterministic, so we can look up by hash. */
export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex");
}

/** Generate a new random API key plus its hash and display prefix. */
export function generateApiKey(): GeneratedApiKey {
  const plaintext = KEY_PREFIX + randomBytes(RANDOM_BYTES).toString("base64url");
  return {
    plaintext,
    hash: hashApiKey(plaintext),
    prefix: plaintext.slice(0, PREFIX_DISPLAY_LEN),
  };
}

/**
 * Constant-time comparison of a candidate plaintext against a stored hash.
 * Guards against timing attacks on key verification.
 */
export function verifyApiKey(plaintext: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashApiKey(plaintext), "hex");
  const stored = Buffer.from(storedHash, "hex");
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}
