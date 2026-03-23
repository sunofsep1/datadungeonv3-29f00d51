import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useKPIGoals } from "@/hooks/useKPIGoals";
import { useActivities } from "@/hooks/useActivities";
import { DollarSign, Calendar, Phone, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

export function KPISnapshot() {
  const { data: goals, isError: goalsError, refetch: refetchGoals } = useKPIGoals();
  const { data: activities = [], isError: activitiesError, refetch: refetchActivities } = useActivities();

  const isError = goalsError || activitiesError;
  const refetch = () => {
    refetchGoals();
    refetchActivities();
  };

  if (isError) {
    return (
      <Card className="zoho-card p-3">
        <h3 className="text-base font-semibold text-white mb-2">KPI Snapshot</h3>
        <p className="text-sm text-white/60 mb-2">Couldn&apos;t load KPI data.</p>
        <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10" onClick={refetch}>Retry</Button>
      </Card>
    );
  }

  // Calculate totals from activities
  const totals = (activities ?? []).reduce(
    (acc, activity) => ({
      gci: acc.gci + (activity.gci_earned || 0),
      appointments: acc.appointments + (activity.appointments_set || 0),
      calls: acc.calls + (activity.calls_made || 0),
      closings: acc.closings + (activity.closings || 0),
    }),
    { gci: 0, appointments: 0, calls: 0, closings: 0 }
  );

  const kpis = [
    {
      label: "GCI Earned",
      current: totals.gci,
      goal: goals?.gci_earned_goal || 100000,
      icon: DollarSign,
      format: (v: number) => `$${(v / 1000).toFixed(0)}k`,
      color: "text-success",
    },
    {
      label: "Appointments",
      current: totals.appointments,
      goal: goals?.appointments_set_goal || 20,
      icon: Calendar,
      format: (v: number) => v.toString(),
      color: "text-primary",
    },
    {
      label: "Calls Made",
      current: totals.calls,
      goal: goals?.calls_made_goal || 200,
      icon: Phone,
      format: (v: number) => v.toString(),
      color: "text-info",
    },
    {
      label: "Closings",
      current: totals.closings,
      goal: goals?.closings_goal || 4,
      icon: TrendingUp,
      format: (v: number) => v.toString(),
      color: "text-teal",
    },
  ];

  return (
    <Card className="zoho-card p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold text-white">KPI Snapshot</h3>
        <Link to="/performance" className="text-xs text-[#00BCD4] hover:underline">
          View All →
        </Link>
      </div>

      <div className="space-y-3">
        {kpis.map((kpi) => {
          const progress = Math.min((kpi.current / kpi.goal) * 100, 100);
          return (
            <div key={kpi.label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                  <span className="text-sm text-white">{kpi.label}</span>
                </div>
                <span className="text-sm font-medium text-white">
                  {kpi.format(kpi.current)} / {kpi.format(kpi.goal)}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
