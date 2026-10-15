import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import type { AppDatabase } from "@/lib/db";
import { createAuth } from "@/lib/auth/auth";

/**
 * Auth integration tests run against an isolated in-memory DB via createAuth,
 * sidestepping the app's lazy singleton. The seed path uses a sign-up-enabled
 * instance; the app path disables public sign-up.
 */
describe("auth (email + password)", () => {
  let db: AppDatabase;
  let close: () => void;

  beforeEach(() => {
    const testDb = createTestDb();
    db = testDb.db;
    close = testDb.close;
  });

  afterEach(() => close());

  test("seed instance can sign up and app instance can then sign in", async () => {
    const seedAuth = createAuth(db, { allowSignUp: true });
    await seedAuth.api.signUpEmail({
      body: { email: "admin@example.com", password: "supersecret123", name: "Admin" },
    });

    const appAuth = createAuth(db, { allowSignUp: false });
    const res = await appAuth.api.signInEmail({
      body: { email: "admin@example.com", password: "supersecret123" },
      asResponse: true,
    });
    expect(res.status).toBe(200);
  });

  test("sign-in with a wrong password is rejected", async () => {
    const seedAuth = createAuth(db, { allowSignUp: true });
    await seedAuth.api.signUpEmail({
      body: { email: "admin@example.com", password: "supersecret123", name: "Admin" },
    });

    const appAuth = createAuth(db, { allowSignUp: false });
    await expect(
      appAuth.api.signInEmail({
        body: { email: "admin@example.com", password: "wrongpassword1" },
      }),
    ).rejects.toThrow();
  });

  test("public sign-up is blocked on the app instance", async () => {
    const appAuth = createAuth(db, { allowSignUp: false });
    await expect(
      appAuth.api.signUpEmail({
        body: { email: "intruder@example.com", password: "supersecret123", name: "X" },
      }),
    ).rejects.toThrow();
  });

  test("rejects passwords shorter than the configured minimum", async () => {
    const seedAuth = createAuth(db, { allowSignUp: true });
    await expect(
      seedAuth.api.signUpEmail({
        body: { email: "shortpw@example.com", password: "short", name: "X" },
      }),
    ).rejects.toThrow();
  });
});
