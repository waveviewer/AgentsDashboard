import { desc, eq, isNull } from "drizzle-orm";
import type { AppDatabase } from "@/lib/db";
import { apiKeys, type ApiKey } from "@/lib/db/schema";
import { generateApiKey, verifyApiKey } from "@/lib/crypto/api-key";

export interface CreatedApiKey {
  record: ApiKey;
  /** Plaintext key — returned once, never persisted or retrievable again. */
  plaintext: string;
}

/**
 * Data access for API keys. Only hashes are stored; verification is done in
 * constant time against candidate plaintext. All methods return new objects.
 */
export class ApiKeyRepository {
  constructor(private readonly db: AppDatabase) {}

  /** Create a key, returning the DB record plus the one-time plaintext. */
  create(name: string): CreatedApiKey {
    const key = generateApiKey();
    const record = this.db
      .insert(apiKeys)
      .values({ name, keyHash: key.hash, keyPrefix: key.prefix })
      .returning()
      .get();
    return { record, plaintext: key.plaintext };
  }

  list(): ApiKey[] {
    return this.db
      .select()
      .from(apiKeys)
      .orderBy(desc(apiKeys.createdAt))
      .all();
  }

  /**
   * Verify a candidate plaintext key. Returns the matching active record, or
   * undefined if no active key matches. Updates last_used_at on success.
   * Iterates active keys and compares in constant time per candidate.
   */
  verify(plaintext: string): ApiKey | undefined {
    const activeKeys = this.db
      .select()
      .from(apiKeys)
      .where(isNull(apiKeys.revokedAt))
      .all();

    const match = activeKeys.find((k) => verifyApiKey(plaintext, k.keyHash));
    if (!match) return undefined;

    return this.db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, match.id))
      .returning()
      .get();
  }

  /** Soft-revoke a key by stamping revoked_at. Returns true if a key changed. */
  revoke(id: string): boolean {
    const result = this.db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(eq(apiKeys.id, id))
      .run();
    return result.changes > 0;
  }
}
