import { Card } from "@/components/ui/card";
import { Workflow } from "lucide-react";

const TRIGGERS: Array<{ id: string; note: string }> = [
  { id: "manual", note: "Enroll from Automations or contact/listing actions." },
  { id: "listing_stage_change", note: "Fires when a listing pipeline stage updates (see Settings → listing-stage automation)." },
  { id: "contact_created", note: "Optional: new contact rows can enroll eligible workflows (DB / Edge configuration)." },
  { id: "deal_stage_change", note: "Deal-based automations when deal pipeline is in use." },
  { id: "score_threshold", note: "Lead score crosses a threshold — pair with contact_scores and branch steps." },
  { id: "form_submission", note: "Planned: web-to-lead and portal forms as entry triggers." },
];

export function WorkflowTriggersReference() {
  return (
    <Card className="zoho-card p-4 sm:p-5 border-border">
      <div className="flex items-start gap-3 mb-3">
        <Workflow className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">Workflow trigger catalog</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Values stored on <code className="text-[10px]">crm_workflows.trigger_type</code>. Processor:{" "}
            <code className="text-[10px]">process-workflows</code> plus DB hooks for stage changes.
          </p>
        </div>
      </div>
      <ul className="space-y-2 text-xs">
        {TRIGGERS.map((t) => (
          <li key={t.id} className="flex flex-col sm:flex-row sm:gap-3 border-t border-border/60 pt-2 first:border-0 first:pt-0">
            <code className="text-foreground font-mono shrink-0 sm:w-40">{t.id}</code>
            <span className="text-muted-foreground">{t.note}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
