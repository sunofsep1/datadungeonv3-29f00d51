import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  getContactDisplayName,
  formatContactAddress,
  type ContactWithMeta,
} from "@/hooks/useContacts";
import { useUserCommunicationSettings } from "@/hooks/useUserCommunicationSettings";
import { mergeSmsPlaceholders, SMS_CUSTOM_FIELD_HINTS, type SmsMergeContext } from "@/lib/smsTemplateMerge";
import {
  DEFAULT_MATCH_BUYERS_LETTER_BODY,
  saveMatchBuyersLettersPrintPayload,
  type MatchBuyersLetterRecipient,
} from "@/lib/matchBuyersLetterPrint";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingAddress: string;
  contactIds: string[];
  contactsById: Map<string, ContactWithMeta>;
  mergeDefaults: Pick<SmsMergeContext, "custom1" | "custom2" | "custom3" | "custom4">;
};

export function MatchBuyersLettersDialog({
  open,
  onOpenChange,
  listingAddress,
  contactIds,
  contactsById,
  mergeDefaults,
}: Props) {
  const navigate = useNavigate();
  const { data: commSettings } = useUserCommunicationSettings();
  const [body, setBody] = useState(DEFAULT_MATCH_BUYERS_LETTER_BODY);

  useEffect(() => {
    if (open) setBody(DEFAULT_MATCH_BUYERS_LETTER_BODY);
  }, [open]);

  const signature = commSettings?.sms_signature?.trim() ?? "";

  const recipients = useMemo((): MatchBuyersLetterRecipient[] => {
    const rows: MatchBuyersLetterRecipient[] = [];
    for (const contactId of contactIds) {
      const c = contactsById.get(contactId);
      if (!c) continue;
      const name = getContactDisplayName(c);
      const parts = name.split(/\s+/);
      const mergeCtx: SmsMergeContext = {
        first_name: c.first_name ?? parts[0] ?? "there",
        last_name: c.last_name ?? parts.slice(1).join(" "),
        name,
        signature,
        ...mergeDefaults,
      };
      rows.push({
        contactId,
        name,
        mailingAddress: formatContactAddress(c),
        mergedBody: mergeSmsPlaceholders(body.trim(), mergeCtx),
      });
    }
    return rows;
  }, [body, contactIds, contactsById, mergeDefaults, signature]);

  const handlePrint = () => {
    if (!body.trim()) return;
    if (recipients.length === 0) return;
    saveMatchBuyersLettersPrintPayload({
      listingAddress,
      letterBodyTemplate: body.trim(),
      mergeDefaults,
      recipients,
    });
    onOpenChange(false);
    navigate("/listings/match-buyers/letters/print");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Bulk letters — match buyers
          </DialogTitle>
          <DialogDescription>
            {recipients.length} letter{recipients.length === 1 ? "" : "s"} for {listingAddress}. Use merge fields;
            each contact gets their own name and address on the envelope block.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Letter body</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} className="resize-none text-sm font-mono" />
            <p className="text-[10px] text-muted-foreground">
              {"{{first_name}}"}, {"{{name}}"}, {"{{signature}}"},{" "}
              {SMS_CUSTOM_FIELD_HINTS.map((h) => `{{${h.key}}}`).join(", ")}
            </p>
          </div>

          {!signature && body.includes("{{signature}}") ? (
            <Alert>
              <AlertDescription className="text-xs">
                Add an SMS signature in Settings → Communications so {"{{signature}}"} merges on letters.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="rounded-md border border-border/60 bg-muted/30 p-3 max-h-32 overflow-y-auto">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Preview (first)</p>
            {recipients[0] ? (
              <pre className="text-xs whitespace-pre-wrap font-sans">{recipients[0].mergedBody}</pre>
            ) : (
              <p className="text-xs text-muted-foreground">No recipients selected.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handlePrint} disabled={recipients.length === 0 || !body.trim()}>
            Open print preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
