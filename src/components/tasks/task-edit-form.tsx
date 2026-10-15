"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TASK_STATUSES, type Task, type TaskStatus } from "@/lib/db/schema";

export interface TaskEditValues {
  title: string;
  status: TaskStatus;
  progress: number;
  summary: string;
  agent: string;
}

/** Controlled edit form for a task. Parent owns submission + mutation state. */
export function TaskEditForm({
  task,
  onSubmit,
  onCancel,
  saving,
}: {
  task: Task;
  onSubmit: (values: TaskEditValues) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [values, setValues] = React.useState<TaskEditValues>({
    title: task.title,
    status: task.status,
    progress: task.progress,
    summary: task.summary ?? "",
    agent: task.agent ?? "",
  });

  function update<K extends keyof TaskEditValues>(key: K, value: TaskEditValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium">Title</label>
        <Input
          id="title"
          required
          value={values.title}
          onChange={(e) => update("title", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="text-sm font-medium">Status</label>
          <Select
            id="status"
            value={values.status}
            onChange={(e) => update("status", e.target.value as TaskStatus)}
          >
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="progress" className="text-sm font-medium">Progress (%)</label>
          <Input
            id="progress"
            type="number"
            min={0}
            max={100}
            value={values.progress}
            onChange={(e) => update("progress", Number(e.target.value))}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="agent" className="text-sm font-medium">Agent</label>
        <Input
          id="agent"
          value={values.agent}
          onChange={(e) => update("agent", e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="summary" className="text-sm font-medium">Summary</label>
        <textarea
          id="summary"
          rows={3}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={values.summary}
          onChange={(e) => update("summary", e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
