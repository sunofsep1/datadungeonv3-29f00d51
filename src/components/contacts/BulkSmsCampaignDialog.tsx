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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserCommunicationSettings } from "@/hooks/useUserCommunicationSettings";
import { isSignatureUnfilled } from "@/lib/smsTemplateMerge";
import { Loader2 } from "lucide-react";
import {
  SmsProspectingComposer,
  defaultSmsComposerCustomFields,
  type SmsComposerCustomFields,
} from "@/components/contacts/SmsProspectingComposer";

function getBroadcastUrl() {
  const base = import.meta.env.VITE_SUPABASE_URL;
  return base ? `${base}/functions/v1/send-sms-broadcast` : null;
}

type BulkSmsCampaignDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactIds: string[];
  initialCustom?: SmsComposerCustomFields;
  onComplete?: () => void;
};

/** Sample name for preview only — each contact gets their own first name when sending. */
const BULK_PREVIEW_MERGE = {
  first_name: "Alex",
  last_name: "",
  name: "Alex",
};

export function BulkSmsCampaignDialog({
  open,
  onOpenChange,
  contactIds,
  initialCustom,
  onComplete,
}: BulkSmsCampaignDialogProps) {
  const { toast } = useToast();
  const { data: commSettings } = useUserCommunicationSettings();
  const smsSignature = commSettings?.sms_signature ?? "";
  const [body, setBody] = useState("");
  const [custom, setCustom] = useState<SmsComposerCustomFields>(() => defaultSmsComposerCustomFields());
  const [includeOptOutIfMissing, setIncludeOptOutIfMissing] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    sent?: number;
    skipped?: { contact_id: string; reason: string }[];
    failures?: { contact_id: string; error: string }[];
  } | null>(null);

  const resetWhenClose = (next: boolean) => {
    if (!next) {
      setBody("");
      setCustom(initialCustom ?? defaultSmsComposerCustomFields());
      setIncludeOptOutIfMissing(true);
      setResult(null);
    } else {
      setCustom(initialCustom ?? defaultSmsComposerCustomFields());
    }
    onOpenChange(next);
  };

  const handleSend = async () => {
    if (!body.trim()) {
      toast({ title: "Message required", variant: "destructive" });
      return;
    }
    if (isSignatureUnfilled(body, smsSignature)) {
      toast({
        title: "SMS signature missing",
        description: "Add your name and agency under Settings → SMS signature, then try again.",
        variant: "destructive",
      });
      return;
    }
    const url = getBroadcastUrl();
    if (!url) {
      toast({ title: "SMS not configured", description: "Missing VITE_SUPABASE_URL", variant: "destructive" });
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Sign in required", variant: "destructive" });
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
          contact_ids: contactIds,
          message: body.trim(),
          merge_fields: {
            custom1: custom.custom1,
            custom2: custom.custom2,
            custom3: custom.custom3,
            custom4: custom.custom4,
          },
          append_opt_out_if_missing: includeOptOutIfMissing,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || res.statusText || "Broadcast failed");
      }
      setResult({
        sent: data.sent,
        skipped: data.skipped,
        failures: data.failures,
      });
      toast({
        title: "Bulk SMS queued",
        description: `Sent: ${data.sent ?? 0}. Skipped: ${data.skipped?.length ?? 0}.`,
      });
      onComplete?.();
    } catch (e) {
      toast({
        title: "Bulk SMS failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={resetWhenClose}>
      <DialogContent className="sm:max-w-2xl max-h-[min(92vh,900px)] overflow-y-auto bg-popover border-border">
        <DialogHeader>
          <DialogTitle>Bulk SMS ({contactIds.length} contacts)</DialogTitle>
          <DialogDescription>
            Templates use{" "}
            <code className="text-xs">{"{{first_name}}"}</code>, <code className="text-xs">{"{{name}}"}</code>,{" "}
            <code className="text-xs">{"{{last_name}}"}</code> per contact. Custom fields below apply to everyone in this
            send. Preview uses the name &quot;Alex&quot; as an example.
          </DialogDescription>
        </DialogHeader>
        <Alert>
          <AlertTitle>Compliance</AlertTitle>
          <AlertDescription className="text-xs">
            Only send to contacts who have agreed to SMS. Opted-out contacts are skipped automatically. Turn on &quot;Add
            opt-out if missing&quot; for commercial content (Spam Act AU).
          </AlertDescription>
        </Alert>
        <SmsProspectingComposer
          body={body}
          onBodyChange={setBody}
          custom={custom}
          onCustomChange={setCustom}
          includeOptOutIfMissing={includeOptOutIfMissing}
          onIncludeOptOutIfMissingChange={setIncludeOptOutIfMissing}
          mergePreviewContext={{
            first_name: BULK_PREVIEW_MERGE.first_name,
            last_name: BULK_PREVIEW_MERGE.last_name,
            name: BULK_PREVIEW_MERGE.name,
            signature: smsSignature,
            ...custom,
          }}
        />
        {result && (
          <div className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto border border-border rounded-md p-2">
            <p>
              Sent: <strong className="text-foreground">{result.sent ?? 0}</strong>
            </p>
            {(result.failures?.length ?? 0) > 0 && (
              <p className="text-destructive">Failures: {result.failures?.length}</p>
            )}
            {(result.skipped?.length ?? 0) > 0 && (
              <p>Skipped (opt-out / no phone): {result.skipped?.length}</p>
            )}
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => resetWhenClose(false)} disabled={sending}>
            Close
          </Button>
          <Button onClick={() => void handleSend()} disabled={sending || contactIds.length === 0}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
