import { StatusBadge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils/format";
import type { TaskEvent } from "@/lib/db/schema";

/** Vertical timeline of a task's reported events, newest at the top. */
export function TaskTimeline({ events }: { events: TaskEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No events recorded yet.</p>
    );
  }

  const ordered = [...events].reverse();

  return (
    <ol className="flex flex-col gap-4">
      {ordered.map((event, index) => (
        <li key={event.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="mt-1 size-2.5 rounded-full bg-primary" />
            {index < ordered.length - 1 ? (
              <span className="w-px flex-1 bg-border" />
            ) : null}
          </div>
          <div className="flex-1 pb-2">
            <div className="flex items-center gap-2">
              <StatusBadge status={event.status} />
              <span className="text-xs tabular-nums text-muted-foreground">
                {event.progress}%
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(event.createdAt)}
              </span>
            </div>
            {event.summary ? (
              <p className="mt-1 text-sm">{event.summary}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
