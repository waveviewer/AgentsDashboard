import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth/auth";

export const runtime = "nodejs";

// Better Auth mounts all its endpoints (sign-in, sign-out, session, ...) here.
export const { GET, POST } = toNextJsHandler(auth);
