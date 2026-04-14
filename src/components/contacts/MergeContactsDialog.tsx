import { useMemo, useState, useEffect } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, GitMerge, TriangleAlert } from "lucide-react";
import type { ContactWithMeta } from "@/hooks/useContacts";
import { getContactDisplayName, getPrimaryEmail, getPrimaryPhone, getLinkedPropertyAddress } from "@/hooks/useContacts";
import { useMergeContacts, contactsShareSameDisplayName } from "@/hooks/useMergeContacts";
import { formatPhoneDisplay } from "@/lib/formatPhone";
import { errorMessageFromUnknown } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type MergeContactsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: ContactWithMeta[];
  onMerged?: (primaryId: string) => void;
};

export function MergeContactsDialog({ open, onOpenChange, contacts, onMerged }: MergeContactsDialogProps) {
  const { toast } = useToast();
  const mergeContacts = useMergeContacts();
  const [primaryId, setPrimaryId] = useState<string>("");

  useEffect(() => {
    if (!open || contacts.length === 0) return;
    setPrimaryId((prev) => (prev && contacts.some((c) => c.id === prev) ? prev : contacts[0]!.id));
  }, [open, contacts]);

  const sameName = useMemo(() => contactsShareSameDisplayName(contacts as Parameters<typeof contactsShareSameDisplayName>[0]), [contacts]);

  const preview = useMemo(() => {
    const primary = contacts.find((c) => c.id === primaryId);
    if (!primary) return null;
    const others = contacts.filter((c) => c.id !== primaryId);
    const emails = new Set<string>();
    const phones = new Set<string>();
    for (const c of contacts) {
      const e = getPrimaryEmail(c);
      if (e) emails.add(e);
      const p = getPrimaryPhone(c);
      if (p) phones.add(formatPhoneDisplay(p));
    }
    return {
      primary,
      others,
      emails: [...emails],
      phones: [...phones],
      propertyLines: contacts.map((c) => getLinkedPropertyAddress(c)).filter(Boolean),
    };
  }, [contacts, primaryId]);

  const handleMerge = async () => {
    if (!primaryId || contacts.length < 2) return;
    try {
      await mergeContacts.mutateAsync({
        primaryContactId: primaryId,
        contacts: contacts as import("@/hooks/useContacts").Contact[],
      });
      toast({
        title: "Contacts merged",
        description: "One card now holds the combined details, properties, and history.",
      });
      onOpenChange(false);
      onMerged?.(primaryId);
    } catch (e) {
      toast({
        title: "Merge failed",
        description: errorMessageFromUnknown(e),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-popover border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-primary" />
            Merge contacts
          </DialogTitle>
          <DialogDescription>
            Combine {contacts.length} records into one card. The contact you keep stays in your list; the others are
            removed after their tasks, properties, and history are moved across.
          </DialogDescription>
        </DialogHeader>

        {!sameName ? (
          <Alert variant="destructive" className="border-destructive/50">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Names differ</AlertTitle>
            <AlertDescription>
              Selected cards don&apos;t all share the same display name. Merge anyway only if you&apos;re sure they
              are the same person.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Keep this contact (primary)</Label>
          <RadioGroup value={primaryId} onValueChange={setPrimaryId} className="gap-0">
            <ScrollArea className="max-h-[220px] rounded-md border border-border pr-2">
              <div className="space-y-2 p-2">
                {contacts.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-start gap-3 rounded-md border border-border/80 bg-muted/20 px-3 py-2 hover:bg-muted/40"
                  >
                    <RadioGroupItem value={c.id} id={`merge-primary-${c.id}`} className="mt-1" />
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="font-medium text-foreground">{getContactDisplayName(c)}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                        {getPrimaryPhone(c) ? <div>Phone {formatPhoneDisplay(getPrimaryPhone(c)!)}</div> : null}
                        {getPrimaryEmail(c) ? <div>{getPrimaryEmail(c)}</div> : null}
                        {getLinkedPropertyAddress(c) ? (
                          <div className="truncate" title={getLinkedPropertyAddress(c)}>
                            {getLinkedPropertyAddress(c)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </RadioGroup>
        </div>

        {preview ? (
          <div className="rounded-md border border-border bg-muted/15 px-3 py-2 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground text-sm">After merge</p>
            <p>
              <span className="text-muted-foreground">Name:</span> {getContactDisplayName(preview.primary)}
            </p>
            {preview.emails.length > 0 ? (
              <p>
                <span className="text-muted-foreground">Email:</span> {preview.emails[0]}
                {preview.emails.length > 1 ? ` (+${preview.emails.length - 1} more in notes)` : ""}
              </p>
            ) : null}
            {preview.phones.length > 0 ? (
              <p>
                <span className="text-muted-foreground">Numbers:</span> {preview.phones.slice(0, 2).join(" · ")}
                {preview.phones.length > 2 ? ` (+${preview.phones.length - 2} in notes)` : ""}
              </p>
            ) : null}
            {preview.propertyLines.length > 0 ? (
              <p>
                <span className="text-muted-foreground">Properties:</span> all linked homes stay on this card (
                {preview.propertyLines.length})
              </p>
            ) : null}
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mergeContacts.isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleMerge()} disabled={mergeContacts.isPending || contacts.length < 2}>
            {mergeContacts.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Merging…
              </>
            ) : (
              "Merge into one contact"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
