import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

function getSendEmailUrl() {
  const base = import.meta.env.VITE_SUPABASE_URL;
  return base ? `${base}/functions/v1/send-email` : null;
}

interface EmailComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  to: string;
  contactName?: string;
  onSent?: () => void;
}

export function EmailComposeDialog({
  open,
  onOpenChange,
  to,
  contactName,
  onSent,
}: EmailComposeDialogProps) {
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim()) {
      toast({ title: "Error", description: "Please enter a subject", variant: "destructive" });
      return;
    }
    const url = getSendEmailUrl();
    if (!url) {
      toast({ title: "Error", description: "Email service not configured", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Error", description: "Please sign in to send email", variant: "destructive" });
        return;
      }
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to,
          subject: subject.trim(),
          html: body.trim().replace(/\n/g, "<br>") || "<p></p>",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || res.statusText || "Failed to send");
      }
      toast({ title: "Success", description: "Email sent!" });
      setSubject("");
      setBody("");
      onOpenChange(false);
      onSent?.();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to send email";
      const isNetworkError = message === "Failed to fetch" || message.toLowerCase().includes("network");
      toast({
        title: "Error",
        description: isNetworkError
          ? "Could not reach the email service. Check that VITE_SUPABASE_URL in .env matches your Supabase project and that RESEND_API_KEY is set in Edge Function secrets."
          : message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSubject("");
      setBody("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-popover border-border">
        <DialogHeader>
          <DialogTitle>Send Email</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>To</Label>
            <Input className="bg-input" value={to} disabled readOnly />
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              className="bg-input"
              placeholder={contactName ? `Re: ${contactName}` : "Subject"}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              className="bg-input min-h-[160px]"
              placeholder="Write your message..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
