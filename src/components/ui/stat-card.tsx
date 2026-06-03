import { cn } from "@/lib/utils";

type StatCardVariant = "total" | "active" | "planning" | "completed" | "cancelled";

interface StatCardProps {
  value: number | string;
  label: string;
  variant?: StatCardVariant;
  icon?: string;
  className?: string;
}

export function StatCard({ value, label, variant = "total", icon, className }: StatCardProps) {
  return (
    <div className={cn(`stat-card stat-card-${variant}`, className)}>
      <div className="text-3xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
        {icon && <span>{icon}</span>}
        {label}
      </div>
    </div>
  );
}
