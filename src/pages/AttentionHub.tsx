import { Sparkles } from "lucide-react";
import { AttentionHubWidget } from "@/components/dashboard/AttentionHubWidget";
import { Card } from "@/components/ui/card";

export default function AttentionHub() {
  return (
    <div className="animate-fade-in flex min-h-0 flex-1 flex-col gap-4 pb-6">
      <Card className="zoho-card p-4">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Daily Attention Hub
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Your focused action timeline for overdue, today, and upcoming tasks.
        </p>
      </Card>
      <AttentionHubWidget />
    </div>
  );
}
