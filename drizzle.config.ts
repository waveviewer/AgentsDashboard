import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config for SQLite migrations. The database file path is read from
 * the environment so dev / test / prod can point at different files.
 */
export default defineConfig({
  dialect: "sqlite",
  schema: ["./src/lib/db/schema.ts", "./src/lib/db/auth-schema.ts"],
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "./data/app.db",
  },
  strict: true,
  verbose: true,
});
