import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserCommunicationSettings } from "@/hooks/useUserCommunicationSettings";
import { useMessageTemplates, type MessageTemplate } from "@/hooks/useMessageTemplates";
import { applyTemplateMerge, renderBrandedEmailHtml, findUnfilledPlaceholders } from "@/lib/emailBrand";

function getSendEmailUrl() {
  const base = import.meta.env.VITE_SUPABASE_URL;
  return base ? `${base}/functions/v1/send-email` : null;
}

interface EmailComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  to: string;
  /** When set, a sent email is logged on the contact timeline (interactions). */
  contactId?: string;
  contactName?: string;
  firstName?: string | null;
  onSent?: () => void;
}

export function EmailComposeDialog({
  open,
  onOpenChange,
  to,
  contactId,
  contactName,
  firstName,
  onSent,
}: EmailComposeDialogProps) {
  const { toast } = useToast();
  const { data: commSettings } = useUserCommunicationSettings();
  const { data: templates = [] } = useMessageTemplates("email");
  const [templateId, setTemplateId] = useState<string>("");
  const [eyebrow, setEyebrow] = useState("");
  const [heading, setHeading] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const mergeCtx = useMemo(
    () => ({
      first_name: firstName ?? (contactName ?? "").split(/\s+/)[0] ?? "",
      name: contactName ?? "",
    }),
    [firstName, contactName],
  );

  const unfilled = useMemo(() => findUnfilledPlaceholders(`${subject}\n${body}`), [subject, body]);

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setEyebrow(applyTemplateMerge(t.email_eyebrow ?? "", mergeCtx));
    setHeading(applyTemplateMerge(t.email_heading ?? "", mergeCtx));
    setSubject(applyTemplateMerge(t.email_subject ?? "", mergeCtx));
    setBody(applyTemplateMerge(t.email_body ?? "", mergeCtx));
  };

  const reset = () => {
    setTemplateId("");
    setEyebrow("");
    setHeading("");
    setSubject("");
    setBody("");
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      toast({ title: "Error", description: "Please enter a subject", variant: "destructive" });
      return;
    }
    if (!body.trim()) {
      toast({ title: "Error", description: "Please write a message", variant: "destructive" });
      return;
    }
    const url = getSendEmailUrl();
    if (!url) {
      toast({ title: "Error", description: "Email service not configured", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Error", description: "Please sign in to send email", variant: "destructive" });
        setSending(false);
        return;
      }
      const fromName = commSettings?.email_from_name?.trim() || "Greg Leigh";
      const html = renderBrandedEmailHtml({ eyebrow, heading, bodyText: body });
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to,
          subject: subject.trim(),
          html,
          from_name: fromName,
          ...(contactId ? { contact_id: contactId, log_to_timeline: true } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || res.statusText || "Failed to send");
      }
      toast({ title: "Sent", description: "Email sent — on brand and logged to the timeline." });
      reset();
      onOpenChange(false);
      onSent?.();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to send email";
      const isNetworkError = message === "Failed to fetch" || message.toLowerCase().includes("network");
      toast({
        title: "Error",
        description: isNetworkError
          ? "Could not reach the email service. Check VITE_SUPABASE_URL and that RESEND_API_KEY is set in Edge Function secrets."
          : message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-popover border-border" aria-describedby="email-compose-desc">
        <DialogHeader>
          <DialogTitle>Send Email</DialogTitle>
          <DialogDescription id="email-compose-desc">
            Pick a branded template or write your own. It sends in your Queensland Sotheby's design and logs to the
            contact. Replies come back to your inbox.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={templateId} onValueChange={applyTemplate}>
              <SelectTrigger className="bg-input">
                <SelectValue placeholder="Start from a template (optional)" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t: MessageTemplate) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>To</Label>
            <Input className="bg-input" value={to} disabled readOnly />
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              className="bg-input"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              className="bg-input min-h-[200px]"
              placeholder="Write your message..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          {unfilled.length > 0 && (
            <p className="text-xs text-amber-500">
              Fill in before sending: {unfilled.join(", ")}
            </p>
          )}
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
