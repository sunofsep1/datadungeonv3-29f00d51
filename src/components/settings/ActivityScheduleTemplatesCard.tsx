import { CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useActivityScheduleTemplates,
  useActivityScheduleTemplateSteps,
} from "@/hooks/useActivitySchedules";

function TemplateRow({ templateId, name, appliesTo, description }: {
  templateId: string;
  name: string;
  appliesTo: string;
  description: string | null;
}) {
  const { data: steps = [] } = useActivityScheduleTemplateSteps(templateId);
  return (
    <li className="flex items-start justify-between gap-3 py-2 border-b border-border/50 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{name}</p>
        {description ? <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p> : null}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <Badge variant="outline" className="text-[10px] capitalize">
          {appliesTo}
        </Badge>
        <span className="text-[10px] text-muted-foreground tabular-nums">{steps.length} steps</span>
      </div>
    </li>
  );
}

export function ActivityScheduleTemplatesCard() {
  const { data: templates = [], isLoading } = useActivityScheduleTemplates();

  return (
    <Card className="zoho-card p-5 border-border">
      <div className="flex items-center gap-2 mb-1">
        <CalendarClock className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Activity schedule templates</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Reapit-style follow-up sequences. Apply from a listing or contact; tasks sync to the vendor or contact when
        applicable.
      </p>
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No templates yet. Open a listing or contact to auto-seed starter schedules, or run{" "}
          <code className="text-xs">npm run db:push</code>.
        </p>
      ) : (
        <ul>
          {templates.map((t) => (
            <TemplateRow
              key={t.id}
              templateId={t.id}
              name={t.name}
              appliesTo={t.applies_to}
              description={t.description}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
