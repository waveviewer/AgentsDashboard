import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http/envelope";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { ApiKeyRepository } from "@/lib/repositories/api-key";
import { apiKeyCreateSchema } from "@/lib/validation/task";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard(): Promise<Response | null> {
  try {
    await requireSession();
    return null;
  } catch (error) {
    if (error instanceof UnauthorizedError) return fail("Unauthorized", 401);
    throw error;
  }
}

/** Strip the secret hash before returning a key to the client. */
function toSafeKey(key: {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: key.id,
    name: key.name,
    keyPrefix: key.keyPrefix,
    lastUsedAt: key.lastUsedAt,
    revokedAt: key.revokedAt,
    createdAt: key.createdAt,
  };
}

/** GET /api/api-keys — list keys (never exposes hashes or plaintext). */
export async function GET() {
  const denied = await guard();
  if (denied) return denied;

  const repo = new ApiKeyRepository(db);
  return ok(repo.list().map(toSafeKey));
}

/**
 * POST /api/api-keys — create a key. Returns the plaintext exactly once; it is
 * never retrievable again (only the hash is stored).
 */
export async function POST(request: NextRequest) {
  const denied = await guard();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = apiKeyCreateSchema.safeParse(body);
  if (!parsed.success) return fail("A key name is required", 422);

  const repo = new ApiKeyRepository(db);
  const { record, plaintext } = repo.create(parsed.data.name);

  // plaintext is surfaced only here, once.
  return ok({ ...toSafeKey(record), plaintext }, { status: 201 });
}
