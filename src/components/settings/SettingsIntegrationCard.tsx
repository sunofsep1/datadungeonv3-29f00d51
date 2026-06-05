import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type IntegrationStatus = "connected" | "not_connected" | "unavailable" | "configured" | "unknown";

const STATUS_LABEL: Record<IntegrationStatus, string> = {
  connected: "Connected",
  not_connected: "Not connected",
  unavailable: "Unavailable",
  configured: "Configured",
  unknown: "Unknown",
};

const STATUS_CLASS: Record<IntegrationStatus, string> = {
  connected: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  not_connected: "bg-muted text-muted-foreground border-border",
  unavailable: "bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/30",
  configured: "bg-primary/10 text-primary border-primary/30",
  unknown: "bg-muted text-muted-foreground border-border",
};

type SettingsIntegrationCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  status?: IntegrationStatus;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function SettingsIntegrationCard({
  icon: Icon,
  title,
  description,
  status = "unknown",
  action,
  children,
  className,
}: SettingsIntegrationCardProps) {
  return (
    <Card className={cn("zoho-card p-5 border-border", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3 min-w-0">
          <Icon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <Badge variant="outline" className={cn("text-[10px] font-medium", STATUS_CLASS[status])}>
                {STATUS_LABEL[status]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
            {children}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </Card>
  );
}
