import { useEffect } from "react";
import { AttentionHubWidget } from "@/components/dashboard/AttentionHubWidget";
import { DailyHubQuickLinks } from "@/components/dashboard/DailyHubQuickLinks";
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
      <PageHeader title="Daily Hub" description="What needs you today, then shortcuts." />
      <AttentionHubWidget />
      <DailyHubQuickLinks />
    </div>
  );
}
