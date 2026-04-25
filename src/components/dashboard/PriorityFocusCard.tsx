import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type PriorityTone = "hot" | "appointment" | "overdue" | "clear";

type PriorityFocusCardProps = {
  message: string;
  tone: PriorityTone;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
};

const TONE_STYLES: Record<PriorityTone, string> = {
  hot: "border-l-4 border-l-amber-500",
  appointment: "border-l-4 border-l-blue-500",
  overdue: "border-l-4 border-l-red-500",
  clear: "border-l-4 border-l-green-500",
};

export function PriorityFocusCard({
  message,
  tone,
  primaryAction,
  secondaryAction,
}: PriorityFocusCardProps) {
  return (
    <Card className={`w-full border border-border bg-card/80 p-4 shadow-none ${TONE_STYLES[tone]}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[18px] font-semibold text-foreground">{message}</p>
        {(primaryAction || secondaryAction) && (
          <div className="flex items-center gap-2">
            {secondaryAction ? (
              <Button type="button" variant="outline" className="h-9 text-[14px]" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            ) : null}
            {primaryAction ? (
              <Button type="button" className="h-9 text-[14px]" onClick={primaryAction.onClick}>
                {primaryAction.label}
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </Card>
  );
}
