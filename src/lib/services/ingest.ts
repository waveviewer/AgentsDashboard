import type { AppDatabase } from "@/lib/db";
import type { Task } from "@/lib/db/schema";
import { ApiKeyRepository } from "@/lib/repositories/api-key";
import { TaskRepository } from "@/lib/repositories/task";
import { checkRateLimit } from "@/lib/http/rate-limit";
import { reportSchema, toTaskReport } from "@/lib/validation/report";

/**
 * Outcome of processing an ingestion report. A discriminated union keyed by
 * `kind` so callers (the route handler) can map each case to an HTTP status
 * without the service knowing anything about HTTP.
 */
export type IngestResult =
  | { kind: "ok"; task: Task }
  | { kind: "unauthorized" }
  | { kind: "rate_limited"; retryAfterMs: number }
  | { kind: "invalid"; message: string };

export interface IngestDeps {
  db: AppDatabase;
  /** Injectable clock for deterministic rate-limit tests. */
  now?: () => number;
}

/**
 * Core ingestion pipeline: authenticate the API key, enforce the per-key rate
 * limit, validate the payload, then atomically upsert the task + append an event.
 * Pure of HTTP concerns so it can be unit-tested directly against a test DB.
 */
export function processReport(
  deps: IngestDeps,
  token: string | null,
  rawBody: unknown,
): IngestResult {
  if (!token) return { kind: "unauthorized" };

  const apiKeys = new ApiKeyRepository(deps.db);
  const key = apiKeys.verify(token);
  if (!key) return { kind: "unauthorized" };

  const now = deps.now?.() ?? Date.now();
  const limit = checkRateLimit(key.id, now);
  if (!limit.allowed) {
    return { kind: "rate_limited", retryAfterMs: Math.max(0, limit.resetAt - now) };
  }

  const parsed = reportSchema.safeParse(rawBody);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
      .join("; ");
    return { kind: "invalid", message };
  }

  const tasks = new TaskRepository(deps.db);
  const task = tasks.upsertFromReport(toTaskReport(parsed.data));
  return { kind: "ok", task };
}
