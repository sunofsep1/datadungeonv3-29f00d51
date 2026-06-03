import * as React from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface KPICardProps {
  title: string;
  current: number;
  goal: number;
  icon: React.ReactNode;
  variant: "appointments" | "listings" | "closings" | "volume";
  format?: "number" | "currency";
}

const variantStyles = {
  appointments: "kpi-card-appointments",
  listings: "kpi-card-listings",
  closings: "kpi-card-closings",
  volume: "kpi-card-volume",
};

const progressColors = {
  appointments: "bg-purple-400",
  listings: "bg-teal-400",
  closings: "bg-blue-400",
  volume: "bg-green-400",
};

export function KPICard({ title, current, goal, icon, variant, format = "number" }: KPICardProps) {
  const percentage = Math.min(Math.round((current / goal) * 100), 100);
  
  const formatValue = (value: number) => {
    if (format === "currency") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    return value.toString();
  };

  return (
    <div className={cn("rounded-xl p-5 text-foreground", variantStyles[variant])}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/10">
            {icon}
          </div>
          <span className="text-sm font-medium text-foreground/80">{title}</span>
        </div>
        <span className="text-xs text-foreground/60">{percentage}%</span>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{formatValue(current)}</span>
          <span className="text-sm text-foreground/60">/ {formatValue(goal)}</span>
        </div>
        
        <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full transition-all duration-500", progressColors[variant])}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        <p className="text-xs text-foreground/60">
          Monthly Goal Progress
        </p>
      </div>
    </div>
  );
}
