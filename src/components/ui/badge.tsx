import * as React from "react";
import { cn } from "@/lib/utils/cn";
import type { TaskStatus } from "@/lib/db/schema";

/** Map a task status to its accent color token and label. */
const STATUS_STYLES: Record<TaskStatus, string> = {
  queued: "bg-[--status-queued]/15 text-[--status-queued]",
  running: "bg-[--status-running]/15 text-[--status-running]",
  paused: "bg-[--status-paused]/15 text-[--status-paused]",
  completed: "bg-[--status-completed]/15 text-[--status-completed]",
  failed: "bg-[--status-failed]/15 text-[--status-failed]",
};

export function StatusBadge({
  status,
  className,
}: {
  status: TaskStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        STATUS_STYLES[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
      {...props}
    />
  );
}
