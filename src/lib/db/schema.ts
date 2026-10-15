import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * Task status lifecycle reported by remote agents.
 * Kept as a const tuple so both Drizzle and Zod can share the single source of truth.
 */
export const TASK_STATUSES = [
  "queued",
  "running",
  "paused",
  "completed",
  "failed",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/**
 * Canonical task record. One row per logical task, identified by the natural key
 * (hostname, project_path, task_key). Reports upsert this row with the latest state.
 */
export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    hostname: text("hostname").notNull(),
    projectPath: text("project_path").notNull(),
    taskKey: text("task_key").notNull(),
    title: text("title").notNull(),
    status: text("status", { enum: TASK_STATUSES }).notNull().default("queued"),
    progress: integer("progress").notNull().default(0),
    summary: text("summary"),
    agent: text("agent"),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("tasks_natural_key_idx").on(
      table.hostname,
      table.projectPath,
      table.taskKey,
    ),
    index("tasks_status_idx").on(table.status),
    index("tasks_updated_at_idx").on(table.updatedAt),
  ],
);

/**
 * Immutable, append-only timeline of every report received for a task.
 * Never updated or deleted except via cascade when the parent task is removed.
 */
export const taskEvents = sqliteTable(
  "task_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    status: text("status", { enum: TASK_STATUSES }).notNull(),
    progress: integer("progress").notNull(),
    summary: text("summary"),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [index("task_events_task_id_idx").on(table.taskId)],
);

/**
 * API keys for machine ingestion. Only the SHA-256 hash is stored; the plaintext
 * is shown to the operator exactly once at creation time.
 */
export const apiKeys = sqliteTable(
  "api_keys",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [uniqueIndex("api_keys_key_hash_idx").on(table.keyHash)],
);

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskEvent = typeof taskEvents.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
