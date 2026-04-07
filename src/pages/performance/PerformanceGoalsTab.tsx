import { GoalsSection } from "@/components/agent-ops/GoalsSection";
import { CallsTracker } from "@/components/performance/CallsTracker";
import { GoalsManager } from "@/components/performance/GoalsManager";

export default function PerformanceGoalsTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GoalsManager />
        <CallsTracker />
      </div>
      <GoalsSection />
    </div>
  );
}
