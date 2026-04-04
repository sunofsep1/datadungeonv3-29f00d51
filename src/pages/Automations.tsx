import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CrmWorkflowEngineCard } from "@/components/settings/CrmWorkflowEngineCard";
import { Workflow, Settings, ListTodo } from "lucide-react";

export default function Automations() {
  return (
    <div className="animate-fade-in space-y-6 pb-8">
      <PageHeader
        title="Automations"
        description="CRM workflows, enrollments, and triggers. Pair with listing-stage rules in Settings when a listing changes stage."
      />

      <Card className="zoho-card p-4 sm:p-5 border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <Settings className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Listing stage SMS & email</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure per–pipeline-stage messages and tasks. Still edited in Settings → Integrations.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/settings">Open in Settings</Link>
        </Button>
      </Card>

      <Card className="zoho-card p-4 sm:p-5 border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <ListTodo className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Tasks from workflows</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Workflow steps can create contact or listing tasks. Review everything due on Tasks.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/tasks">Go to Tasks</Link>
        </Button>
      </Card>

      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Workflow className="w-4 h-4" />
        <span>
          Processor: <code className="text-[10px] text-foreground/90">process-workflows</code> — schedule via pg_cron (see repo{" "}
          <code className="text-[10px]">RUN_IN_SUPABASE_DASHBOARD_process_workflows_cron.sql</code>).
        </span>
      </div>

      <CrmWorkflowEngineCard />
    </div>
  );
}
