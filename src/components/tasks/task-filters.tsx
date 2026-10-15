"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TASK_STATUSES, type TaskStatus } from "@/lib/db/schema";

export interface TaskFilterState {
  status: TaskStatus | "";
  search: string;
}

/** Filter bar for the task list: free-text search + status dropdown. */
export function TaskFilters({
  value,
  onChange,
}: {
  value: TaskFilterState;
  onChange: (next: TaskFilterState) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search title, task key or project path…"
          className="pl-9"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
        />
      </div>
      <Select
        className="sm:w-44"
        value={value.status}
        onChange={(e) =>
          onChange({ ...value, status: e.target.value as TaskStatus | "" })
        }
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        {TASK_STATUSES.map((status) => (
          <option key={status} value={status} className="capitalize">
            {status}
          </option>
        ))}
      </Select>
    </div>
  );
}
