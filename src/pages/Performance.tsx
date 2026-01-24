import * as React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { NumbersKPIGrid } from "@/components/agent-ops/NumbersKPIGrid";
import { NumbersCharts } from "@/components/agent-ops/NumbersCharts";
import { LogActivityForm } from "@/components/agent-ops/LogActivityForm";
import { GoalsSection } from "@/components/agent-ops/GoalsSection";
import { CallsTracker } from "@/components/performance/CallsTracker";
import { GoalsManager } from "@/components/performance/GoalsManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Performance() {
  return (
    <div className="animate-fade-in">
      <PageHeader 
        title="Performance & Goals" 
        description="Track your KPIs, log activities, and manage your goals"
      />
      
      <Tabs defaultValue="numbers" className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="numbers">Daily Numbers</TabsTrigger>
          <TabsTrigger value="goals">Goals & Targets</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="numbers" className="space-y-6">
          <LogActivityForm />
          <NumbersKPIGrid />
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GoalsManager />
            <CallsTracker />
          </div>
          <GoalsSection />
        </TabsContent>

        <TabsContent value="analytics">
          <NumbersCharts />
        </TabsContent>
      </Tabs>
    </div>
  );
}
