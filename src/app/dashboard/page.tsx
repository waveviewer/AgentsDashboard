"use client";

import * as React from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { tasksApi } from "@/lib/api/client";
import { TaskFilters, type TaskFilterState } from "@/components/tasks/task-filters";
import { TaskTable } from "@/components/tasks/task-table";
import { Button } from "@/components/ui/button";
import type { TaskStatus } from "@/lib/db/schema";

const PAGE_SIZE = 20;
const POLL_INTERVAL_MS = 5000;
const SEARCH_DEBOUNCE_MS = 300;

export default function DashboardPage() {
  const [filters, setFilters] = React.useState<TaskFilterState>({
    status: "",
    search: "",
  });
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  // Debounce the free-text search so we don't refetch on every keystroke.
  React.useEffect(() => {
    const handle = setTimeout(
      () => setDebouncedSearch(filters.search),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(handle);
  }, [filters.search]);

  // Reset to page 1 whenever the active filters change. Derived during render
  // (React's recommended alternative to a state-syncing effect): track the last
  // filter signature and reset the page the moment it differs.
  const filterKey = `${filters.status}|${debouncedSearch}`;
  const [prevFilterKey, setPrevFilterKey] = React.useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const query = useQuery({
    queryKey: ["tasks", filters.status, debouncedSearch, page],
    queryFn: () =>
      tasksApi.list({
        status: (filters.status || undefined) as TaskStatus | undefined,
        search: debouncedSearch || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    refetchInterval: POLL_INTERVAL_MS,
    placeholderData: keepPreviousData,
  });

  const total = query.data?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const tasks = query.data?.data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {total} task{total === 1 ? "" : "s"} across all hosts
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCw className={query.isFetching ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      <TaskFilters value={filters} onChange={setFilters} />

      {query.isError ? (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {(query.error as Error).message}
        </div>
      ) : (
        <TaskTable tasks={tasks} />
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
