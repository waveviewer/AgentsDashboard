import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createTestDb } from "../../helpers/db";
import type { AppDatabase } from "@/lib/db";
import { TaskRepository, type TaskReport } from "@/lib/repositories/task";
import { EventRepository } from "@/lib/repositories/event";

function makeReport(overrides: Partial<TaskReport> = {}): TaskReport {
  return {
    hostname: "server-a",
    projectPath: "/srv/projX",
    taskKey: "build-login",
    title: "Implement login",
    status: "running",
    progress: 25,
    summary: "started",
    agent: "claude-opus-4-8",
    metadata: { step: "1/4" },
    ...overrides,
  };
}

describe("TaskRepository", () => {
  let db: AppDatabase;
  let close: () => void;
  let repo: TaskRepository;
  let events: EventRepository;

  beforeEach(() => {
    const testDb = createTestDb();
    db = testDb.db;
    close = testDb.close;
    repo = new TaskRepository(db);
    events = new EventRepository(db);
  });

  afterEach(() => close());

  test("upsertFromReport inserts a new task and first event", () => {
    const task = repo.upsertFromReport(makeReport());

    expect(task.id).toBeTruthy();
    expect(task.status).toBe("running");
    expect(task.progress).toBe(25);

    const timeline = events.findByTaskId(task.id);
    expect(timeline).toHaveLength(1);
    expect(timeline[0].status).toBe("running");
  });

  test("upsertFromReport updates existing task by natural key and appends event", () => {
    const first = repo.upsertFromReport(makeReport());
    const second = repo.upsertFromReport(
      makeReport({ status: "completed", progress: 100, summary: "done" }),
    );

    // Same logical task — not a duplicate row.
    expect(second.id).toBe(first.id);
    expect(second.status).toBe("completed");
    expect(second.progress).toBe(100);

    const all = repo.findAll();
    expect(all.total).toBe(1);

    // Timeline preserves both reports.
    const timeline = events.findByTaskId(first.id);
    expect(timeline).toHaveLength(2);
    expect(timeline.map((e) => e.status)).toEqual(["running", "completed"]);
  });

  test("different natural keys create distinct tasks", () => {
    repo.upsertFromReport(makeReport({ taskKey: "a" }));
    repo.upsertFromReport(makeReport({ taskKey: "b" }));
    repo.upsertFromReport(makeReport({ hostname: "server-b", taskKey: "a" }));

    expect(repo.findAll().total).toBe(3);
  });

  test("findById returns the task or undefined", () => {
    const task = repo.upsertFromReport(makeReport());
    expect(repo.findById(task.id)?.id).toBe(task.id);
    expect(repo.findById("missing")).toBeUndefined();
  });

  test("findAll filters by status", () => {
    repo.upsertFromReport(makeReport({ taskKey: "a", status: "running" }));
    repo.upsertFromReport(makeReport({ taskKey: "b", status: "failed" }));

    const result = repo.findAll({ status: "failed" });
    expect(result.total).toBe(1);
    expect(result.items[0].taskKey).toBe("b");
  });

  test("findAll filters by hostname", () => {
    repo.upsertFromReport(makeReport({ hostname: "h1", taskKey: "a" }));
    repo.upsertFromReport(makeReport({ hostname: "h2", taskKey: "b" }));

    const result = repo.findAll({ hostname: "h2" });
    expect(result.total).toBe(1);
    expect(result.items[0].hostname).toBe("h2");
  });

  test("findAll search matches title, taskKey or projectPath", () => {
    repo.upsertFromReport(
      makeReport({ taskKey: "deploy-api", title: "Deploy API" }),
    );
    repo.upsertFromReport(
      makeReport({ taskKey: "write-docs", title: "Write documentation" }),
    );

    expect(repo.findAll({ search: "deploy" }).total).toBe(1);
    expect(repo.findAll({ search: "documentation" }).total).toBe(1);
    expect(repo.findAll({ search: "/srv/projX" }).total).toBe(2);
  });

  test("findAll paginates and clamps limit", () => {
    for (let i = 0; i < 5; i++) {
      repo.upsertFromReport(makeReport({ taskKey: `task-${i}` }));
    }

    const page1 = repo.findAll({}, 1, 2);
    expect(page1.items).toHaveLength(2);
    expect(page1.total).toBe(5);
    expect(page1.limit).toBe(2);

    const page3 = repo.findAll({}, 3, 2);
    expect(page3.items).toHaveLength(1);

    // Over-max limit is clamped to 100, not rejected.
    expect(repo.findAll({}, 1, 9999).limit).toBe(100);
  });

  test("update changes fields and returns new row; undefined when missing", () => {
    const task = repo.upsertFromReport(makeReport());
    const updated = repo.update(task.id, { title: "Renamed", progress: 50 });

    expect(updated?.title).toBe("Renamed");
    expect(updated?.progress).toBe(50);
    expect(repo.update("missing", { title: "x" })).toBeUndefined();
  });

  test("delete removes task and cascades events", () => {
    const task = repo.upsertFromReport(makeReport());
    expect(events.findByTaskId(task.id)).toHaveLength(1);

    expect(repo.delete(task.id)).toBe(true);
    expect(repo.findById(task.id)).toBeUndefined();
    expect(events.findByTaskId(task.id)).toHaveLength(0);
    expect(repo.delete(task.id)).toBe(false);
  });
});
