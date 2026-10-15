import { afterEach, describe, expect, test } from "vitest";
import { checkRateLimit, resetRateLimits } from "@/lib/http/rate-limit";

describe("checkRateLimit", () => {
  afterEach(() => resetRateLimits());

  test("allows requests up to the limit then blocks", () => {
    // Arrange: default limit is 60 per 60s (from tests/setup.ts)
    const key = "key-a";
    let last;

    // Act: fire 60 allowed, then one over
    for (let i = 0; i < 60; i++) {
      last = checkRateLimit(key, 1000);
      expect(last.allowed).toBe(true);
    }
    const over = checkRateLimit(key, 1000);

    // Assert
    expect(over.allowed).toBe(false);
    expect(over.remaining).toBe(0);
    expect(last?.remaining).toBe(0);
  });

  test("separate keys have independent budgets", () => {
    for (let i = 0; i < 60; i++) checkRateLimit("key-a", 1000);
    expect(checkRateLimit("key-a", 1000).allowed).toBe(false);
    expect(checkRateLimit("key-b", 1000).allowed).toBe(true);
  });

  test("window resets after it elapses", () => {
    for (let i = 0; i < 60; i++) checkRateLimit("key-a", 1000);
    expect(checkRateLimit("key-a", 1000).allowed).toBe(false);

    // Jump past the 60s window
    const after = checkRateLimit("key-a", 1000 + 60_001);
    expect(after.allowed).toBe(true);
    expect(after.remaining).toBe(59);
  });
});
