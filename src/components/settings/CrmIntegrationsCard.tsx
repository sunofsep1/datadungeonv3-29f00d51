import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Plug, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAgentboxSyncContacts, useAgentboxSyncListings, useAgentboxSyncStatus } from "@/hooks/useAgentboxSync";
import { useReapitSyncContacts, useReapitSyncListings, useReapitSyncStatus } from "@/hooks/useReapitSync";
import { toast } from "sonner";

function IntegrationRow({
  name,
  description,
  configured,
  checking,
  onCheckStatus,
  onSync,
  syncLabel,
  syncing,
  checkPending,
  onSecondarySync,
  secondarySyncLabel,
  secondarySyncing,
}: {
  name: string;
  description: string;
  configured: boolean | null;
  checking: boolean;
  onCheckStatus: () => void;
  onSync: () => void;
  syncLabel: string;
  syncing: boolean;
  checkPending: boolean;
  onSecondarySync?: () => void;
  secondarySyncLabel?: string;
  secondarySyncing?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">{name}</span>
          {configured === null || checking ? (
            <Badge variant="secondary">Checking…</Badge>
          ) : configured ? (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Configured
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-amber-700 dark:text-amber-400 border-amber-500/40">
              <AlertTriangle className="w-3 h-3" />
              Not configured
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        <Button type="button" variant="outline" size="sm" disabled={checkPending} onClick={onCheckStatus}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${checkPending ? "animate-spin" : ""}`} />
          Check
        </Button>
        <Button type="button" size="sm" disabled={!configured || syncing} onClick={onSync}>
          {syncing ? "Syncing…" : syncLabel}
        </Button>
        {onSecondarySync ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!configured || secondarySyncing}
            onClick={onSecondarySync}
          >
            {secondarySyncing ? "Syncing…" : secondarySyncLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function CrmIntegrationsCard() {
  const qc = useQueryClient();
  const agentboxStatus = useAgentboxSyncStatus();
  const agentboxSync = useAgentboxSyncContacts();
  const agentboxListingsSync = useAgentboxSyncListings();
  const reapitStatus = useReapitSyncStatus();
  const reapitSync = useReapitSyncContacts();
  const reapitListingsSync = useReapitSyncListings();

  const [agentboxConfigured, setAgentboxConfigured] = useState<boolean | null>(null);
  const [reapitConfigured, setReapitConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    agentboxStatus.mutate(undefined, {
      onSuccess: (data) => setAgentboxConfigured(Boolean(data.configured)),
      onError: () => setAgentboxConfigured(false),
    });
    reapitStatus.mutate(undefined, {
      onSuccess: (data) => setReapitConfigured(Boolean(data.configured)),
      onError: () => setReapitConfigured(false),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  return (
    <div className="space-y-4 pt-2 border-t border-border">
      <div className="flex items-center gap-2">
        <Plug className="w-5 h-5 text-primary shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">CRM sync</p>
          <p className="text-xs text-muted-foreground">
            Import contacts and listings from AgentBox or Reapit Foundations. Upsert keys:{" "}
            <code className="text-[10px]">agentbox_id</code>, <code className="text-[10px]">reapit_id</code>.
          </p>
        </div>
      </div>

      <Card className="p-4 border-border bg-muted/20 space-y-4">
        <IntegrationRow
          name="AgentBox"
          description="Secrets: AGENTBOX_API_KEY, AGENTBOX_CLIENT_ID. Apply via integrations@agentbox.com.au."
          configured={agentboxConfigured}
          checking={agentboxConfigured === null && agentboxStatus.isPending}
          checkPending={agentboxStatus.isPending}
          syncing={agentboxSync.isPending}
          syncLabel="Sync contacts"
          secondarySyncLabel="Sync listings"
          secondarySyncing={agentboxListingsSync.isPending}
          onSecondarySync={() =>
            agentboxListingsSync.mutate(100, {
              onSuccess: (data) => {
                if (!data.ok) {
                  toast.error(data.error ?? "AgentBox listing sync failed");
                  return;
                }
                void qc.invalidateQueries({ queryKey: ["listings"] });
                toast.success(
                  `AgentBox listings — ${data.imported ?? 0} imported, ${data.updated ?? 0} updated`,
                );
              },
              onError: (e) => toast.error(e instanceof Error ? e.message : "Sync failed"),
            })
          }
          onCheckStatus={() =>
            agentboxStatus.mutate(undefined, {
              onSuccess: (data) => {
                setAgentboxConfigured(Boolean(data.configured));
                toast.info(data.message ?? (data.configured ? "AgentBox ready" : "AgentBox missing secrets"));
              },
              onError: (e) => toast.error(e instanceof Error ? e.message : "Status check failed"),
            })
          }
          onSync={() =>
            agentboxSync.mutate(100, {
              onSuccess: (data) => {
                if (!data.ok) {
                  toast.error(data.error ?? "AgentBox sync failed");
                  return;
                }
                void qc.invalidateQueries({ queryKey: ["contacts"] });
                toast.success(
                  `AgentBox — ${data.imported ?? 0} imported, ${data.updated ?? 0} updated`,
                );
              },
              onError: (e) => toast.error(e instanceof Error ? e.message : "Sync failed"),
            })
          }
        />

        <div className="border-t border-border/60 pt-4">
          <IntegrationRow
            name="Reapit Foundations"
            description="Secrets: REAPIT_CLIENT_ID, REAPIT_CLIENT_SECRET, REAPIT_CUSTOMER_ID (e.g. qldsir)."
            configured={reapitConfigured}
            checking={reapitConfigured === null && reapitStatus.isPending}
            checkPending={reapitStatus.isPending}
            syncing={reapitSync.isPending}
            syncLabel="Sync contacts"
            secondarySyncLabel="Sync listings"
            secondarySyncing={reapitListingsSync.isPending}
            onSecondarySync={() =>
              reapitListingsSync.mutate(100, {
                onSuccess: (data) => {
                  if (!data.ok) {
                    toast.error(data.error ?? "Reapit listing sync failed");
                    return;
                  }
                  void qc.invalidateQueries({ queryKey: ["listings"] });
                  toast.success(
                    `Reapit listings — ${data.imported ?? 0} imported, ${data.updated ?? 0} updated`,
                  );
                },
                onError: (e) => toast.error(e instanceof Error ? e.message : "Sync failed"),
              })
            }
            onCheckStatus={() =>
              reapitStatus.mutate(undefined, {
                onSuccess: (data) => {
                  setReapitConfigured(Boolean(data.configured));
                  toast.info(data.message ?? (data.configured ? "Reapit ready" : "Reapit missing secrets"));
                },
                onError: (e) => toast.error(e instanceof Error ? e.message : "Status check failed"),
              })
            }
            onSync={() =>
              reapitSync.mutate(100, {
                onSuccess: (data) => {
                  if (!data.ok) {
                    toast.error(data.error ?? "Reapit sync failed");
                    return;
                  }
                  void qc.invalidateQueries({ queryKey: ["contacts"] });
                  toast.success(
                    `Reapit — ${data.imported ?? 0} imported, ${data.updated ?? 0} updated`,
                  );
                },
                onError: (e) => toast.error(e instanceof Error ? e.message : "Sync failed"),
              })
            }
          />
        </div>
      </Card>
    </div>
  );
}
