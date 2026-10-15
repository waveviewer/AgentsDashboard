"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser-side auth client. baseURL defaults to the current origin, so no
 * configuration is needed for same-origin usage.
 */
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
