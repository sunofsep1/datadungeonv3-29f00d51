import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SettingsSectionHeader } from "./SettingsSectionHeader";
import { TwoFactorSettings } from "./TwoFactorSettings";
import { ActiveSessionsSettings } from "./ActiveSessionsSettings";
import { toast } from "sonner";

export function SecuritySettings() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title="Security"
        description="Password, two-factor authentication, and account access."
        icon={ShieldCheck}
      />
      <Card className="zoho-card p-6 border-border space-y-4">
        <div className="space-y-2 max-w-sm">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            className="bg-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2 max-w-sm">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            className="bg-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <Button type="button" onClick={() => void handleChangePassword()} disabled={saving || !password}>
          {saving ? "Updating…" : "Change password"}
        </Button>
      </Card>

      <TwoFactorSettings />
      <ActiveSessionsSettings />
    </div>
  );
}
