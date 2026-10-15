import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import * as authSchema from "./auth-schema";

export const fullSchema = { ...schema, ...authSchema };

/**
 * Apply the pragmas we rely on for every connection:
 *  - WAL for concurrent reads during writes (dashboard reads while agents report)
 *  - foreign_keys ON so cascade deletes work (task_events, auth tables)
 *  - busy_timeout so brief write contention retries instead of throwing
 */
function applyPragmas(sqlite: Database.Database): void {
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
}

export type AppDatabase = ReturnType<typeof drizzle<typeof fullSchema>>;

/**
 * Create a Drizzle client over a better-sqlite3 connection.
 * Pass `:memory:` (the default when url is omitted) for isolated test databases.
 */
export function createDatabase(url: string = ":memory:"): {
  db: AppDatabase;
  sqlite: Database.Database;
} {
  if (url !== ":memory:") {
    const dir = dirname(url);
    if (dir && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
  const sqlite = new Database(url);
  applyPragmas(sqlite);
  const db = drizzle(sqlite, { schema: fullSchema });
  return { db, sqlite };
}

/**
 * Resolve the configured database path. Fails fast if DATABASE_URL is missing in
 * production so we never silently write to an unexpected location.
 */
function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required in production");
  }
  return "./data/app.db";
}

// Lazily-created singleton for the running app. Reused across dev hot-reloads via
// globalThis. Lazy so merely importing this module has no side effects (critical
// for tests, which spin up isolated :memory: databases of their own).
const globalForDb = globalThis as unknown as {
  __appDb?: { db: AppDatabase; sqlite: Database.Database };
};

function getAppDb(): { db: AppDatabase; sqlite: Database.Database } {
  if (!globalForDb.__appDb) {
    globalForDb.__appDb = createDatabase(resolveDatabaseUrl());
  }
  return globalForDb.__appDb;
}

/** The application Drizzle client. Opened on first access. */
export const db: AppDatabase = new Proxy({} as AppDatabase, {
  get(_target, prop) {
    const real = getAppDb().db;
    const value = Reflect.get(real, prop);
    // Bind methods back to the real client so Drizzle's `this` stays correct.
    return typeof value === "function" ? value.bind(real) : value;
  },
});

/** The underlying better-sqlite3 connection. Opened on first access. */
export function getSqlite(): Database.Database {
  return getAppDb().sqlite;
}
