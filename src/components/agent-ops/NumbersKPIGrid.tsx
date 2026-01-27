import * as React from "react";
import { Phone, Calendar, Building2, FileText, FileCheck, Handshake, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCurrentMonthActivities } from "@/hooks/useActivities";
import { useKPIGoals } from "@/hooks/useKPIGoals";
import { Skeleton } from "@/components/ui/skeleton";

interface NumbersKPI {
  title: string;
  key: string;
  goalKey: string;
  icon: React.ReactNode;
  format?: "number" | "currency";
  color: string;
}

const kpiConfig: NumbersKPI[] = [
  { title: "Calls Made", key: "calls_made", goalKey: "calls_made_goal", icon: <Phone className="w-5 h-5" />, color: "text-purple-400" },
  { title: "Appointments Set", key: "appointments_set", goalKey: "appointments_set_goal", icon: <Calendar className="w-5 h-5" />, color: "text-teal-400" },
  { title: "Listings Taken", key: "listings_taken", goalKey: "listings_taken_goal", icon: <Building2 className="w-5 h-5" />, color: "text-blue-400" },
  { title: "Offers Written", key: "offers_written", goalKey: "offers_written_goal", icon: <FileText className="w-5 h-5" />, color: "text-amber-400" },
  { title: "Contracts Signed", key: "contracts_signed", goalKey: "contracts_signed_goal", icon: <FileCheck className="w-5 h-5" />, color: "text-green-400" },
  { title: "Closings", key: "closings", goalKey: "closings_goal", icon: <Handshake className="w-5 h-5" />, color: "text-cyan-400" },
  { title: "GCI Earned", key: "gci_earned", goalKey: "gci_earned_goal", icon: <DollarSign className="w-5 h-5" />, format: "currency", color: "text-emerald-400" },
];

export function NumbersKPIGrid() {
  const { data: activities, isLoading: activitiesLoading, isError: activitiesError, refetch: refetchActivities } = useCurrentMonthActivities();
  const { data: goals, isLoading: goalsLoading, isError: goalsError, refetch: refetchGoals } = useKPIGoals();

  const isLoading = activitiesLoading || goalsLoading;
  const isError = activitiesError || goalsError;
  const refetch = () => {
    refetchActivities();
    refetchGoals();
  };

  if (isError) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground mb-4">Couldn&apos;t load daily numbers.</p>
          <Button variant="outline" size="sm" onClick={refetch}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals from activities
  const totals = React.useMemo(() => {
    if (!activities) return {};
    
    return activities.reduce((acc, activity) => {
      kpiConfig.forEach(kpi => {
        const value = activity[kpi.key as keyof typeof activity] as number | null;
        acc[kpi.key] = (acc[kpi.key] || 0) + (value || 0);
      });
      return acc;
    }, {} as Record<string, number>);
  }, [activities]);

  const formatValue = (value: number, format?: "number" | "currency") => {
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

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiConfig.map((kpi) => (
          <Card key={kpi.title} className="bg-card border-border">
            <CardContent className="p-4">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiConfig.map((kpi) => {
        const current = totals[kpi.key] || 0;
        const goal = goals?.[kpi.goalKey as keyof typeof goals] as number || 0;
        const percentage = goal > 0 ? Math.min(Math.round((current / goal) * 100), 100) : 0;
        
        return (
          <Card key={kpi.title} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={cn("p-2 rounded-lg bg-secondary", kpi.color)}>
                  {kpi.icon}
                </div>
                {goal > 0 && (
                  <div className={cn(
                    "flex items-center gap-1 text-xs font-medium",
                    percentage >= 100 ? "text-success" : "text-muted-foreground"
                  )}>
                    {percentage >= 100 ? <TrendingUp className="w-3 h-3" /> : null}
                    {percentage}%
                  </div>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground mb-1">{kpi.title}</p>
              <p className="text-2xl font-bold mb-2">{formatValue(current, kpi.format)}</p>
              
              {goal > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Goal: {formatValue(goal, kpi.format)}</span>
                    <span>{percentage}%</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all", kpi.color.replace("text-", "bg-"))}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )}
              
              {goal === 0 && (
                <p className="text-xs text-muted-foreground">No goal set</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
