import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "outreach" | "planning" | "active" | "completed" | "cancelled" | "hot" | "warm" | "cold" | "entered" | "total";

interface StatusBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-secondary text-secondary-foreground",
  outreach: "bg-primary/20 text-primary",
  planning: "bg-primary/30 text-primary",
  active: "bg-success/20 text-success",
  completed: "bg-success/20 text-success",
  cancelled: "bg-destructive/20 text-destructive",
  hot: "bg-destructive/20 text-destructive",
  warm: "bg-warning/20 text-warning",
  cold: "[background:var(--temp-cold-bg)] [color:var(--temp-cold-text)] [border-color:var(--temp-cold-border)]",
  entered: "bg-secondary text-secondary-foreground",
  total: "bg-muted text-muted-foreground",
};

export function StatusBadge({ children, variant = "default", className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
