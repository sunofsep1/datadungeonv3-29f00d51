import { Sparkles } from "lucide-react";
import { AttentionHubWidget } from "@/components/dashboard/AttentionHubWidget";
import { DailyHubQuickLinks } from "@/components/dashboard/DailyHubQuickLinks";
import { DailyHubTouchScorecard } from "@/components/dashboard/DailyHubTouchScorecard";
import { DailyHubPriorityAndSmartLists } from "@/components/dashboard/DailyHubPriorityAndSmartLists";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";

export default function AttentionHub() {
  return (
    <div className="animate-fade-in flex min-h-0 flex-1 flex-col gap-4 pb-6">
      <PageHeader
        title="Daily Hub"
        description="Prioritized actions, then one-tap jumps to the rest of your CRM day."
      />
      <Card className="zoho-card p-4">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          What needs you now
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Overdue, today, and upcoming — sequences, contact tasks, todos, and appointments in one stack.
        </p>
      </Card>
      <AttentionHubWidget />
      <DailyHubQuickLinks />
      <Card className="zoho-card p-4 border-border">
        <DailyHubPriorityAndSmartLists />
      </Card>
      <div className="rounded-lg border border-border/70 bg-card/30 p-3">
        <DailyHubTouchScorecard />
      </div>
    </div>
  );
}
