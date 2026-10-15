"use client";

import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { timeAgo, formatDateTime } from "@/lib/utils/format";
import type { Task } from "@/lib/db/schema";

/** Task list table. Rows are clickable and navigate to the detail view. */
export function TaskTable({ tasks }: { tasks: Task[] }) {
  const router = useRouter();

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        No tasks yet. Point an agent at the ingestion endpoint to see it here.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Host / Project</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-40">Progress</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow
              key={task.id}
              className="cursor-pointer"
              onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
            >
              <TableCell>
                <div className="font-medium">{task.title}</div>
                <div className="font-mono text-xs text-muted-foreground">
                  {task.taskKey}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">{task.hostname}</div>
                <div
                  className="max-w-[220px] truncate font-mono text-xs text-muted-foreground"
                  title={task.projectPath}
                >
                  {task.projectPath}
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge status={task.status} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <ProgressBar value={task.progress} />
                  <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
                    {task.progress}%
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <span
                  className="text-sm text-muted-foreground"
                  title={formatDateTime(task.updatedAt)}
                >
                  {timeAgo(task.updatedAt)}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
