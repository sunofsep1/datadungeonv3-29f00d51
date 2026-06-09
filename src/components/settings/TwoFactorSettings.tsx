import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MFA_KEY = ["auth", "mfa-factors"] as const;

export function TwoFactorSettings() {
  const queryClient = useQueryClient();
  const [enrolling, setEnrolling] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: factors, isLoading, refetch } = useQuery({
    queryKey: MFA_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data;
    },
  });

  const { data: aal } = useQuery({
    queryKey: ["auth", "mfa-aal"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) throw error;
      return data;
    },
  });

  const verifiedFactor = factors?.totp?.find((f) => f.status === "verified");
  const isEnabled = Boolean(verifiedFactor);

  const startEnroll = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator app",
      });
      if (error) throw error;
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setEnrolling(true);
      setVerifyCode("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start 2FA setup");
    } finally {
      setBusy(false);
    }
  };

  const confirmEnroll = async () => {
    if (!factorId || verifyCode.length !== 6) {
      toast.error("Enter the 6-digit code from your app");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: verifyCode });
      if (error) throw error;
      toast.success("Two-factor authentication enabled");
      setEnrolling(false);
      setFactorId(null);
      setQrCode(null);
      setSecret(null);
      setVerifyCode("");
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["auth", "mfa-aal"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid code — try again");
    } finally {
      setBusy(false);
    }
  };

  const disable2fa = async () => {
    if (!verifiedFactor) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactor.id });
      if (error) throw error;
      toast.success("Two-factor authentication removed");
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["auth", "mfa-aal"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not disable 2FA");
    } finally {
      setBusy(false);
    }
  };

  const cancelEnroll = () => {
    setEnrolling(false);
    setFactorId(null);
    setQrCode(null);
    setSecret(null);
    setVerifyCode("");
  };

  return (
    <Card id="two-factor" className="zoho-card p-6 border-border space-y-4 scroll-mt-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Two-factor authentication</h3>
          </div>
          <p className="text-xs text-muted-foreground max-w-lg">
            Add a TOTP code from Google Authenticator, 1Password, or similar. Required at sign-in once enabled.
          </p>
        </div>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Badge
            variant="outline"
            className={
              isEnabled
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "text-muted-foreground"
            }
          >
            {isEnabled ? "Enabled" : "Off"}
          </Badge>
        )}
      </div>

      {aal?.currentLevel === "aal2" ? (
        <p className="text-xs text-muted-foreground">This session is verified with 2FA (AAL2).</p>
      ) : null}

      {!enrolling && !isEnabled ? (
        <Button type="button" variant="outline" size="sm" onClick={() => void startEnroll()} disabled={busy || isLoading}>
          Set up authenticator app
        </Button>
      ) : null}

      {enrolling ? (
        <div className="space-y-4 rounded-lg border border-border/70 bg-muted/10 p-4">
          <p className="text-sm text-foreground">Scan this QR code with your authenticator app, then enter the 6-digit code.</p>
          {qrCode ? (
            <img src={qrCode} alt="TOTP QR code" className="h-40 w-40 rounded-md border border-border bg-white p-2" />
          ) : null}
          {secret ? (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Manual entry key</Label>
              <code className="block break-all rounded bg-muted px-2 py-1 text-xs">{secret}</code>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>Verification code</Label>
            <InputOTP maxLength={6} value={verifyCode} onChange={setVerifyCode}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => void confirmEnroll()} disabled={busy || verifyCode.length !== 6}>
              {busy ? "Verifying…" : "Enable 2FA"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={cancelEnroll} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {isEnabled && !enrolling ? (
        <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => void disable2fa()} disabled={busy}>
          Remove authenticator
        </Button>
      ) : null}
    </Card>
  );
}
