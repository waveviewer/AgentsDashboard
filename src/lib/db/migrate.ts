import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDatabase } from "./index";

/**
 * Standalone migration runner invoked by `pnpm db:migrate`.
 * Applies all pending migrations in ./drizzle to the configured database.
 */
function run(): void {
  const url = process.env.DATABASE_URL ?? "./data/app.db";
  const { db, sqlite } = createDatabase(url);
  console.log(`Running migrations on ${url} ...`);
  migrate(db, { migrationsFolder: "./drizzle" });
  sqlite.close();
  console.log("Migrations complete.");
}

run();
