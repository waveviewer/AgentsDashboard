import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http/envelope";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { EventRepository } from "@/lib/repositories/event";
import { TaskRepository } from "@/lib/repositories/task";
import { taskUpdateSchema } from "@/lib/validation/task";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

async function guard(): Promise<Response | null> {
  try {
    await requireSession();
    return null;
  } catch (error) {
    if (error instanceof UnauthorizedError) return fail("Unauthorized", 401);
    throw error;
  }
}

/** GET /api/tasks/:id — task detail plus its full event timeline. */
export async function GET(_request: NextRequest, context: Context) {
  const denied = await guard();
  if (denied) return denied;

  const { id } = await context.params;
  const repo = new TaskRepository(db);
  const task = repo.findById(id);
  if (!task) return fail("Task not found", 404);

  const events = new EventRepository(db).findByTaskId(id);
  return ok({ task, events });
}

/** PATCH /api/tasks/:id — operator edit of task fields. */
export async function PATCH(request: NextRequest, context: Context) {
  const denied = await guard();
  if (denied) return denied;

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = taskUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
      .join("; ");
    return fail(message, 422);
  }

  const repo = new TaskRepository(db);
  const updated = repo.update(id, parsed.data);
  if (!updated) return fail("Task not found", 404);

  return ok(updated);
}

/** DELETE /api/tasks/:id — remove a task (cascades its events). */
export async function DELETE(_request: NextRequest, context: Context) {
  const denied = await guard();
  if (denied) return denied;

  const { id } = await context.params;
  const repo = new TaskRepository(db);
  const removed = repo.delete(id);
  if (!removed) return fail("Task not found", 404);

  return ok({ id });
}
