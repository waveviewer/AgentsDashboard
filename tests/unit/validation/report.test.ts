import { describe, expect, test } from "vitest";
import { reportSchema, toTaskReport } from "@/lib/validation/report";

const valid = {
  hostname: "server-a",
  project_path: "/srv/projX",
  task_key: "build-login",
  title: "Implement login",
  status: "running",
  progress: 60,
};

describe("reportSchema", () => {
  test("accepts a valid minimal report", () => {
    const result = reportSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  test("accepts optional summary, agent and metadata", () => {
    const result = reportSchema.safeParse({
      ...valid,
      summary: "halfway",
      agent: "claude-opus-4-8",
      metadata: { step: "3/5" },
    });
    expect(result.success).toBe(true);
  });

  test("rejects unknown fields (strict)", () => {
    const result = reportSchema.safeParse({ ...valid, evil: "payload" });
    expect(result.success).toBe(false);
  });

  test("rejects an invalid status", () => {
    const result = reportSchema.safeParse({ ...valid, status: "exploded" });
    expect(result.success).toBe(false);
  });

  test("rejects missing required fields", () => {
    const result = reportSchema.safeParse({ hostname: "a" });
    expect(result.success).toBe(false);
  });

  test("rejects out-of-range progress", () => {
    expect(reportSchema.safeParse({ ...valid, progress: 150 }).success).toBe(
      false,
    );
    expect(reportSchema.safeParse({ ...valid, progress: -5 }).success).toBe(
      false,
    );
  });

  test("trims whitespace from strings", () => {
    const result = reportSchema.safeParse({ ...valid, hostname: "  server-a  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.hostname).toBe("server-a");
  });

  test("toTaskReport maps snake_case to camelCase repository shape", () => {
    const parsed = reportSchema.parse(valid);
    const report = toTaskReport(parsed);
    expect(report).toMatchObject({
      hostname: "server-a",
      projectPath: "/srv/projX",
      taskKey: "build-login",
      status: "running",
      progress: 60,
      summary: null,
      agent: null,
      metadata: null,
    });
  });
});
