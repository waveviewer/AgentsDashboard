import { asc, eq } from "drizzle-orm";
import type { AppDatabase } from "@/lib/db";
import { taskEvents, type TaskEvent } from "@/lib/db/schema";

/**
 * Read access to the append-only task timeline. Writes happen inside
 * TaskRepository.upsertFromReport so the task row and its first event are atomic;
 * this repository exposes standalone append + query for other callers and tests.
 */
export class EventRepository {
  constructor(private readonly db: AppDatabase) {}

  findByTaskId(taskId: string): TaskEvent[] {
    return this.db
      .select()
      .from(taskEvents)
      .where(eq(taskEvents.taskId, taskId))
      .orderBy(asc(taskEvents.createdAt))
      .all();
  }
}
