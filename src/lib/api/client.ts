import type { ApiEnvelope, PaginationMeta } from "@/lib/http/envelope";
import type { Task, TaskEvent, TaskStatus } from "@/lib/db/schema";

/**
 * Thin typed fetch wrapper for the dashboard. Unwraps the API envelope and
 * throws a readable Error on failure so React Query surfaces it uniformly.
 */
async function request<T>(
  input: string,
  init?: RequestInit,
): Promise<{ data: T; meta?: PaginationMeta }> {
  const res = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || !body.success) {
    const message = body.success ? "Request failed" : body.error;
    throw new Error(message || `Request failed (${res.status})`);
  }
  return { data: body.data, meta: "meta" in body ? body.meta : undefined };
}

export interface TaskListParams {
  status?: TaskStatus;
  hostname?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const tasksApi = {
  list(params: TaskListParams) {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") qs.set(key, String(value));
    }
    return request<Task[]>(`/api/tasks?${qs.toString()}`);
  },
  get(id: string) {
    return request<{ task: Task; events: TaskEvent[] }>(`/api/tasks/${id}`);
  },
  update(id: string, patch: Partial<Pick<Task, "title" | "status" | "progress" | "summary" | "agent">>) {
    return request<Task>(`/api/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
  remove(id: string) {
    return request<{ id: string }>(`/api/tasks/${id}`, { method: "DELETE" });
  },
};

export interface SafeApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export const apiKeysApi = {
  list() {
    return request<SafeApiKey[]>("/api/api-keys");
  },
  create(name: string) {
    return request<SafeApiKey & { plaintext: string }>("/api/api-keys", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },
  revoke(id: string) {
    return request<{ id: string }>(`/api/api-keys/${id}`, { method: "DELETE" });
  },
};
