import * as React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Clock, Phone, Mail, MessageSquare, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FollowUp {
  id: string;
  contactName: string;
  type: "call" | "email" | "text";
  dueDate: string;
  priority: "high" | "medium" | "low";
  notes: string;
  completed: boolean;
  overdue: boolean;
}

const initialFollowUps: FollowUp[] = [];

const typeIcons = {
  call: <Phone className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  text: <MessageSquare className="w-4 h-4" />,
};

const priorityColors = {
  high: "bg-destructive/20 text-destructive border-destructive/30",
  medium: "bg-warning/20 text-warning border-warning/30",
  low: "bg-muted text-muted-foreground border-muted",
};

export function FollowUpTracker() {
  const [followUps, setFollowUps] = useState<FollowUp[]>(initialFollowUps);

  const toggleComplete = (id: string) => {
    setFollowUps(followUps.map(f => 
      f.id === id ? { ...f, completed: !f.completed } : f
    ));
  };

  const overdueCount = followUps.filter(f => f.overdue && !f.completed).length;
  const todayCount = followUps.filter(f => f.dueDate.includes("Today") && !f.completed).length;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Follow-Up Queue
          </CardTitle>
          <div className="flex gap-2">
            {overdueCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="w-3 h-3" />
                {overdueCount} Overdue
              </Badge>
            )}
            <Badge variant="secondary">{todayCount} Today</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {followUps.filter(f => !f.completed).map((followUp) => (
          <div 
            key={followUp.id} 
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-all",
              followUp.overdue 
                ? "bg-destructive/10 border-destructive/30" 
                : "bg-secondary/30 border-transparent"
            )}
          >
            <Checkbox
              checked={followUp.completed}
              onCheckedChange={() => toggleComplete(followUp.id)}
            />
            <div className="p-2 rounded-lg bg-secondary">
              {typeIcons[followUp.type]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">{followUp.contactName}</span>
                <Badge className={cn("text-xs", priorityColors[followUp.priority])}>
                  {followUp.priority}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">{followUp.notes}</p>
            </div>
            <div className={cn(
              "text-xs whitespace-nowrap",
              followUp.overdue ? "text-destructive font-medium" : "text-muted-foreground"
            )}>
              {followUp.dueDate}
            </div>
          </div>
        ))}
        
        {/* Completed section */}
        {followUps.some(f => f.completed) && (
          <div className="pt-4 border-t border-border mt-4">
            <p className="text-sm text-muted-foreground mb-2">Completed Today</p>
            {followUps.filter(f => f.completed).map((followUp) => (
              <div key={followUp.id} className="flex items-center gap-3 p-2 opacity-50">
                <Checkbox checked={true} onCheckedChange={() => toggleComplete(followUp.id)} />
                <span className="text-sm line-through">{followUp.contactName} - {followUp.notes}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
