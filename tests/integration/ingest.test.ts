import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import type { AppDatabase } from "@/lib/db";
import { ApiKeyRepository } from "@/lib/repositories/api-key";
import { EventRepository } from "@/lib/repositories/event";
import { processReport } from "@/lib/services/ingest";
import { resetRateLimits } from "@/lib/http/rate-limit";

const validBody = {
  hostname: "server-a",
  project_path: "/srv/projX",
  task_key: "build-login",
  title: "Implement login",
  status: "running",
  progress: 40,
  summary: "writing tests",
};

describe("processReport (ingestion pipeline)", () => {
  let db: AppDatabase;
  let close: () => void;
  let token: string;

  beforeEach(() => {
    const testDb = createTestDb();
    db = testDb.db;
    close = testDb.close;
    token = new ApiKeyRepository(db).create("server-a").plaintext;
  });

  afterEach(() => {
    close();
    resetRateLimits();
  });

  test("rejects a missing token as unauthorized", () => {
    const result = processReport({ db }, null, validBody);
    expect(result.kind).toBe("unauthorized");
  });

  test("rejects an unknown token as unauthorized", () => {
    const result = processReport({ db }, "adk_not-real", validBody);
    expect(result.kind).toBe("unauthorized");
  });

  test("rejects a revoked key as unauthorized", () => {
    const keys = new ApiKeyRepository(db);
    const created = keys.create("temp");
    keys.revoke(created.record.id);
    const result = processReport({ db }, created.plaintext, validBody);
    expect(result.kind).toBe("unauthorized");
  });

  test("rejects an invalid payload with details", () => {
    const result = processReport({ db }, token, { hostname: "only" });
    expect(result.kind).toBe("invalid");
    if (result.kind === "invalid") expect(result.message).toBeTruthy();
  });

  test("accepts a valid report and persists task + event", () => {
    const result = processReport({ db }, token, validBody);

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(result.task.status).toBe("running");
    expect(result.task.progress).toBe(40);

    const timeline = new EventRepository(db).findByTaskId(result.task.id);
    expect(timeline).toHaveLength(1);
  });

  test("second report for the same natural key updates not duplicates", () => {
    processReport({ db }, token, validBody);
    const second = processReport({ db }, token, {
      ...validBody,
      status: "completed",
      progress: 100,
    });

    expect(second.kind).toBe("ok");
    if (second.kind !== "ok") return;

    const timeline = new EventRepository(db).findByTaskId(second.task.id);
    expect(timeline).toHaveLength(2);
  });

  test("enforces the per-key rate limit", () => {
    const now = () => 1000;
    for (let i = 0; i < 60; i++) {
      expect(processReport({ db, now }, token, validBody).kind).toBe("ok");
    }
    const over = processReport({ db, now }, token, validBody);
    expect(over.kind).toBe("rate_limited");
  });
});
