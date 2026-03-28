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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

function getBroadcastUrl() {
  const base = import.meta.env.VITE_SUPABASE_URL;
  return base ? `${base}/functions/v1/send-sms-broadcast` : null;
}

type BulkSmsCampaignDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactIds: string[];
  onComplete?: () => void;
};

export function BulkSmsCampaignDialog({
  open,
  onOpenChange,
  contactIds,
  onComplete,
}: BulkSmsCampaignDialogProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState(
    "Hi {{first_name}}, quick note from me — reply anytime if you have questions.",
  );
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    sent?: number;
    skipped?: { contact_id: string; reason: string }[];
    failures?: { contact_id: string; error: string }[];
  } | null>(null);

  const handleSend = async () => {
    if (!message.trim()) {
      toast({ title: "Message required", variant: "destructive" });
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
        body: JSON.stringify({ contact_ids: contactIds, message: message.trim() }),
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-popover border-border">
        <DialogHeader>
          <DialogTitle>Bulk SMS ({contactIds.length} contacts)</DialogTitle>
          <DialogDescription>
            Uses Mobile Message (Australia). Messages are chunked in batches of up to 100. Merge fields:{" "}
            <code className="text-xs">{"{{first_name}}"}</code>, <code className="text-xs">{"{{name}}"}</code>.
          </DialogDescription>
        </DialogHeader>
        <Alert>
          <AlertTitle>Compliance</AlertTitle>
          <AlertDescription className="text-xs">
            Only send to contacts who have agreed to SMS. Opted-out contacts are skipped automatically. Follow the Australian
            Spam Act and your agency policies.
          </AlertDescription>
        </Alert>
        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[120px] bg-input border-border"
            placeholder="Your message…"
          />
        </div>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
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
