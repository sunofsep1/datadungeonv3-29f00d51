import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EditableKPICardProps {
  title: string;
  current: number;
  goal: number;
  icon: React.ReactNode;
  variant: "appointments" | "listings" | "closings" | "volume";
  format?: "number" | "currency";
  onGoalChange?: (newGoal: number) => void;
  onCurrentChange?: (newCurrent: number) => void;
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

export function EditableKPICard({ 
  title, 
  current, 
  goal, 
  icon, 
  variant, 
  format = "number",
  onGoalChange,
  onCurrentChange
}: EditableKPICardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editCurrent, setEditCurrent] = useState(current.toString());
  const [editGoal, setEditGoal] = useState(goal.toString());
  
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

  const handleSave = () => {
    const newCurrent = parseInt(editCurrent) || 0;
    const newGoal = parseInt(editGoal) || 1;
    onCurrentChange?.(newCurrent);
    onGoalChange?.(newGoal);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditCurrent(current.toString());
    setEditGoal(goal.toString());
    setIsEditing(false);
  };

  return (
    <div className={cn("rounded-xl p-5 text-foreground relative group", variantStyles[variant])}>
      {!isEditing && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 bg-white/10 hover:bg-white/20"
          onClick={() => setIsEditing(true)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      
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
        {isEditing ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs text-foreground/60 mb-1 block">Current</label>
                <Input
                  type="number"
                  value={editCurrent}
                  onChange={(e) => setEditCurrent(e.target.value)}
                  className="h-8 bg-white/10 border-white/20 text-foreground"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-foreground/60 mb-1 block">Goal</label>
                <Input
                  type="number"
                  value={editGoal}
                  onChange={(e) => setEditGoal(e.target.value)}
                  className="h-8 bg-white/10 border-white/20 text-foreground"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} className="flex-1 h-7 bg-white/20 hover:bg-white/30">
                <Check className="h-3 w-3 mr-1" /> Save
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel} className="flex-1 h-7 hover:bg-white/10">
                <X className="h-3 w-3 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
