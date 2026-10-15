import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { extractBearerToken } from "@/lib/http/bearer";
import { fail, ok } from "@/lib/http/envelope";
import { processReport } from "@/lib/services/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function maxBodyBytes(): number {
  return Number(process.env.INGEST_MAX_BODY_BYTES ?? 16_384);
}

/**
 * POST /api/v1/reports — ingestion endpoint for remote agents.
 * Auth: `Authorization: Bearer <api-key>`. Enforces body-size cap, per-key rate
 * limiting, and strict Zod validation before upserting the task + event.
 */
export async function POST(request: NextRequest) {
  const token = extractBearerToken(request.headers.get("authorization"));

  // Reject oversized bodies up front — cheap guard before reading/parsing.
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > maxBodyBytes()) {
    return fail("Request body too large", 413);
  }

  const raw = await request.text();
  if (raw.length > maxBodyBytes()) {
    return fail("Request body too large", 413);
  }

  let parsedJson: unknown;
  try {
    parsedJson = raw.length ? JSON.parse(raw) : undefined;
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const result = processReport({ db }, token, parsedJson);

  switch (result.kind) {
    case "ok":
      return ok(result.task, { status: 202 });
    case "unauthorized":
      return fail("Unauthorized", 401);
    case "rate_limited":
      return fail("Rate limit exceeded", 429, {
        "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)),
      });
    case "invalid":
      return fail(result.message, 422);
  }
}
