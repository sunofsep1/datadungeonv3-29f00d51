import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useCrmWorkflowsList } from "@/hooks/useCrmWorkflows";
import { Search, Workflow } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type DirectoryProps = {
  selectedWorkflowId?: string;
  onSelectWorkflow?: (id: string) => void;
};

type StatusFilter = "all" | "active" | "paused";

export function WorkflowDirectoryCard({ selectedWorkflowId, onSelectWorkflow }: DirectoryProps) {
  const { data: workflows = [], isLoading } = useCrmWorkflowsList();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredWorkflows = useMemo(() => {
    return workflows.filter((w) => {
      if (statusFilter === "active" && !w.is_active) return false;
      if (statusFilter === "paused" && w.is_active) return false;
      if (!normalizedQuery) return true;
      const haystack = [
        w.name ?? "",
        w.trigger_type ?? "",
        w.trigger_object ?? "",
        w.is_active ? "active" : "paused",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [workflows, normalizedQuery, statusFilter]);

  return (
    <Card className="zoho-card p-4 sm:p-5 border-border">
      <div className="flex items-center gap-2 mb-1">
        <Workflow className="w-5 h-5 text-primary shrink-0" />
        <h3 className="font-semibold text-foreground text-sm sm:text-base">Workflow directory</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Definitions in your account — trigger, object, enrollments, and last processor activity.{" "}
        {onSelectWorkflow ? <span className="text-foreground/90">Click a row to load it in the inspector.</span> : null}{" "}
        Enroll a contact from the engine card below.
      </p>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workflows, triggers, status…"
            className="h-8 bg-input pl-8 text-xs"
            aria-label="Search workflows"
          />
        </div>
        <div className="inline-flex h-8 items-center rounded-md border border-border bg-muted/30 p-0.5">
          {(["all", "active", "paused"] as const).map((status) => (
            <button
              key={status}
              type="button"
              className={cn(
                "rounded px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                statusFilter === status
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {filteredWorkflows.length} shown · {workflows.length} total
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : filteredWorkflows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
          No workflows match this search.
        </p>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[520px]">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-border bg-muted/95 backdrop-blur-sm text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <th className="py-2.5 px-3 font-medium">Name</th>
                <th className="py-2.5 px-3 font-medium">Trigger</th>
                <th className="py-2.5 px-3 font-medium">Object</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                <th className="py-2.5 px-3 font-medium tabular-nums">Enrolled</th>
                <th className="py-2.5 px-3 font-medium">Last run</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkflows.map((w) => (
                <tr
                  key={w.id}
                  className={cn(
                    "border-b border-border/60 last:border-0 transition-colors",
                    onSelectWorkflow && "cursor-pointer hover:bg-muted/25",
                    selectedWorkflowId === w.id && "bg-primary/10 hover:bg-primary/15",
                  )}
                  onClick={onSelectWorkflow ? () => onSelectWorkflow(w.id) : undefined}
                  onKeyDown={
                    onSelectWorkflow
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelectWorkflow(w.id);
                          }
                        }
                      : undefined
                  }
                  tabIndex={onSelectWorkflow ? 0 : undefined}
                  role={onSelectWorkflow ? "button" : undefined}
                >
                  <td className="py-2.5 px-3 font-medium text-foreground max-w-[200px]">
                    <span className="line-clamp-2">{w.name}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge variant="secondary" className="font-normal text-[10px]">
                      {w.trigger_type?.replace(/_/g, " ") ?? "—"}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground capitalize">{w.trigger_object ?? "—"}</td>
                  <td className="py-2.5 px-3">
                    {w.is_active ? (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Active</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Paused</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 tabular-nums text-muted-foreground">{w.enrollment_count ?? 0}</td>
                  <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">
                    {w.last_executed_at
                      ? formatDistanceToNow(new Date(w.last_executed_at), { addSuffix: true })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
