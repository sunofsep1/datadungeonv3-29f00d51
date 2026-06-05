import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { useUserCommunicationSettings, useUpsertUserCommunicationSettings } from "@/hooks/useUserCommunicationSettings";
import { toast } from "sonner";
import { SettingsSectionHeader } from "./SettingsSectionHeader";

export function CommunicationsSettings() {
  const { data: commSettings } = useUserCommunicationSettings();
  const upsertComm = useUpsertUserCommunicationSettings();
  const [smsSigDraft, setSmsSigDraft] = useState("");
  const [emailSigDraft, setEmailSigDraft] = useState("");
  const [emailFromName, setEmailFromName] = useState("");

  useEffect(() => {
    if (!commSettings) return;
    setSmsSigDraft(commSettings.sms_signature ?? "");
    setEmailSigDraft(commSettings.email_signature ?? "");
    setEmailFromName(commSettings.email_from_name ?? "");
  }, [commSettings?.sms_signature, commSettings?.email_signature, commSettings?.email_from_name, commSettings?.updated_at]);

  const handleSave = () => {
    upsertComm.mutate(
      {
        sms_signature: smsSigDraft,
        email_signature: emailSigDraft,
        email_from_name: emailFromName.trim(),
      },
      {
        onSuccess: () => toast.success("Communication settings saved"),
        onError: () => toast.error("Could not save settings"),
      },
    );
  };

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title="Communications"
        description="SMS signature, email signature, and outbound messaging defaults."
        icon={MessageSquare}
      />

      <Card className="zoho-card p-6 border-border space-y-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">SMS</h3>
          <p className="text-sm text-muted-foreground">
            Used automatically in SMS templates as <code className="text-xs">{"{{signature}}"}</code>. Include your name
            and agency so messages meet identification rules (e.g. Spam Act AU).
          </p>
          <div className="space-y-2">
            <Label htmlFor="sms-signature">SMS signature</Label>
            <Textarea
              id="sms-signature"
              className="bg-input min-h-[88px] text-sm"
              placeholder="e.g. Greg Leigh, Sotheby's International Realty"
              value={smsSigDraft}
              onChange={(e) => setSmsSigDraft(e.target.value)}
              maxLength={280}
            />
            <p className="text-xs text-muted-foreground">{smsSigDraft.length} / 280</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/communications/sms">Open SMS Suite</Link>
          </Button>
        </div>

        <div className="border-t border-border pt-6 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Email</h3>
          <p className="text-sm text-muted-foreground">
            Appended to outbound emails from Contact detail. Plain text is converted to HTML when sending.
          </p>
          <div className="space-y-2">
            <Label htmlFor="email-from-name">From display name</Label>
            <Input
              id="email-from-name"
              className="bg-input max-w-md"
              placeholder="e.g. Greg Leigh"
              value={emailFromName}
              onChange={(e) => setEmailFromName(e.target.value)}
              maxLength={120}
            />
            <p className="text-xs text-muted-foreground">
              Shown alongside your Resend from address. Configure <code className="text-xs">EMAIL_FROM</code> in Supabase
              secrets.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-signature">Email signature</Label>
            <Textarea
              id="email-signature"
              className="bg-input min-h-[100px] text-sm font-mono"
              placeholder={"Kind regards,\nGreg Leigh\nSotheby's International Realty\n0412 345 678"}
              value={emailSigDraft}
              onChange={(e) => setEmailSigDraft(e.target.value)}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground">{emailSigDraft.length} / 2000</p>
          </div>
        </div>

        <Button type="button" onClick={handleSave} disabled={upsertComm.isPending}>
          {upsertComm.isPending ? "Saving…" : "Save communication settings"}
        </Button>
      </Card>
    </div>
  );
}
