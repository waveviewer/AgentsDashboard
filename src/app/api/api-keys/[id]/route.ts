import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http/envelope";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { ApiKeyRepository } from "@/lib/repositories/api-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** DELETE /api/api-keys/:id — soft-revoke a key so it can no longer ingest. */
export async function DELETE(_request: NextRequest, context: Context) {
  try {
    await requireSession();
  } catch (error) {
    if (error instanceof UnauthorizedError) return fail("Unauthorized", 401);
    throw error;
  }

  const { id } = await context.params;
  const repo = new ApiKeyRepository(db);
  const revoked = repo.revoke(id);
  if (!revoked) return fail("API key not found", 404);

  return ok({ id });
}
