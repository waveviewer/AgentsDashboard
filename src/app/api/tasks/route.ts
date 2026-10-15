import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http/envelope";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { TaskRepository } from "@/lib/repositories/task";
import { taskQuerySchema } from "@/lib/validation/task";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/tasks — session-guarded task list with filtering + pagination.
 * Query: status, hostname, search, page, limit.
 */
export async function GET(request: NextRequest) {
  try {
    await requireSession();
  } catch (error) {
    if (error instanceof UnauthorizedError) return fail("Unauthorized", 401);
    throw error;
  }

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = taskQuerySchema.safeParse(params);
  if (!parsed.success) {
    return fail("Invalid query parameters", 422);
  }

  const { status, hostname, search, page, limit } = parsed.data;
  const repo = new TaskRepository(db);
  const result = repo.findAll({ status, hostname, search }, page, limit);

  return ok(result.items, {
    meta: { total: result.total, page: result.page, limit: result.limit },
  });
}
