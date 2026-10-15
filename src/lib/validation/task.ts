import { z } from "zod";
import { TASK_STATUSES } from "@/lib/db/schema";

const MAX_STR = 512;
const MAX_SUMMARY = 4096;
const MAX_PROGRESS = 100;

/**
 * Schema for operator edits to a task from the dashboard. All fields optional
 * (partial update) but at least one must be present. `.strict()` rejects unknown keys.
 */
export const taskUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(MAX_STR).optional(),
    status: z.enum(TASK_STATUSES).optional(),
    progress: z.coerce.number().int().min(0).max(MAX_PROGRESS).optional(),
    summary: z.string().trim().max(MAX_SUMMARY).nullable().optional(),
    agent: z.string().trim().max(MAX_STR).nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type TaskUpdatePayload = z.infer<typeof taskUpdateSchema>;

/**
 * Schema for the task-list query string. Coerces/validates pagination and
 * filters so the repository always receives clean, bounded values.
 */
export const taskQuerySchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  hostname: z.string().trim().min(1).max(MAX_STR).optional(),
  search: z.string().trim().min(1).max(MAX_STR).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type TaskQuery = z.infer<typeof taskQuerySchema>;

/** Schema for creating an API key. */
export const apiKeyCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(MAX_STR),
  })
  .strict();
