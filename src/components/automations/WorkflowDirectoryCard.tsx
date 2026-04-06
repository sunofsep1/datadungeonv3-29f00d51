import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCrmWorkflowsList } from "@/hooks/useCrmWorkflows";
import { Workflow } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type DirectoryProps = {
  selectedWorkflowId?: string;
  onSelectWorkflow?: (id: string) => void;
};

export function WorkflowDirectoryCard({ selectedWorkflowId, onSelectWorkflow }: DirectoryProps) {
  const { data: workflows = [], isLoading } = useCrmWorkflowsList();

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

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
          No workflows yet. Create a sample workflow below, or add one from your database / future builder.
        </p>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[520px]">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <th className="py-2.5 px-3 font-medium">Name</th>
                <th className="py-2.5 px-3 font-medium">Trigger</th>
                <th className="py-2.5 px-3 font-medium">Object</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                <th className="py-2.5 px-3 font-medium tabular-nums">Enrolled</th>
                <th className="py-2.5 px-3 font-medium">Last run</th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((w) => (
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
