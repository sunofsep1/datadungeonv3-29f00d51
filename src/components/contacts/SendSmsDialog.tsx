import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserCommunicationSettings } from "@/hooks/useUserCommunicationSettings";
import { isSignatureUnfilled } from "@/lib/smsTemplateMerge";
import {
  SmsProspectingComposer,
  buildFinalSmsBody,
  defaultSmsComposerCustomFields,
  type SmsComposerCustomFields,
} from "@/components/contacts/SmsProspectingComposer";

function getSendSmsUrl() {
  const base = import.meta.env.VITE_SUPABASE_URL;
  return base ? `${base}/functions/v1/send-sms` : null;
}

interface SendSmsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  to: string;
  /** Used for opt-out enforcement and logging */
  contactId?: string | null;
  contactName?: string;
  firstName?: string | null;
  lastName?: string | null;
  onSent?: () => void;
}

export function SendSmsDialog({
  open,
  onOpenChange,
  to,
  contactId,
  contactName,
  firstName,
  lastName,
  onSent,
}: SendSmsDialogProps) {
  const { toast } = useToast();
  const { data: commSettings } = useUserCommunicationSettings();
  const smsSignature = commSettings?.sms_signature ?? "";
  const [body, setBody] = useState("");
  const [custom, setCustom] = useState<SmsComposerCustomFields>(() => defaultSmsComposerCustomFields());
  const [includeOptOutIfMissing, setIncludeOptOutIfMissing] = useState(true);
  const [sending, setSending] = useState(false);

  const resetComposition = useCallback(() => {
    setBody("");
    setCustom(defaultSmsComposerCustomFields());
    setIncludeOptOutIfMissing(true);
  }, []);

  const handleSend = async () => {
    if (isSignatureUnfilled(body, smsSignature)) {
      toast({
        title: "SMS signature missing",
        description: "Add your name and agency under Settings → SMS signature, then try again.",
        variant: "destructive",
      });
      return;
    }
    const merged = buildFinalSmsBody(
      body,
      {
        first_name: firstName,
        last_name: lastName,
        name: contactName,
        signature: smsSignature,
        custom1: custom.custom1,
        custom2: custom.custom2,
        custom3: custom.custom3,
        custom4: custom.custom4,
      },
      includeOptOutIfMissing,
    );
    if (!merged.trim()) {
      toast({ title: "Error", description: "Please enter a message", variant: "destructive" });
      return;
    }
    if (!to.trim()) {
      toast({ title: "Error", description: "No phone number for this contact", variant: "destructive" });
      return;
    }
    const url = getSendSmsUrl();
    if (!url) {
      toast({ title: "Error", description: "SMS service not configured", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Error", description: "Please sign in to send SMS", variant: "destructive" });
        setSending(false);
        return;
      }
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: to.trim().replace(/\s/g, ""),
          body: merged,
          ...(contactId ? { contact_id: contactId } : {}),
        }),
      });
      const text = await res.text();
      let data: { error?: string; message?: string; error_message?: string } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: text?.slice(0, 200) || res.statusText };
      }
      const serverError =
        data?.error ??
        data?.message ??
        data?.error_message ??
        (text?.trim() ? (text.length > 120 ? `${text.slice(0, 120)}…` : text) : null);

      if (!res.ok) {
        const msg =
          serverError ||
          (res.status === 401
            ? "Session expired or invalid. Sign out and sign back in, then try again."
            : res.statusText) ||
          `Server returned ${res.status}. Check Supabase Dashboard → Edge Functions → send-sms → Logs.`;
        throw new Error(msg);
      }
      toast({ title: "Success", description: "SMS sent!" });
      resetComposition();
      onOpenChange(false);
      onSent?.();
    } catch (e) {
      const isNetworkError =
        e instanceof TypeError && (e.message === "Failed to fetch" || e.message === "Load failed");
      const description =
        e instanceof Error
          ? e.message
          : "SMS failed. Set Edge Function secrets (Mobile Message or Twilio) in Supabase Dashboard → send-sms → Secrets.";
      toast({
        title: "Error",
        description: isNetworkError
          ? "Could not reach the server. Check VITE_SUPABASE_URL in .env and that the send-sms function is deployed."
          : description,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetComposition();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[min(92vh,900px)] overflow-y-auto bg-popover border-border"
        aria-describedby="send-sms-desc"
      >
        <DialogHeader>
          <DialogTitle>Send SMS</DialogTitle>
          <DialogDescription id="send-sms-desc">
            Pick a prospecting template or write your own. Names merge from this contact; use custom fields for address,
            suburb, and listing details. Include country code (e.g. +61).
          </DialogDescription>
        </DialogHeader>
        <Alert className="border-amber-500/40 bg-amber-500/10">
          <AlertTitle className="text-sm">Compliance</AlertTitle>
          <AlertDescription className="text-xs">
            Send only with consent. Opted-out contacts are blocked server-side. Commercial messages need identification and
            a working opt-out (e.g. Reply STOP). Follow the Spam Act (AU) and your brokerage rules.
          </AlertDescription>
        </Alert>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>To</Label>
            <Input className="bg-input" value={to} disabled readOnly placeholder="+61412345678" />
          </div>
          <SmsProspectingComposer
            body={body}
            onBodyChange={setBody}
            custom={custom}
            onCustomChange={setCustom}
            includeOptOutIfMissing={includeOptOutIfMissing}
            onIncludeOptOutIfMissingChange={setIncludeOptOutIfMissing}
            mergePreviewContext={{
              first_name: firstName,
              last_name: lastName,
              name: contactName,
              signature: smsSignature,
              ...custom,
            }}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60 mt-2">
            {contactId ? (
              <Button variant="link" className="h-auto p-0 text-sm" asChild>
                <Link to={`/contacts/${contactId}`}>Open contact profile</Link>
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-3 ml-auto">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={sending}>
                {sending ? "Sending..." : "Send SMS"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
