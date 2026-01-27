import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Target, Plus, Trash2, Pencil, TrendingUp, TrendingDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useKPIGoals } from "@/hooks/useKPIGoals";
import { useActivities } from "@/hooks/useActivities";
import { useCalls } from "@/hooks/useCalls";

export function GoalsManager() {
  const { toast } = useToast();
  const { data: kpiGoals, isLoading: goalsLoading, isError: goalsError, refetch: refetchGoals } = useKPIGoals();
  const { data: activities = [], isError: activitiesError, refetch: refetchActivities } = useActivities();
  const { data: calls = [], isError: callsError, refetch: refetchCalls } = useCalls();

  const isError = goalsError || activitiesError || callsError;
  const refetch = () => {
    refetchGoals();
    refetchActivities();
    refetchCalls();
  };

  if (isError) {
    return (
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Goals Progress</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Couldn&apos;t load goals data.</p>
        <Button variant="outline" size="sm" onClick={refetch}>Retry</Button>
      </Card>
    );
  }

  // Calculate totals from activities
  const totals = useMemo(() => {
    return activities.reduce((acc, activity) => ({
      gci: acc.gci + Number(activity.gci_earned || 0),
      calls: acc.calls + (activity.calls_made || 0),
      appointments: acc.appointments + (activity.appointments_set || 0),
      closings: acc.closings + (activity.closings || 0),
      listings: acc.listings + (activity.listings_taken || 0),
      contracts: acc.contracts + (activity.contracts_signed || 0),
      offers: acc.offers + (activity.offers_written || 0),
    }), {
      gci: 0,
      calls: 0,
      appointments: 0,
      closings: 0,
      listings: 0,
      contracts: 0,
      offers: 0,
    });
  }, [activities]);

  // Add calls from calls table
  const totalCalls = totals.calls + calls.length;

  const goals = useMemo(() => {
    if (!kpiGoals) return [];
    return [
      { 
        name: "GCI Earned", 
        target: kpiGoals.gci_earned_goal || 100000, 
        current: totals.gci,
        format: (v: number) => `$${v.toLocaleString()}`
      },
      { 
        name: "Calls Made", 
        target: kpiGoals.calls_made_goal || 200, 
        current: totalCalls,
        format: (v: number) => v.toString()
      },
      { 
        name: "Appointments Set", 
        target: kpiGoals.appointments_set_goal || 20, 
        current: totals.appointments,
        format: (v: number) => v.toString()
      },
      { 
        name: "Listings Taken", 
        target: kpiGoals.listings_taken_goal || 5, 
        current: totals.listings,
        format: (v: number) => v.toString()
      },
      { 
        name: "Contracts Signed", 
        target: kpiGoals.contracts_signed_goal || 8, 
        current: totals.contracts,
        format: (v: number) => v.toString()
      },
      { 
        name: "Closings", 
        target: kpiGoals.closings_goal || 4, 
        current: totals.closings,
        format: (v: number) => v.toString()
      },
      { 
        name: "Offers Written", 
        target: kpiGoals.offers_written_goal || 15, 
        current: totals.offers,
        format: (v: number) => v.toString()
      },
    ];
  }, [kpiGoals, totals, totalCalls]);

  // Stats
  const onTrack = goals.filter(g => (g.current / g.target) >= 0.7).length;
  const offTrack = goals.length - onTrack;

  if (goalsLoading) {
    return (
      <Card className="p-6 bg-card border-border">
        <div className="text-center py-8 text-muted-foreground">Loading goals...</div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Goals Progress</h3>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3 bg-success/10 border border-success/20 rounded-lg text-center">
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="w-4 h-4 text-success" />
            <p className="text-2xl font-bold text-success">{onTrack}</p>
          </div>
          <p className="text-xs text-muted-foreground">On Track</p>
        </div>
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
          <div className="flex items-center justify-center gap-2">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <p className="text-2xl font-bold text-destructive">{offTrack}</p>
          </div>
          <p className="text-xs text-muted-foreground">Off Track</p>
        </div>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {goals.map((goal, idx) => {
          const progress = Math.min((goal.current / goal.target) * 100, 100);
          const isOnTrack = progress >= 70;
          
          return (
            <div key={idx} className="p-4 bg-secondary rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-foreground">{goal.name}</span>
                <span className="text-sm text-muted-foreground">
                  {goal.format(goal.current)} / {goal.format(goal.target)}
                </span>
              </div>
              <Progress 
                value={progress} 
                className="h-2"
              />
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs ${isOnTrack ? 'text-success' : 'text-warning'}`}>
                  {progress.toFixed(0)}% complete
                </span>
                <span className={`text-xs font-medium ${isOnTrack ? 'text-success' : 'text-warning'}`}>
                  {isOnTrack ? "On Track" : "Needs Attention"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        Goals are set in the Daily Numbers tab. Progress updates automatically.
      </p>
    </Card>
  );
}
