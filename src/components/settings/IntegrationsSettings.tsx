import { Link } from "react-router-dom";
import { Calendar, Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InboundLeadWebhookHelp } from "@/components/settings/InboundLeadWebhookHelp";
import { CrmIntegrationsCard } from "@/components/settings/CrmIntegrationsCard";
import { OperationsEdgeIndex } from "@/components/settings/OperationsEdgeIndex";
import { useGoogleCalendarConnection } from "@/hooks/useGoogleCalendarConnection";
import { useResendIntegrationStatus, useSmsIntegrationStatus } from "@/hooks/useMessagingIntegrationStatus";
import { SettingsSectionHeader } from "./SettingsSectionHeader";
import { SettingsIntegrationCard } from "./SettingsIntegrationCard";
import { Plug } from "lucide-react";

export function IntegrationsSettings() {
  const { data: gcalStatus = "unknown", isLoading: gcalLoading } = useGoogleCalendarConnection();
  const { data: resendStatus = "unavailable", isLoading: resendLoading } = useResendIntegrationStatus();
  const { data: smsStatus = "unavailable", isLoading: smsLoading } = useSmsIntegrationStatus();

  const gcalIntegrationStatus =
    gcalStatus === "connected"
      ? "connected"
      : gcalStatus === "not_connected"
        ? "not_connected"
        : gcalStatus === "unavailable"
          ? "unavailable"
          : "unknown";

  const mapConfigured = (status: typeof resendStatus, loading: boolean) => {
    if (loading) return "unknown" as const;
    if (status === "configured") return "configured" as const;
    if (status === "not_configured") return "not_connected" as const;
    return "unavailable" as const;
  };

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title="Integrations"
        description="Connect calendar, webhooks, SMS, and third-party tools."
        icon={Plug}
      />

      <div className="space-y-4">
        <SettingsIntegrationCard
          icon={Calendar}
          title="Google Calendar"
          description="Sync appointments to your Google Calendar from the dashboard widget or when booking."
          status={gcalLoading ? "unknown" : gcalIntegrationStatus}
          action={
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard">Open Dashboard</Link>
            </Button>
          }
        />

        <SettingsIntegrationCard
          icon={Mail}
          title="Email (Resend)"
          description="Outbound email from Contact detail and Marketing campaigns. Configure RESEND_API_KEY and EMAIL_FROM in Supabase Edge Function secrets."
          status={mapConfigured(resendStatus, resendLoading)}
        />

        <InboundLeadWebhookHelp />

        <CrmIntegrationsCard />
        <OperationsEdgeIndex />

        <SettingsIntegrationCard
          icon={MessageSquare}
          title="SMS (Mobile Message)"
          description="Send SMS from Contact detail and bulk campaigns. See docs/MOBILE_MESSAGE_SETUP.md."
          status={mapConfigured(smsStatus, smsLoading)}
          action={
            <Button variant="outline" size="sm" asChild>
              <Link to="/communications/sms">Open SMS Suite</Link>
            </Button>
          }
        />

        <SettingsIntegrationCard
          icon={MessageSquare}
          title="Apple Messages for Business"
          description="Register with Apple Business Register and choose an approved Messaging Service Provider (MSP)."
          status="unknown"
          action={
            <Button variant="outline" size="sm" asChild>
              <a href="https://register.apple.com/messages" target="_blank" rel="noopener noreferrer">
                Apple Business Register
              </a>
            </Button>
          }
        />
      </div>
    </div>
  );
}
