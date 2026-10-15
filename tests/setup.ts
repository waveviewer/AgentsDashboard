import "@testing-library/jest-dom/vitest";

/**
 * Global test setup. Forces a predictable environment for every test run:
 *  - deterministic auth secret so Better Auth can initialise
 *  - in-memory-ish defaults; individual DB tests create their own :memory: db
 */
process.env.BETTER_AUTH_SECRET ??= "test-secret-at-least-32-characters-long!!";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.INGEST_RATE_LIMIT ??= "60";
process.env.INGEST_RATE_WINDOW_MS ??= "60000";
process.env.INGEST_MAX_BODY_BYTES ??= "16384";
