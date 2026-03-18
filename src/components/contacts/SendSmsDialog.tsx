import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

function getSendSmsUrl() {
  const base = import.meta.env.VITE_SUPABASE_URL;
  return base ? `${base}/functions/v1/send-sms` : null;
}

interface SendSmsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  to: string;
  contactName?: string;
  onSent?: () => void;
}

export function SendSmsDialog({
  open,
  onOpenChange,
  to,
  contactName,
  onSent,
}: SendSmsDialogProps) {
  const { toast } = useToast();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!body.trim()) {
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
        body: JSON.stringify({ to: to.trim().replace(/\s/g, ""), body: body.trim() }),
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
      setBody("");
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
    if (!next) setBody("");
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px] bg-popover border-border" aria-describedby="send-sms-desc">
        <DialogHeader>
          <DialogTitle>Send SMS</DialogTitle>
          <DialogDescription id="send-sms-desc">
            Send a text message to this contact. Number should include country code (e.g. +61 for Australia).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>To</Label>
            <Input className="bg-input" value={to} disabled readOnly placeholder="+61412345678" />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              className="bg-input min-h-[120px]"
              placeholder="Your message..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={1600}
            />
            <p className="text-xs text-muted-foreground">{body.length} / 1600</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? "Sending..." : "Send SMS"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
