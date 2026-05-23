import { AlertTriangle, BarChart3, CalendarClock, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatFunnelAud } from "@/lib/listingPipelineFunnel";
import type { ReportsSnapshot } from "@/lib/reportsSnapshot";
import { cn } from "@/lib/utils";

type Props = {
  snapshot: ReportsSnapshot;
  activeTab: string;
  onSelectTab: (tab: string) => void;
};

type KpiCard = {
  id: string;
  tab: string;
  label: string;
  value: string;
  hint: string;
  icon: typeof BarChart3;
  accent?: string;
};

export function ReportsSnapshotCards({ snapshot, activeTab, onSelectTab }: Props) {
  const cards: KpiCard[] = [
    {
      id: "pipeline",
      tab: "pipeline",
      label: "Pipeline GCI",
      value: formatFunnelAud(snapshot.pipelineGci),
      hint: `${snapshot.pipelineCount} listings · ${formatFunnelAud(snapshot.pipelineValue)} value`,
      icon: BarChart3,
      accent: "text-primary",
    },
    {
      id: "dom",
      tab: "dom",
      label: "DOM 60+ days",
      value: String(snapshot.domOver60),
      hint: "On-market listings needing attention",
      icon: Clock,
      accent: snapshot.domOver60 > 0 ? "text-amber-400" : undefined,
    },
    {
      id: "expiry",
      tab: "expiry",
      label: "Authority expiry",
      value: String(snapshot.expiringWithin30 + snapshot.expiredAuthorities),
      hint:
        snapshot.expiredAuthorities > 0
          ? `${snapshot.expiredAuthorities} expired · ${snapshot.expiringWithin30} in 30d`
          : `${snapshot.expiringWithin30} expiring in 30d`,
      icon: CalendarClock,
      accent:
        snapshot.expiredAuthorities > 0
          ? "text-red-400"
          : snapshot.expiringWithin30 > 0
            ? "text-amber-400"
            : undefined,
    },
    {
      id: "settlements",
      tab: "settlements",
      label: "Settlements (30d)",
      value: String(snapshot.settlementsWithin30 + snapshot.overdueSettlements),
      hint:
        snapshot.overdueSettlements > 0
          ? `${snapshot.overdueSettlements} overdue`
          : "Under contract / unconditional",
      icon: AlertTriangle,
      accent: snapshot.overdueSettlements > 0 ? "text-red-400" : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ id, tab, label, value, hint, icon: Icon, accent }) => (
        <Card
          key={id}
          className={cn(
            "zoho-card p-4 border-border transition-colors cursor-pointer hover:border-primary/30",
            activeTab === tab && "ring-1 ring-primary/40 border-primary/30",
          )}
          role="button"
          tabIndex={0}
          onClick={() => onSelectTab(tab)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectTab(tab);
            }
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
            <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </div>
          <p className={cn("text-2xl font-bold tabular-nums mt-1", accent ?? "text-foreground")}>{value}</p>
          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{hint}</p>
        </Card>
      ))}
    </div>
  );
}
