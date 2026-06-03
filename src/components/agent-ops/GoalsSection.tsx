import * as React from "react";
import { useState } from "react";
import { Target, User, CheckSquare, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { SegmentedTabsListCompact, SegmentedTabsTrigger } from "@/components/ui/segmented-tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Goal {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
}

const workGoals: Goal[] = [];

const personalGoals: Goal[] = [];

interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
}

const taskItems: TaskItem[] = [];

function GoalItem({ goal }: { goal: Goal }) {
  const percentage = Math.round((goal.current / goal.target) * 100);
  
  return (
    <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{goal.title}</span>
        <span className="text-xs text-muted-foreground">{percentage}%</span>
      </div>
      <Progress value={percentage} className="h-2" />
      <p className="text-xs text-muted-foreground">
        {goal.current} / {goal.target} {goal.unit}
      </p>
    </div>
  );
}

function TaskItemComponent({ task }: { task: TaskItem }) {
  const [completed, setCompleted] = useState(task.completed);
  
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border transition-all",
      completed ? "bg-muted/30 border-muted" : "bg-secondary/50 border-border"
    )}>
      <button
        onClick={() => setCompleted(!completed)}
        className={cn(
          "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
          completed 
            ? "bg-success border-success text-success-foreground" 
            : "border-muted-foreground hover:border-primary"
        )}
      >
        {completed && <CheckSquare className="w-3 h-3" />}
      </button>
      <span className={cn(
        "flex-1 text-sm",
        completed && "line-through text-muted-foreground"
      )}>
        {task.title}
      </span>
      {task.dueDate && (
        <span className="text-xs text-muted-foreground">{task.dueDate}</span>
      )}
    </div>
  );
}

export function GoalsSection() {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-teal" />
            Goals & Tasks
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="work" className="w-full">
          <SegmentedTabsListCompact className="mb-4 grid-cols-3">
            <SegmentedTabsTrigger compact value="work" className="inline-flex items-center justify-center gap-1.5">
              <Target className="h-3.5 w-3.5 shrink-0" />
              Work
            </SegmentedTabsTrigger>
            <SegmentedTabsTrigger compact value="personal" className="inline-flex items-center justify-center gap-1.5">
              <User className="h-3.5 w-3.5 shrink-0" />
              Personal
            </SegmentedTabsTrigger>
            <SegmentedTabsTrigger compact value="tasks" className="inline-flex items-center justify-center gap-1.5">
              <CheckSquare className="h-3.5 w-3.5 shrink-0" />
              Tasks
            </SegmentedTabsTrigger>
          </SegmentedTabsListCompact>
          
          <TabsContent value="work" className="space-y-3 mt-0">
            {workGoals.map((goal) => (
              <GoalItem key={goal.id} goal={goal} />
            ))}
          </TabsContent>
          
          <TabsContent value="personal" className="space-y-3 mt-0">
            {personalGoals.map((goal) => (
              <GoalItem key={goal.id} goal={goal} />
            ))}
          </TabsContent>
          
          <TabsContent value="tasks" className="space-y-2 mt-0">
            {taskItems.map((task) => (
              <TaskItemComponent key={task.id} task={task} />
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
