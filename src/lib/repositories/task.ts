import { and, count, desc, eq, like, or, type SQL } from "drizzle-orm";
import type { AppDatabase } from "@/lib/db";
import { taskEvents, tasks, type Task, type TaskStatus } from "@/lib/db/schema";

export interface TaskReport {
  hostname: string;
  projectPath: string;
  taskKey: string;
  title: string;
  status: TaskStatus;
  progress: number;
  summary?: string | null;
  agent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface TaskListFilters {
  status?: TaskStatus;
  hostname?: string;
  search?: string;
}

export interface TaskListResult {
  items: Task[];
  total: number;
  page: number;
  limit: number;
}

export interface TaskUpdateInput {
  title?: string;
  status?: TaskStatus;
  progress?: number;
  summary?: string | null;
  agent?: string | null;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Data access for tasks. All methods return new objects straight from the DB;
 * nothing is mutated in place. The repository owns the upsert+event-append
 * transaction so a report is always recorded atomically.
 */
export class TaskRepository {
  constructor(private readonly db: AppDatabase) {}

  /**
   * Record a report: upsert the canonical task row by its natural key and append
   * an immutable event. Runs in a single transaction so the task row and its
   * timeline never diverge.
   */
  upsertFromReport(report: TaskReport): Task {
    const now = new Date();
    return this.db.transaction((tx) => {
      const existing = tx
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.hostname, report.hostname),
            eq(tasks.projectPath, report.projectPath),
            eq(tasks.taskKey, report.taskKey),
          ),
        )
        .get();

      let task: Task;
      if (existing) {
        task = tx
          .update(tasks)
          .set({
            title: report.title,
            status: report.status,
            progress: report.progress,
            summary: report.summary ?? existing.summary,
            agent: report.agent ?? existing.agent,
            metadata: report.metadata ?? existing.metadata,
            updatedAt: now,
          })
          .where(eq(tasks.id, existing.id))
          .returning()
          .get();
      } else {
        task = tx
          .insert(tasks)
          .values({
            hostname: report.hostname,
            projectPath: report.projectPath,
            taskKey: report.taskKey,
            title: report.title,
            status: report.status,
            progress: report.progress,
            summary: report.summary ?? null,
            agent: report.agent ?? null,
            metadata: report.metadata ?? null,
            createdAt: now,
            updatedAt: now,
          })
          .returning()
          .get();
      }

      tx.insert(taskEvents)
        .values({
          taskId: task.id,
          status: report.status,
          progress: report.progress,
          summary: report.summary ?? null,
          metadata: report.metadata ?? null,
          createdAt: now,
        })
        .run();

      return task;
    });
  }

  findById(id: string): Task | undefined {
    return this.db.select().from(tasks).where(eq(tasks.id, id)).get();
  }

  findAll(
    filters: TaskListFilters = {},
    page = 1,
    limit = DEFAULT_LIMIT,
  ): TaskListResult {
    const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
    const safePage = Math.max(1, page);
    const offset = (safePage - 1) * safeLimit;

    const conditions: SQL[] = [];
    if (filters.status) conditions.push(eq(tasks.status, filters.status));
    if (filters.hostname) conditions.push(eq(tasks.hostname, filters.hostname));
    if (filters.search) {
      const term = `%${filters.search}%`;
      const searchClause = or(
        like(tasks.title, term),
        like(tasks.taskKey, term),
        like(tasks.projectPath, term),
      );
      if (searchClause) conditions.push(searchClause);
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const items = this.db
      .select()
      .from(tasks)
      .where(where)
      .orderBy(desc(tasks.updatedAt))
      .limit(safeLimit)
      .offset(offset)
      .all();

    const totalRow = this.db
      .select({ value: count() })
      .from(tasks)
      .where(where)
      .get();

    return {
      items,
      total: totalRow?.value ?? 0,
      page: safePage,
      limit: safeLimit,
    };
  }

  update(id: string, input: TaskUpdateInput): Task | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;
    return this.db
      .update(tasks)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  }

  delete(id: string): boolean {
    const result = this.db.delete(tasks).where(eq(tasks.id, id)).run();
    return result.changes > 0;
  }
}
