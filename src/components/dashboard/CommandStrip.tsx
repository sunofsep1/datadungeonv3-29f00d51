import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type CommandPill = {
  key: string;
  label: string;
  value: number;
  onClick: () => void;
};

type CommandStripProps = {
  greeting: string;
  displayName: string;
  pills: CommandPill[];
  onQuickAdd: () => void;
  onOpenVisionBoard: () => void;
};

export function CommandStrip({
  greeting,
  displayName,
  pills,
  onQuickAdd,
  onOpenVisionBoard,
}: CommandStripProps) {
  const todayLabel = format(new Date(), "EEEE, d MMMM");

  return (
    <Card className="w-full border border-border/80 bg-card/80 px-4 py-3 shadow-none">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[13px] text-muted-foreground">{todayLabel}</p>
          <p className="text-[17px] font-semibold text-foreground truncate">
            {greeting}, {displayName}
          </p>
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-start gap-2 lg:justify-center">
          {pills.map((pill) => (
            <button
              key={pill.key}
              type="button"
              onClick={pill.onClick}
              className="rounded-full border border-border/80 bg-background/40 px-3 py-1.5 text-[14px] font-medium text-foreground transition-colors hover:bg-muted/70"
            >
              <span className="tabular-nums font-semibold">{pill.value}</span> {pill.label}
            </button>
          ))}
          <Button variant="ghost" size="sm" className="h-8 text-[13px]" onClick={onOpenVisionBoard}>
            Vision board
          </Button>
        </div>

        <Button type="button" className="h-9 text-[14px]" onClick={onQuickAdd}>
          + Quick Add
        </Button>
      </div>
    </Card>
  );
}
