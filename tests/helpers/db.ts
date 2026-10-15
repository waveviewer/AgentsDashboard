import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDatabase, type AppDatabase } from "@/lib/db";

/**
 * Build a fresh, fully-migrated in-memory database for a single test.
 * Each call is isolated — no shared state between tests.
 */
export function createTestDb(): {
  db: AppDatabase;
  close: () => void;
} {
  const { db, sqlite } = createDatabase(":memory:");
  migrate(db, { migrationsFolder: "./drizzle" });
  return { db, close: () => sqlite.close() };
}
