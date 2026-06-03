import { LogActivityForm } from "@/components/agent-ops/LogActivityForm";
import { NumbersKPIGrid } from "@/components/agent-ops/NumbersKPIGrid";

export default function PerformanceNumbersTab() {
  return (
    <div className="space-y-6">
      <LogActivityForm />
      <NumbersKPIGrid />
    </div>
  );
}
