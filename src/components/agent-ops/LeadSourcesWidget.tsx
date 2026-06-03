import * as React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Globe, Users, Phone, Home, Mail, Share2, TrendingUp, Search, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadSource {
  id: string;
  name: string;
  icon: React.ReactNode;
  leads: number;
  conversions: number;
  color: string;
}

const initialSources: LeadSource[] = [];

export function LeadSourcesWidget() {
  const [sources] = useState<LeadSource[]>(initialSources);

  const totalLeads = sources.reduce((acc, s) => acc + s.leads, 0);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Lead Sources
          </CardTitle>
          <Badge variant="secondary">{totalLeads} Total Leads</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {sources.map((source) => {
          const conversionRate = Math.round((source.conversions / source.leads) * 100);
          const leadPercentage = Math.round((source.leads / totalLeads) * 100);
          
          return (
            <div key={source.id} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
              <div className={cn("p-2 rounded-lg", source.color)}>
                {source.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{source.name}</span>
                  <span className="text-xs text-muted-foreground">{leadPercentage}% of leads</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{source.leads} leads</span>
                  <span className="text-success">{source.conversions} converted ({conversionRate}%)</span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
