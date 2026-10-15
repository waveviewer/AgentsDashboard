"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { tasksApi } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TaskTimeline } from "@/components/tasks/task-timeline";
import { TaskEditForm, type TaskEditValues } from "@/components/tasks/task-edit-form";
import { formatDateTime } from "@/lib/utils/format";

const POLL_INTERVAL_MS = 5000;

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = React.useState(false);

  const query = useQuery({
    queryKey: ["task", id],
    queryFn: () => tasksApi.get(id),
    refetchInterval: editing ? false : POLL_INTERVAL_MS,
  });

  const updateMutation = useMutation({
    mutationFn: (values: TaskEditValues) =>
      tasksApi.update(id, {
        title: values.title,
        status: values.status,
        progress: values.progress,
        summary: values.summary || null,
        agent: values.agent || null,
      }),
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["task", id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => tasksApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      router.push("/dashboard");
    },
  });

  function onDelete() {
    if (confirm("Delete this task and its entire event history? This cannot be undone.")) {
      deleteMutation.mutate();
    }
  }

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (query.isError || !query.data) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {query.error ? (query.error as Error).message : "Task not found"}
        </div>
      </div>
    );
  }

  const { task, events } = query.data.data;

  return (
    <div className="flex flex-col gap-6">
      <BackLink />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
          <p className="font-mono text-sm text-muted-foreground">{task.taskKey}</p>
        </div>
        {!editing ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 />
              Delete
            </Button>
          </div>
        ) : null}
      </div>

      {deleteMutation.isError ? (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {(deleteMutation.error as Error).message}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editing ? "Edit task" : "Overview"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <>
                {updateMutation.isError ? (
                  <div role="alert" className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    {(updateMutation.error as Error).message}
                  </div>
                ) : null}
                <TaskEditForm
                  task={task}
                  saving={updateMutation.isPending}
                  onSubmit={(values) => updateMutation.mutate(values)}
                  onCancel={() => setEditing(false)}
                />
              </>
            ) : (
              <dl className="flex flex-col gap-4 text-sm">
                <Row label="Status">
                  <StatusBadge status={task.status} />
                </Row>
                <Row label="Progress">
                  <div className="flex w-full items-center gap-3">
                    <ProgressBar value={task.progress} className="max-w-xs" />
                    <span className="tabular-nums text-muted-foreground">{task.progress}%</span>
                  </div>
                </Row>
                <Row label="Host">{task.hostname}</Row>
                <Row label="Project">
                  <span className="font-mono text-xs">{task.projectPath}</span>
                </Row>
                <Row label="Agent">{task.agent ?? "—"}</Row>
                <Row label="Summary">{task.summary ?? "—"}</Row>
                <Row label="Updated">{formatDateTime(task.updatedAt)}</Row>
                <Row label="Created">{formatDateTime(task.createdAt)}</Row>
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskTimeline events={events} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
      <dt className="w-24 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="flex-1">{children}</dd>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard"
      className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      Back to tasks
    </Link>
  );
}
