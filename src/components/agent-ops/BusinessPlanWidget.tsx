import * as React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { SegmentedTabsList, SegmentedTabsTrigger } from "@/components/ui/segmented-tabs";
import { Target, Calendar, DollarSign, TrendingUp, CheckCircle2, Circle, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnnualGoal {
  id: string;
  category: string;
  metric: string;
  target: number;
  current: number;
  format: "number" | "currency";
}

const annualGoals: AnnualGoal[] = [];

const quarterlyMilestones: { quarter: string; revenue: number; transactions: number; status: "completed" | "in-progress" | "upcoming" }[] = [];

export function BusinessPlanWidget() {
  const formatValue = (value: number, format: "number" | "currency") => {
    if (format === "currency") {
      if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
      }
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Business Plan 2024
          </CardTitle>
          <Button variant="outline" size="sm" className="gap-2">
            <Pencil className="w-3 h-3" />
            Edit Plan
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="goals" className="space-y-4">
          <SegmentedTabsList className="grid-cols-2">
            <SegmentedTabsTrigger value="goals">Annual Goals</SegmentedTabsTrigger>
            <SegmentedTabsTrigger value="milestones">Milestones</SegmentedTabsTrigger>
          </SegmentedTabsList>
          
          <TabsContent value="goals" className="space-y-3">
            {annualGoals.map((goal) => {
              const percentage = Math.min(Math.round((goal.current / goal.target) * 100), 100);
              return (
                <div key={goal.id} className="p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium">{goal.metric}</span>
                      <span className="text-xs text-muted-foreground ml-2">({goal.category})</span>
                    </div>
                    <span className="text-sm font-bold">{percentage}%</span>
                  </div>
                  <Progress value={percentage} className="h-2 mb-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Current: {formatValue(goal.current, goal.format)}</span>
                    <span>Target: {formatValue(goal.target, goal.format)}</span>
                  </div>
                </div>
              );
            })}
          </TabsContent>
          
          <TabsContent value="milestones" className="space-y-3">
            {quarterlyMilestones.map((milestone, index) => (
              <div 
                key={milestone.quarter} 
                className={cn(
                  "flex items-center gap-4 p-3 rounded-lg",
                  milestone.status === "completed" && "bg-success/10 border border-success/30",
                  milestone.status === "in-progress" && "bg-primary/10 border border-primary/30",
                  milestone.status === "upcoming" && "bg-secondary/30"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  milestone.status === "completed" && "bg-success text-success-foreground",
                  milestone.status === "in-progress" && "bg-primary text-primary-foreground",
                  milestone.status === "upcoming" && "bg-secondary text-muted-foreground"
                )}>
                  {milestone.status === "completed" ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-bold">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{milestone.quarter} Targets</span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded",
                      milestone.status === "completed" && "bg-success/20 text-success",
                      milestone.status === "in-progress" && "bg-primary/20 text-primary",
                      milestone.status === "upcoming" && "bg-muted text-muted-foreground"
                    )}>
                      {milestone.status.replace("-", " ")}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                    <span>${(milestone.revenue / 1000)}K GCI</span>
                    <span>{milestone.transactions} transactions</span>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
