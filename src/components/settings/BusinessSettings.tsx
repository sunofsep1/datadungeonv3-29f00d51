import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";
import { useCommissionRate } from "@/hooks/useCommissionRate";
import { useUserProfile, useUpsertUserProfile } from "@/hooks/useUserProfile";
import { SettingsSectionHeader } from "./SettingsSectionHeader";
import { toast } from "sonner";

const APPOINTMENT_DURATIONS = [30, 45, 60, 90] as const;

export function BusinessSettings() {
  const { commissionRate, setCommissionRate } = useCommissionRate();
  const { data: profile, isLoading } = useUserProfile();
  const upsertProfile = useUpsertUserProfile();

  const [followUpDays, setFollowUpDays] = useState("14");
  const [appointmentDuration, setAppointmentDuration] = useState<(typeof APPOINTMENT_DURATIONS)[number]>(60);

  useEffect(() => {
    if (!profile) return;
    setFollowUpDays(String(profile.default_follow_up_days ?? 14));
    setAppointmentDuration(profile.default_appointment_duration ?? 60);
  }, [profile]);

  const handleSaveDefaults = () => {
    const days = Number.parseInt(followUpDays, 10);
    if (!Number.isFinite(days) || days < 1 || days > 365) {
      toast.error("Follow-up days must be between 1 and 365");
      return;
    }
    upsertProfile.mutate(
      {
        default_follow_up_days: days,
        default_appointment_duration: appointmentDuration,
      },
      {
        onSuccess: () => toast.success("Business defaults saved"),
        onError: () => toast.error("Could not save defaults"),
      },
    );
  };

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title="Business Defaults"
        description="Defaults used in listings, pipeline, calendar, and follow-up cadence."
        icon={Calendar}
      />
      <Card className="zoho-card p-6 border-border space-y-6">
        <div className="space-y-2 max-w-xs">
          <Label htmlFor="commission-rate">Default commission rate (%)</Label>
          <Input
            id="commission-rate"
            type="number"
            min={0}
            max={10}
            step={0.1}
            value={commissionRate}
            onChange={(e) => setCommissionRate(Number(e.target.value))}
            className="bg-input"
          />
          <p className="text-xs text-muted-foreground">
            Used for Projected GCI in Listings &amp; Sales and Performance. Saved locally on this device.
          </p>
        </div>

        <div className="border-t border-border pt-6 space-y-4">
          <div id="follow-up-days" className="space-y-2 max-w-xs scroll-mt-24">
            <Label htmlFor="follow-up-days-input">Default contact follow-up (days)</Label>
            <Input
              id="follow-up-days-input"
              type="number"
              min={1}
              max={365}
              className="bg-input"
              value={followUpDays}
              onChange={(e) => setFollowUpDays(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Reference for when contacts without a temperature-specific cadence should be touched again.
            </p>
          </div>
          <div id="appointment-duration" className="space-y-2 max-w-xs scroll-mt-24">
            <Label>Default appointment duration</Label>
            <Select
              value={String(appointmentDuration)}
              onValueChange={(v) => setAppointmentDuration(Number(v) as (typeof APPOINTMENT_DURATIONS)[number])}
              disabled={isLoading}
            >
              <SelectTrigger className="bg-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPOINTMENT_DURATIONS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m} minutes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Used when booking new appointments from the calendar.</p>
          </div>
          <Button type="button" onClick={handleSaveDefaults} disabled={upsertProfile.isPending || isLoading}>
            {upsertProfile.isPending ? "Saving…" : "Save CRM defaults"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
