import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { mergeSmsPlaceholders, type SmsMergeContext } from "@/lib/smsTemplateMerge";
import { Loader2 } from "lucide-react";
import type { ContactWithMeta } from "@/hooks/useContacts";
import { getContactDisplayName, getPrimaryEmail } from "@/hooks/useContacts";
import { contactCanEmail } from "@/lib/contactOutreach";

function getSendEmailUrl() {
  const base = import.meta.env.VITE_SUPABASE_URL;
  return base ? `${base}/functions/v1/send-email` : null;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: ContactWithMeta[];
  contactIds: string[];
  defaultSubject?: string;
  defaultBody?: string;
  mergeDefaults?: Pick<SmsMergeContext, "custom1" | "custom2" | "custom3" | "custom4">;
  onComplete?: () => void;
};

export function BulkEmailCampaignDialog({
  open,
  onOpenChange,
  contacts,
  contactIds,
  defaultSubject = "Property that may suit you — {{custom1}}",
  defaultBody = "Hi {{first_name}},\n\nI thought this listing might match what you're looking for:\n\n{{custom1}}\n{{custom2}}\n\nReply if you'd like more details or to inspect.\n\n{{signature}}",
  mergeDefaults,
  onComplete,
}: Props) {
  const { toast } = useToast();
  const contactsById = new Map(contacts.map((c) => [c.id, c]));
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; skipped: number; failed: number } | null>(null);

  const resetWhenClose = (next: boolean) => {
    if (!next) {
      setSubject(defaultSubject);
      setBody(defaultBody);
      setResult(null);
    }
    onOpenChange(next);
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast({ title: "Subject and body required", variant: "destructive" });
      return;
    }
    const url = getSendEmailUrl();
    if (!url) {
      toast({ title: "Email not configured", variant: "destructive" });
      return;
    }
    setSending(true);
    setResult(null);
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Sign in required", variant: "destructive" });
        return;
      }

      for (const contactId of contactIds) {
        const c = contactsById.get(contactId);
        if (!c || !contactCanEmail(c)) {
          skipped++;
          continue;
        }
        const email = getPrimaryEmail(c);
        if (!email) {
          skipped++;
          continue;
        }
        const name = getContactDisplayName(c);
        const parts = name.split(/\s+/);
        const mergeCtx: SmsMergeContext = {
          first_name: c.first_name ?? parts[0] ?? "there",
          last_name: c.last_name ?? parts.slice(1).join(" "),
          name,
          ...mergeDefaults,
        };
        const mergedSubject = mergeSmsPlaceholders(subject.trim(), mergeCtx);
        const mergedBody = mergeSmsPlaceholders(body.trim(), mergeCtx);
        const html = mergedBody.replace(/\n/g, "<br>");

        try {
          const res = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: email,
              subject: mergedSubject,
              html,
              contact_id: contactId,
              log_to_timeline: true,
            }),
          });
          if (!res.ok) {
            failed++;
            continue;
          }
          sent++;
        } catch {
          failed++;
        }
      }

      setResult({ sent, skipped, failed });
      toast({
        title: "Bulk email complete",
        description: `Sent: ${sent}. Skipped: ${skipped}. Failed: ${failed}.`,
      });
      onComplete?.();
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={resetWhenClose}>
      <DialogContent className="sm:max-w-2xl max-h-[min(92vh,900px)] overflow-y-auto bg-popover border-border">
        <DialogHeader>
          <DialogTitle>Bulk email ({contactIds.length} contacts)</DialogTitle>
          <DialogDescription>
            Uses <code className="text-xs">{"{{first_name}}"}</code>, <code className="text-xs">{"{{name}}"}</code>,{" "}
            and custom fields per recipient. DNC / missing email contacts are skipped.
          </DialogDescription>
        </DialogHeader>
        <Alert>
          <AlertTitle>Compliance</AlertTitle>
          <AlertDescription className="text-xs">
            Only email contacts who have agreed to receive property updates. Do-not-email contacts are skipped
            automatically.
          </AlertDescription>
        </Alert>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="bulk-email-subject">Subject</Label>
            <Input
              id="bulk-email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bulk-email-body">Body</Label>
            <Textarea
              id="bulk-email-body"
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        </div>
        {result ? (
          <p className="text-xs text-muted-foreground">
            Sent: <strong className="text-foreground">{result.sent}</strong> · Skipped: {result.skipped} · Failed:{" "}
            {result.failed}
          </p>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => resetWhenClose(false)} disabled={sending}>
            Close
          </Button>
          <Button onClick={() => void handleSend()} disabled={sending || contactIds.length === 0}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Send emails
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
