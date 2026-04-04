import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCrmWorkflowsList,
  useCreateSampleCrmWorkflow,
  useStartCrmWorkflowEnrollment,
} from "@/hooks/useCrmWorkflows";
import { useContacts } from "@/hooks/useContacts";
import { toast } from "sonner";
import { Workflow } from "lucide-react";

export function CrmWorkflowEngineCard() {
  const { data: workflows = [], isLoading: wfLoading } = useCrmWorkflowsList();
  const { data: contacts = [], isLoading: cLoading } = useContacts();
  const createSample = useCreateSampleCrmWorkflow();
  const startEnroll = useStartCrmWorkflowEnrollment();
  const [workflowId, setWorkflowId] = React.useState<string>("");
  const [contactId, setContactId] = React.useState<string>("");

  const activeWorkflows = workflows.filter((w) => w.is_active);

  return (
    <Card className="zoho-card p-6 border-border">
      <div className="flex items-center gap-3 mb-4">
        <Workflow className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">CRM workflows (automation)</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Linear workflows with timed steps: notifications, tasks, nurture enrollment, and safe contact updates. Runs on the{" "}
        <code className="text-[10px]">process-workflows</code> Edge Function (service role + pg_cron every ~5 min). Deploy
        with <code className="text-[10px]">npm run supabase:deploy:process-workflows</code> and apply migration{" "}
        <code className="text-[10px]">20260404180000_crm_workflow_engine.sql</code>.
      </p>

      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={createSample.isPending}
          onClick={() =>
            createSample.mutate(undefined, {
              onSuccess: () => toast.success("Sample workflow created (active). Pick it below to enroll."),
              onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create workflow"),
            })
          }
        >
          {createSample.isPending ? "Creating…" : "Create sample workflow"}
        </Button>

        <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border">
          <div className="space-y-2">
            <Label>Workflow</Label>
            <Select value={workflowId} onValueChange={setWorkflowId} disabled={wfLoading}>
              <SelectTrigger className="bg-input">
                <SelectValue placeholder={wfLoading ? "Loading…" : "Select workflow"} />
              </SelectTrigger>
              <SelectContent>
                {activeWorkflows.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Contact</Label>
            <Select value={contactId} onValueChange={setContactId} disabled={cLoading}>
              <SelectTrigger className="bg-input">
                <SelectValue placeholder={cLoading ? "Loading…" : "Select contact"} />
              </SelectTrigger>
              <SelectContent>
                {contacts.slice(0, 300).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name || c.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          disabled={!workflowId || !contactId || startEnroll.isPending}
          onClick={() =>
            startEnroll.mutate(
              { workflowId, contactId },
              {
                onSuccess: () => toast.success("Enrollment started — processor will run on schedule."),
                onError: (e) => toast.error(e instanceof Error ? e.message : "Could not enroll"),
              },
            )
          }
        >
          {startEnroll.isPending ? "Starting…" : "Start workflow for contact"}
        </Button>
      </div>
    </Card>
  );
}
