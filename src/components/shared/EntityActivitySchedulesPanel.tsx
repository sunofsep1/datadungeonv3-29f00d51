import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarClock, Check, ChevronDown, Loader2, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
  useActivityScheduleTemplates,
  useActivityScheduleStepRuns,
  useApplyActivitySchedule,
  useCancelActivityScheduleInstance,
  useCompleteActivityScheduleStep,
  useEntityActivitySchedules,
  type ActivityScheduleInstance,
} from "@/hooks/useActivitySchedules";
import { scheduleProgress, stepTypeLabel } from "@/lib/activitySchedule";
import type { ActivityScheduleAppliesTo } from "@/lib/activitySchedule";
import { cn } from "@/lib/utils";

type Props = {
  appliesTo: ActivityScheduleAppliesTo;
  contactId?: string;
  listingId?: string;
  compact?: boolean;
  className?: string;
};

function InstanceSteps({
  instance,
  onComplete,
}: {
  instance: ActivityScheduleInstance;
  onComplete: () => void;
}) {
  const completeStep = useCompleteActivityScheduleStep();
  const { data: steps = [], isLoading } = useActivityScheduleStepRuns(instance.id);

  const done = steps.filter((s) => s.completed_at).length;

  if (isLoading) {
    return <p className="text-xs text-muted-foreground py-2">Loading steps…</p>;
  }

  if (steps.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">No steps in this schedule.</p>;
  }

  return (
    <ul className="space-y-2 pt-2">
      {steps.map((step) => {
        const isDone = !!step.completed_at;
        return (
          <li
            key={step.id}
            className={cn(
              "flex items-start gap-2 text-xs rounded-md border border-border/60 p-2",
              isDone && "opacity-60",
            )}
          >
            <Button
              type="button"
              variant={isDone ? "secondary" : "outline"}
              size="icon"
              className="h-7 w-7 shrink-0"
              disabled={isDone || completeStep.isPending}
              onClick={() =>
                void completeStep.mutateAsync(step.id).then(() => {
                  onComplete();
                })
              }
              aria-label={isDone ? "Completed" : "Mark complete"}
            >
              {completeStep.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </Button>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground line-clamp-2">{step.title}</p>
              <p className="text-muted-foreground mt-0.5">
                {stepTypeLabel(step.step_type as "task")} · Due{" "}
                {format(new Date(step.due_at), "d MMM yyyy")}
              </p>
              {step.body ? <p className="text-muted-foreground mt-1 line-clamp-2">{step.body}</p> : null}
            </div>
          </li>
        );
      })}
      <p className="text-[10px] text-muted-foreground tabular-nums">
        {done}/{steps.length} complete ({scheduleProgress(done, steps.length)}%)
      </p>
    </ul>
  );
}

export function EntityActivitySchedulesPanel({
  appliesTo,
  contactId,
  listingId,
  compact,
  className,
}: Props) {
  const { toast } = useToast();
  const [pickTemplate, setPickTemplate] = useState("");
  const [openInstance, setOpenInstance] = useState<string | null>(null);

  const entityId = appliesTo === "contact" ? contactId : listingId;
  const { data: templates = [], isLoading: templatesLoading } = useActivityScheduleTemplates(appliesTo);
  const { data: instances = [], isLoading: instancesLoading, refetch } = useEntityActivitySchedules({
    appliesTo,
    contactId,
    listingId,
  });
  const applySchedule = useApplyActivitySchedule();
  const cancelInstance = useCancelActivityScheduleInstance();

  const activeInstances = useMemo(
    () => instances.filter((i) => i.status === "active"),
    [instances],
  );

  const apply = async () => {
    if (!pickTemplate || !entityId) return;
    try {
      await applySchedule.mutateAsync({
        templateId: pickTemplate,
        contactId: appliesTo === "contact" ? contactId : undefined,
        listingId: appliesTo === "listing" ? listingId : undefined,
      });
      toast({ title: "Activity schedule applied", description: "Follow-up steps are on your timeline." });
      setPickTemplate("");
      void refetch();
    } catch (e) {
      toast({
        title: "Could not apply schedule",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  if (!entityId) return null;

  const missingMigration = !templatesLoading && !instancesLoading && templates.length === 0 && instances.length === 0;

  return (
    <Card className={cn("zoho-card p-4 border-border", className)}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5" />
          Activity schedules
        </h3>
        {activeInstances.length > 0 ? (
          <Badge variant="secondary" className="tabular-nums text-[10px]">
            {activeInstances.length} active
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={pickTemplate} onValueChange={setPickTemplate} disabled={templatesLoading || templates.length === 0}>
          <SelectTrigger className={cn("h-8 text-xs", compact ? "flex-1" : "sm:flex-1")}>
            <SelectValue placeholder={templatesLoading ? "Loading…" : "Choose template"} />
          </SelectTrigger>
          <SelectContent>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id} className="text-xs">
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1 text-xs shrink-0"
          disabled={!pickTemplate || applySchedule.isPending}
          onClick={() => void apply()}
        >
          {applySchedule.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Apply
        </Button>
      </div>

      {missingMigration ? (
        <p className="text-xs text-muted-foreground mt-3">
          Run <code className="text-[10px]">npm run db:push</code> to enable activity schedules.
        </p>
      ) : null}

      {instancesLoading ? (
        <p className="text-xs text-muted-foreground mt-3">Loading schedules…</p>
      ) : instances.length === 0 ? (
        <p className="text-xs text-muted-foreground mt-3">
          No schedules applied yet. Pick a template to create dated follow-ups.
        </p>
      ) : (
        <ul className={cn("mt-3 space-y-2", compact ? "max-h-52 overflow-y-auto" : "max-h-72 overflow-y-auto")}>
          {instances.slice(0, compact ? 3 : 8).map((inst) => (
            <li key={inst.id} className="border border-border/60 rounded-md">
              <Collapsible
                open={openInstance === inst.id}
                onOpenChange={(o) => setOpenInstance(o ? inst.id : null)}
              >
                <div className="flex items-center gap-1 p-2">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex flex-1 items-center gap-2 text-left min-w-0"
                    >
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                          openInstance === inst.id && "rotate-180",
                        )}
                      />
                      <span className="text-xs font-medium line-clamp-1">
                        {inst.template?.name ?? "Schedule"}
                      </span>
                    </button>
                  </CollapsibleTrigger>
                  <Badge
                    variant={inst.status === "active" ? "secondary" : "outline"}
                    className="text-[10px] shrink-0 capitalize"
                  >
                    {inst.status}
                  </Badge>
                  {inst.status === "active" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-[10px] text-muted-foreground"
                      disabled={cancelInstance.isPending}
                      onClick={() =>
                        void cancelInstance.mutateAsync(inst.id).then(() => {
                          toast({ title: "Schedule cancelled" });
                        })
                      }
                    >
                      Cancel
                    </Button>
                  ) : null}
                </div>
                <p className="text-[10px] text-muted-foreground px-2 pb-1">
                  Applied {format(new Date(inst.applied_at), "d MMM yyyy")}
                </p>
                <CollapsibleContent className="px-2 pb-2">
                  <InstanceSteps instance={inst} onComplete={() => void refetch()} />
                </CollapsibleContent>
              </Collapsible>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
