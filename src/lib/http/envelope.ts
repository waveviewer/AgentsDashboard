import { NextResponse } from "next/server";

/**
 * Consistent API response envelope used by every route.
 * `success` discriminates the union; `data` is present on success, `error` on failure.
 */
export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  error: null;
  meta?: PaginationMeta;
}

export interface ErrorEnvelope {
  success: false;
  data: null;
  error: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
}

export type ApiEnvelope<T> = SuccessEnvelope<T> | ErrorEnvelope;

/** Build a success response with optional pagination metadata. */
export function ok<T>(
  data: T,
  init?: { status?: number; meta?: PaginationMeta },
): NextResponse<SuccessEnvelope<T>> {
  const body: SuccessEnvelope<T> = { success: true, data, error: null };
  if (init?.meta) body.meta = init.meta;
  return NextResponse.json(body, { status: init?.status ?? 200 });
}

/**
 * Build an error response. Messages are intentionally generic/caller-controlled
 * so internal details never leak to clients.
 */
export function fail(
  message: string,
  status: number,
  headers?: Record<string, string>,
): NextResponse<ErrorEnvelope> {
  return NextResponse.json(
    { success: false, data: null, error: message },
    { status, headers },
  );
}
