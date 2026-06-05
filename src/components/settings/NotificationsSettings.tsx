import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserReminderPreferences, useUpsertUserReminderPreferences } from "@/hooks/useUserReminderPreferences";
import { IN_APP_NOTIFICATION_SOURCES } from "@/lib/notificationRules";
import { toast } from "sonner";
import { SettingsSectionHeader } from "./SettingsSectionHeader";

export function NotificationsSettings() {
  const { user } = useAuth();
  const { data: reminderPrefs, isSuccess: reminderPrefsLoaded } = useUserReminderPreferences();
  const upsertReminder = useUpsertUserReminderPreferences();
  const reminderPrefsSeeded = useRef(false);

  useEffect(() => {
    if (!user || !reminderPrefsLoaded || reminderPrefs !== null || reminderPrefsSeeded.current) return;
    reminderPrefsSeeded.current = true;
    upsertReminder.mutate({ digest_enabled: true, digest_frequency: "daily" });
  }, [user, reminderPrefsLoaded, reminderPrefs, upsertReminder]);

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title="Notifications"
        description="In-app alerts, digest email, and appointment reminders."
        icon={Bell}
      />
      <Card className="zoho-card p-6 border-border">
        <div className="rounded-md border border-border/70 bg-muted/15 p-3 space-y-2 mb-6">
          <p className="text-xs font-medium text-foreground">In-app (header bell)</p>
          <p className="text-[11px] text-muted-foreground">
            These appear in the drawer next to your avatar. New rows can arrive in real time; the badge counts unread items.
          </p>
          <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4 marker:text-muted-foreground/70">
            {IN_APP_NOTIFICATION_SOURCES.map((r) => (
              <li key={r.headline}>
                <span className="text-foreground/90 font-medium">{r.headline}</span>
                <span className="text-muted-foreground"> — {r.detail}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          <span className="text-foreground font-medium">Daily digest email</span> is separate: it is an outbound email summary (Resend + cron), not the same list as the bell.
        </p>
        <div className="space-y-4">
          <div id="digest-email" className="flex items-center justify-between gap-4 scroll-mt-24">
            <div>
              <p className="text-sm font-medium text-foreground">Daily CRM digest email</p>
              <p className="text-xs text-muted-foreground">
                Summary of contacts due for follow-up and open contact tasks (requires RESEND_API_KEY on the server).
              </p>
            </div>
            <Switch
              checked={reminderPrefs?.digest_enabled ?? true}
              onCheckedChange={(v) =>
                upsertReminder.mutate(
                  { digest_enabled: v },
                  {
                    onSuccess: () => toast.success(v ? "Digest enabled" : "Digest off"),
                    onError: () => toast.error("Could not save"),
                  },
                )
              }
              disabled={upsertReminder.isPending}
            />
          </div>
          <div className="space-y-2 max-w-xs">
            <Label>Digest frequency</Label>
            <p className="text-xs text-muted-foreground">Digest cron runs daily; frequency stored for future use.</p>
            <Select
              value={reminderPrefs?.digest_frequency ?? "daily"}
              onValueChange={(val) =>
                upsertReminder.mutate(
                  { digest_frequency: val as "daily" | "weekly" },
                  { onSuccess: () => toast.success("Saved"), onError: () => toast.error("Could not save") },
                )
              }
              disabled={upsertReminder.isPending}
            >
              <SelectTrigger className="bg-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div id="appointment-reminders" className="flex items-start justify-between gap-4 scroll-mt-24">
            <div>
              <p className="text-sm font-medium text-foreground">Appointment reminders</p>
              <p className="text-xs text-muted-foreground">
                Email via Resend when configured. Optional SMS: set secret{" "}
                <code className="text-[10px]">APPOINTMENT_REMINDER_SMS=true</code> on appointment-reminders.
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </Card>
    </div>
  );
}
