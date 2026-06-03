import * as React from "react";
import { useState } from "react";
import { Check, Circle, Clock, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface Task {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  time?: string;
  completed: boolean;
}

const initialTasks: Task[] = [];

const priorityColors = {
  high: "text-destructive",
  medium: "text-warning",
  low: "text-muted-foreground",
};

const priorityBgColors = {
  high: "bg-destructive/10 border-destructive/20",
  medium: "bg-warning/10 border-warning/20",
  low: "bg-muted/50 border-muted",
};

export function TodaysFocus() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Star className="w-5 h-5 text-warning" />
            Today's Focus
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {tasks.length === 0 ? "No tasks yet" : `${completedCount}/${tasks.length} completed`}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-all",
              task.completed 
                ? "bg-muted/30 border-muted opacity-60" 
                : priorityBgColors[task.priority]
            )}
          >
            <Checkbox
              checked={task.completed}
              onCheckedChange={() => toggleTask(task.id)}
              className="data-[state=checked]:bg-success data-[state=checked]:border-success"
            />
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium truncate",
                task.completed && "line-through text-muted-foreground"
              )}>
                {task.title}
              </p>
            </div>
            {task.time && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {task.time}
              </div>
            )}
            <div className={cn("w-2 h-2 rounded-full", {
              "bg-destructive": task.priority === "high",
              "bg-warning": task.priority === "medium",
              "bg-muted-foreground": task.priority === "low",
            })} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
