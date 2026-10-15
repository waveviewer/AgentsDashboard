/**
 * In-memory fixed-window rate limiter keyed by an arbitrary identifier (API key id).
 *
 * Limitation (documented, intentional for a single-host deployment): state lives
 * in process memory, so it resets on restart and is not shared across instances.
 * For multi-instance deployments swap this for a Redis-backed limiter — the
 * `checkRateLimit` signature is designed to make that drop-in.
 */
interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
}

function config(): { limit: number; windowMs: number } {
  return {
    limit: Number(process.env.INGEST_RATE_LIMIT ?? 60),
    windowMs: Number(process.env.INGEST_RATE_WINDOW_MS ?? 60_000),
  };
}

/**
 * Record a hit for `key` and report whether it is within the limit.
 * A fresh window starts whenever the previous one has elapsed.
 */
export function checkRateLimit(
  key: string,
  now: number = Date.now(),
): RateLimitResult {
  const { limit, windowMs } = config();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, limit, resetAt };
  }

  const count = existing.count + 1;
  buckets.set(key, { count, resetAt: existing.resetAt });
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    limit,
    resetAt: existing.resetAt,
  };
}

/** Test-only helper to clear limiter state between cases. */
export function resetRateLimits(): void {
  buckets.clear();
}
