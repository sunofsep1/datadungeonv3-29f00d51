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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || res.statusText || "Failed to send");
      }
      toast({ title: "Success", description: "SMS sent!" });
      setBody("");
      onOpenChange(false);
      onSent?.();
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to send SMS. Ensure TWILIO_* secrets are set and the number is E.164 (e.g. +61412345678).",
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
