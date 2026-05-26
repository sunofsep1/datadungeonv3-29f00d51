import { useEffect } from "react";
import { AttentionHubWidget } from "@/components/dashboard/AttentionHubWidget";
import { DailyHubQuickLinks } from "@/components/dashboard/DailyHubQuickLinks";
import { DailyHubTouchScorecard } from "@/components/dashboard/DailyHubTouchScorecard";
import { DailyHubPriorityAndSmartLists } from "@/components/dashboard/DailyHubPriorityAndSmartLists";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDrako } from "@/components/drako";
import { pickDrakoLine } from "@/lib/drakoDialogue";

export default function AttentionHub() {
  const { moveTo } = useDrako();

  useEffect(() => {
    const key = `drako-greeted-${new Date().toDateString()}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      moveTo("stage", { caption: pickDrakoLine("guide") });
    }
  }, [moveTo]);

  return (
    <div className="animate-fade-in flex min-h-0 flex-1 flex-col gap-4 pb-6">
      <PageHeader title="Daily Hub" description="Focus queue, nurture & tasks, then shortcuts below." />
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
