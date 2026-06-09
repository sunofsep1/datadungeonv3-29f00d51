import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Workflow, Settings2, ChevronRight } from "lucide-react";
import { LISTING_PIPELINE_STAGE_OPTIONS } from "@/lib/listingKanbanStages";

type ListingPipelineNextCardProps = {
  pipelineStage: string | null | undefined;
};

export function ListingPipelineNextCard({ pipelineStage }: ListingPipelineNextCardProps) {
  const stageId = pipelineStage ?? "";
  const label =
    LISTING_PIPELINE_STAGE_OPTIONS.find((s) => s.id === stageId)?.label ??
    (stageId ? stageId : "Not set");

  return (
    <Card className="zoho-card p-5 border-border h-fit">
      <div className="flex items-center gap-2 mb-2">
        <Workflow className="w-4 h-4 text-primary shrink-0" />
        <h3 className="text-sm font-medium text-foreground">Pipeline & what runs next</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Current stage: <span className="font-medium text-foreground">{label}</span>
      </p>
      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
        Workflows with trigger{" "}
        <code className="text-[10px] bg-muted px-1 rounded align-middle">listing_stage_change</code>{" "}
        enroll this listing when the pipeline stage changes (board, detail, or{" "}
        <span className="font-medium text-foreground/90">Change pipeline stage</span> in the bar). The{" "}
        <code className="text-[10px] bg-muted px-1 rounded align-middle">process-workflows</code> job
        executes steps on its schedule — check the workflow <strong className="font-medium">Step log</strong> in
        Automations.
      </p>
      <div className="flex flex-col gap-2">
        <Button variant="outline" size="sm" className="justify-between h-9 text-xs" asChild>
          <Link to="/automations">
            Open Automations
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          </Link>
        </Button>
        <Button variant="ghost" size="sm" className="justify-between h-9 text-xs text-muted-foreground" asChild>
          <Link to="/settings/automations">
            <span className="flex items-center gap-2 min-w-0">
              <Settings2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Settings · workflows</span>
            </span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
