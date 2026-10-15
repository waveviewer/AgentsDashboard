import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";

/**
 * Resolve the current session on the server (RSC / route handlers).
 * Returns null when unauthenticated.
 */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Guard helper for API routes: returns the session or throws a sentinel the
 * caller maps to 401. Keeps route handlers free of repeated auth boilerplate.
 */
export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}
