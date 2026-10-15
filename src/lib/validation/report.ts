import { z } from "zod";
import { TASK_STATUSES } from "@/lib/db/schema";

const MAX_STR = 512;
const MAX_PATH = 1024;
const MAX_SUMMARY = 4096;
const MAX_PROGRESS = 100;

/**
 * Schema for an incoming ingestion report. Validated at the API boundary before
 * anything touches the DB. `.strict()` rejects unknown fields so malformed or
 * malicious payloads fail fast rather than being silently stored.
 */
export const reportSchema = z
  .object({
    hostname: z.string().trim().min(1).max(MAX_STR),
    project_path: z.string().trim().min(1).max(MAX_PATH),
    task_key: z.string().trim().min(1).max(MAX_STR),
    title: z.string().trim().min(1).max(MAX_STR),
    status: z.enum(TASK_STATUSES),
    progress: z.coerce.number().int().min(0).max(MAX_PROGRESS),
    summary: z.string().trim().max(MAX_SUMMARY).optional().nullable(),
    agent: z.string().trim().max(MAX_STR).optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  })
  .strict();

export type ReportInput = z.infer<typeof reportSchema>;

/** Map validated snake_case payload to the repository's camelCase report shape. */
export function toTaskReport(input: ReportInput) {
  return {
    hostname: input.hostname,
    projectPath: input.project_path,
    taskKey: input.task_key,
    title: input.title,
    status: input.status,
    progress: input.progress,
    summary: input.summary ?? null,
    agent: input.agent ?? null,
    metadata: input.metadata ?? null,
  };
}
