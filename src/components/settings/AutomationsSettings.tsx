import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Workflow } from "lucide-react";
import { ActivityScheduleBuilderCard } from "@/components/settings/ActivityScheduleBuilderCard";
import { ListingStageAutomationCard } from "@/components/settings/ListingStageAutomationCard";
import { SettingsSectionHeader } from "./SettingsSectionHeader";

export function AutomationsSettings() {
  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title="Automations"
        description="Listing stage rules, activity schedules, and CRM workflows."
        icon={Workflow}
      />
      <ListingStageAutomationCard />
      <ActivityScheduleBuilderCard />
      <Card className="zoho-card p-6 border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Workflow className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground">CRM workflows</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Create workflows, enroll contacts, and manage listing triggers from the Automations hub.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/automations">Open Automations</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
