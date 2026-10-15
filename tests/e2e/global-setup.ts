import { existsSync, rmSync } from "node:fs";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDatabase } from "@/lib/db";
import { createAuth } from "@/lib/auth/auth";
import { ApiKeyRepository } from "@/lib/repositories/api-key";
import { TaskRepository } from "@/lib/repositories/task";

const ADMIN_EMAIL = "e2e-admin@example.com";
const ADMIN_PASSWORD = "e2e-password-123";
const DB_PATH = "./data/e2e.db";

/**
 * Prepare the e2e database before the app boots: migrate a clean DB, seed the
 * admin, mint an API key, and ingest one task (so the list/detail flow has data).
 * The webServer in playwright.config points at this same DATABASE_URL.
 */
export default async function globalSetup() {
  process.env.DATABASE_URL = DB_PATH;
  process.env.BETTER_AUTH_SECRET ??=
    "e2e-test-secret-at-least-32-characters-long";
  process.env.BETTER_AUTH_URL ??= "http://localhost:3100";

  // Start from a clean DB each run so assertions (e.g. task present then deleted)
  // are deterministic. Remove the file plus its WAL/SHM sidecars.
  for (const suffix of ["", "-wal", "-shm"]) {
    if (existsSync(DB_PATH + suffix)) rmSync(DB_PATH + suffix);
  }

  const { db } = createDatabase(DB_PATH);
  migrate(db, { migrationsFolder: "./drizzle" });

  const seedAuth = createAuth(db, { allowSignUp: true });
  try {
    await seedAuth.api.signUpEmail({
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: "E2E Admin" },
    });
  } catch {
    // already seeded on a previous run
  }

  new ApiKeyRepository(db).create("e2e-key");
  new TaskRepository(db).upsertFromReport({
    hostname: "e2e-host",
    projectPath: "/srv/e2e",
    taskKey: "e2e-login-task",
    title: "E2E login task",
    status: "running",
    progress: 42,
    summary: "seeded for e2e",
    agent: "claude-opus-4-8",
    metadata: null,
  });
}
