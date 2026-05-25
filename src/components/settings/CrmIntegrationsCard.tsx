import { useEffect, useState } from "react";
import { RefreshCw, Plug, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAgentboxSyncContacts, useAgentboxSyncStatus } from "@/hooks/useAgentboxSync";
import { toast } from "sonner";

export function CrmIntegrationsCard() {
  const status = useAgentboxSyncStatus();
  const syncContacts = useAgentboxSyncContacts();
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    status.mutate(undefined, {
      onSuccess: (data) => setConfigured(Boolean(data.configured)),
      onError: () => setConfigured(false),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const runContactSync = () => {
    syncContacts.mutate(100, {
      onSuccess: (data) => {
        if (!data.ok) {
          toast.error(data.error ?? "AgentBox sync failed");
          return;
        }
        toast.success(
          `AgentBox sync complete — ${data.imported ?? 0} imported, ${data.updated ?? 0} updated`,
        );
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Sync failed"),
    });
  };

  return (
    <div className="space-y-4 pt-2 border-t border-border">
      <div className="flex items-center gap-2">
        <Plug className="w-5 h-5 text-primary shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">CRM sync (AgentBox)</p>
          <p className="text-xs text-muted-foreground">
            Import contacts from AgentBox using <code className="text-[10px]">agentbox_id</code> as the upsert key.
            Requires Edge Function secrets: <code className="text-[10px]">AGENTBOX_API_KEY</code>,{" "}
            <code className="text-[10px]">AGENTBOX_CLIENT_ID</code>.
          </p>
        </div>
      </div>

      <Card className="p-4 border-border bg-muted/20 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">AgentBox</span>
            {configured === null ? (
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
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={status.isPending}
              onClick={() =>
                status.mutate(undefined, {
                  onSuccess: (data) => {
                    setConfigured(Boolean(data.configured));
                    toast.info(data.message ?? (data.configured ? "Ready" : "Missing secrets"));
                  },
                  onError: (e) => toast.error(e instanceof Error ? e.message : "Status check failed"),
                })
              }
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${status.isPending ? "animate-spin" : ""}`} />
              Check status
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!configured || syncContacts.isPending}
              onClick={runContactSync}
            >
              {syncContacts.isPending ? "Syncing…" : "Sync contacts"}
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Reapit Foundations sync is planned (Phase 5). Apply for AgentBox API access via integrations@agentbox.com.au
          if you have not already.
        </p>
      </Card>
    </div>
  );
}
