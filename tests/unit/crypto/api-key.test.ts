import { describe, expect, test } from "vitest";
import {
  generateApiKey,
  hashApiKey,
  verifyApiKey,
} from "@/lib/crypto/api-key";

describe("api-key crypto", () => {
  test("generateApiKey produces prefixed plaintext, hash and prefix", () => {
    // Act
    const key = generateApiKey();

    // Assert
    expect(key.plaintext).toMatch(/^adk_/);
    expect(key.hash).toHaveLength(64); // sha256 hex
    expect(key.prefix).toHaveLength(12);
    expect(key.plaintext.startsWith(key.prefix)).toBe(true);
  });

  test("hashApiKey is deterministic for the same input", () => {
    const plaintext = "adk_example-key";
    expect(hashApiKey(plaintext)).toBe(hashApiKey(plaintext));
  });

  test("generated keys are unique", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.plaintext).not.toBe(b.plaintext);
    expect(a.hash).not.toBe(b.hash);
  });

  test("verifyApiKey returns true for a matching key", () => {
    const key = generateApiKey();
    expect(verifyApiKey(key.plaintext, key.hash)).toBe(true);
  });

  test("verifyApiKey returns false for a wrong key", () => {
    const key = generateApiKey();
    expect(verifyApiKey("adk_wrong-key", key.hash)).toBe(false);
  });

  test("verifyApiKey returns false when hash length differs", () => {
    const key = generateApiKey();
    expect(verifyApiKey(key.plaintext, "deadbeef")).toBe(false);
  });
});
