import { createAuth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { user as userTable } from "@/lib/db/auth-schema";

/**
 * Provision the initial operator account via Better Auth's documented sign-up
 * API (which hashes the password and writes the credential account correctly).
 * The app's auth instance disables public sign-up; here we build a sign-up-enabled
 * instance over the same database solely for seeding. Idempotent: skips if the
 * email already exists. Credentials come from env — nothing is hardcoded.
 */
async function run(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set to seed an admin",
    );
  }
  if (password.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters");
  }

  const existing = db.select().from(userTable).all();
  if (existing.some((u) => u.email === email.toLowerCase())) {
    console.log(`Admin ${email} already exists — nothing to do.`);
    return;
  }

  const seedAuth = createAuth(db, { allowSignUp: true });
  await seedAuth.api.signUpEmail({
    body: { email, password, name: "Admin" },
  });

  console.log(`Created admin user ${email}`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
