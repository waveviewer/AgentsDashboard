"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { apiKeysApi } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, timeAgo } from "@/lib/utils/format";

export default function ApiKeysPage() {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState("");
  const [freshKey, setFreshKey] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const query = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => apiKeysApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (keyName: string) => apiKeysApi.create(keyName),
    onSuccess: (result) => {
      setFreshKey(result.data.plaintext);
      setName("");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiKeysApi.revoke(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  async function copyFreshKey() {
    if (!freshKey) return;
    await navigator.clipboard.writeText(freshKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const keys = query.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
        <p className="text-sm text-muted-foreground">
          Keys authenticate agents posting to the ingestion endpoint. The secret
          is shown once at creation — store it securely.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create a key</CardTitle>
          <CardDescription>Give it a name that identifies the server or agent.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) createMutation.mutate(name.trim());
            }}
          >
            <Input
              placeholder="e.g. prod-server-a"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="sm:max-w-xs"
            />
            <Button type="submit" disabled={createMutation.isPending || !name.trim()}>
              <Plus />
              {createMutation.isPending ? "Creating…" : "Create key"}
            </Button>
          </form>

          {createMutation.isError ? (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {(createMutation.error as Error).message}
            </p>
          ) : null}

          {freshKey ? (
            <div className="mt-4 rounded-md border border-primary/40 bg-primary/5 p-4">
              <p className="mb-2 text-sm font-medium">
                Copy your new key now — it won&apos;t be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded bg-muted px-3 py-2 font-mono text-xs">
                  {freshKey}
                </code>
                <Button variant="outline" size="sm" onClick={copyFreshKey}>
                  <Copy />
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Existing keys</CardTitle>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No keys yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {keys.map((key) => (
                <li key={key.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex items-center gap-3">
                    <KeyRound className="size-4 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{key.name}</span>
                        {key.revokedAt ? (
                          <Badge className="border-destructive/40 text-destructive">Revoked</Badge>
                        ) : null}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {key.keyPrefix}••••••••
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="hidden text-xs text-muted-foreground sm:inline" title={key.lastUsedAt ? formatDateTime(key.lastUsedAt) : undefined}>
                      {key.lastUsedAt ? `Used ${timeAgo(key.lastUsedAt)}` : "Never used"}
                    </span>
                    {!key.revokedAt ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Revoke key "${key.name}"? Agents using it will stop working.`)) {
                            revokeMutation.mutate(key.id);
                          }
                        }}
                        disabled={revokeMutation.isPending}
                      >
                        <Trash2 />
                        Revoke
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
