import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createTestDb } from "../../helpers/db";
import type { AppDatabase } from "@/lib/db";
import { ApiKeyRepository } from "@/lib/repositories/api-key";

describe("ApiKeyRepository", () => {
  let db: AppDatabase;
  let close: () => void;
  let repo: ApiKeyRepository;

  beforeEach(() => {
    const testDb = createTestDb();
    db = testDb.db;
    close = testDb.close;
    repo = new ApiKeyRepository(db);
  });

  afterEach(() => close());

  test("create returns a record plus one-time plaintext; hash is not the plaintext", () => {
    const { record, plaintext } = repo.create("server-a");

    expect(record.name).toBe("server-a");
    expect(plaintext).toMatch(/^adk_/);
    expect(record.keyHash).not.toBe(plaintext);
    expect(record.keyPrefix).toBe(plaintext.slice(0, 12));
    expect(record.revokedAt).toBeNull();
  });

  test("verify returns the key record for a valid plaintext and stamps last_used_at", () => {
    const { plaintext } = repo.create("server-a");

    const verified = repo.verify(plaintext);
    expect(verified).toBeDefined();
    expect(verified?.lastUsedAt).toBeInstanceOf(Date);
  });

  test("verify returns undefined for an unknown key", () => {
    repo.create("server-a");
    expect(repo.verify("adk_not-a-real-key")).toBeUndefined();
  });

  test("verify ignores revoked keys", () => {
    const { record, plaintext } = repo.create("server-a");
    repo.revoke(record.id);
    expect(repo.verify(plaintext)).toBeUndefined();
  });

  test("list returns keys newest first", () => {
    repo.create("first");
    repo.create("second");
    const keys = repo.list();
    expect(keys).toHaveLength(2);
  });

  test("revoke returns true once, false for unknown id", () => {
    const { record } = repo.create("server-a");
    expect(repo.revoke(record.id)).toBe(true);
    expect(repo.revoke("missing")).toBe(false);
  });
});
