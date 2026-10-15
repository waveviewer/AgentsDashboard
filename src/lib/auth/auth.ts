import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, type AppDatabase } from "@/lib/db";
import { account, session, user, verification } from "@/lib/db/auth-schema";

const MIN_SECRET_LEN = 32;
const DEV_SECRET = "dev-only-insecure-secret-min-32-characters!!";

/**
 * Required secret for signing sessions. Fail fast at startup if absent in
 * production so we never run with an insecure default there.
 */
function authSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < MIN_SECRET_LEN) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "BETTER_AUTH_SECRET must be set to a 32+ character secret in production",
      );
    }
    return DEV_SECRET;
  }
  return secret;
}

/**
 * Build a Better Auth instance over the given Drizzle client.
 *
 * `allowSignUp` is false for the app instance — the dashboard is internet-exposed
 * and single-operator, so public self-registration is disabled. The seed script
 * builds a separate instance with sign-up enabled to provision the first admin
 * through the same (documented, password-hashing) sign-up path.
 */
export function createAuth(
  database: AppDatabase,
  options: { allowSignUp: boolean } = { allowSignUp: false },
) {
  return betterAuth({
    secret: authSecret(),
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    database: drizzleAdapter(database, {
      provider: "sqlite",
      schema: { user, session, account, verification },
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: !options.allowSignUp,
      minPasswordLength: 12,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // refresh daily
    },
    plugins: [nextCookies()],
  });
}

/** The application auth instance. Public sign-up disabled. */
export const auth = createAuth(db, { allowSignUp: false });

export type Session = typeof auth.$Infer.Session;
