import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useContacts } from "@/hooks/useContacts";
import { useCreateContact } from "@/hooks/useContacts";
import { useCreateContactPropertyLink } from "@/hooks/useContactPropertyLinks";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  findContactByOwnerName,
  normalizeOwnerName,
  splitFirstLastName,
  splitOwnerNames,
} from "@/lib/ownerNameParse";
import { PRICE_FINDER_PROSPECT_CONTACT_CATEGORY } from "@/lib/pricefinderProspectContact";

export type OwnerReviewRow = {
  name: string;
  phone: string | null;
  selected: boolean;
  alreadyLinked: boolean;
  existingContactId: string | null;
  existingContactName: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyAddress?: string | null;
  ownerNames?: string | null;
  ownerPhones?: string[] | null;
  linkedContactIds?: string[];
  linkedContactNames?: string[];
  onComplete?: () => void;
};

function buildInitialRows(
  ownerNames: string | null | undefined,
  ownerPhones: string[] | null | undefined,
  linkedContactNames: string[],
  contacts: Array<{ id: string; name?: string | null }>,
): OwnerReviewRow[] {
  const linked = new Set(linkedContactNames.map(normalizeOwnerName));
  return splitOwnerNames(ownerNames).map((name, index) => {
    const alreadyLinked = linked.has(normalizeOwnerName(name));
    const existing = findContactByOwnerName(name, contacts);
    return {
      name,
      phone: ownerPhones?.[index] ?? ownerPhones?.[0] ?? null,
      selected: !alreadyLinked,
      alreadyLinked,
      existingContactId: existing?.id ?? null,
      existingContactName: existing?.name ?? null,
    };
  });
}

export function OwnerReviewDialog({
  open,
  onOpenChange,
  propertyId,
  propertyAddress,
  ownerNames,
  ownerPhones,
  linkedContactIds = [],
  linkedContactNames = [],
  onComplete,
}: Props) {
  const { toast } = useToast();
  const { data: contacts = [] } = useContacts();
  const createContact = useCreateContact();
  const createLink = useCreateContactPropertyLink();
  const [rows, setRows] = useState<OwnerReviewRow[]>([]);
  const [working, setWorking] = useState(false);

  const allNames = useMemo(() => splitOwnerNames(ownerNames), [ownerNames]);

  useEffect(() => {
    if (!open) return;
    setRows(buildInitialRows(ownerNames, ownerPhones, linkedContactNames, contacts));
  }, [open, ownerNames, ownerPhones, linkedContactNames, contacts]);

  const toggleRow = (index: number, selected: boolean) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index && !row.alreadyLinked ? { ...row, selected } : row)),
    );
  };

  const handleCreateSelected = async () => {
    const selected = rows.filter((r) => r.selected && !r.alreadyLinked);
    if (selected.length === 0) {
      onOpenChange(false);
      return;
    }

    setWorking(true);
    let created = 0;
    let linked = 0;
    const linkedIds = new Set(linkedContactIds);

    try {
      for (const row of selected) {
        let contactId = row.existingContactId;

        if (!contactId) {
          const { first_name, last_name } = splitFirstLastName(row.name);
          const contact = await createContact.mutateAsync({
            name: row.name,
            first_name,
            last_name,
            mobile: row.phone,
            phone: row.phone,
            source: "pricefinder_prospect",
            contact_category: PRICE_FINDER_PROSPECT_CONTACT_CATEGORY,
            category: PRICE_FINDER_PROSPECT_CONTACT_CATEGORY,
          });
          contactId = contact.id;
          created += 1;
        }

        if (linkedIds.has(contactId)) continue;

        await createLink.mutateAsync({
          contact_id: contactId,
          property_id: propertyId,
          role: "owner",
        });
        linkedIds.add(contactId);
        linked += 1;
      }

      const parts: string[] = [];
      if (created > 0) parts.push(`Created ${created} contact${created === 1 ? "" : "s"}`);
      if (linked > 0) parts.push(`linked ${linked} as owner${linked === 1 ? "" : "s"}`);
      toast({
        title: "Owners linked",
        description:
          parts.join(", ") + (propertyAddress ? ` · ${propertyAddress}` : "") || "Done",
      });
      onComplete?.();
      onOpenChange(false);
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Could not create or link owners",
        variant: "destructive",
      });
    } finally {
      setWorking(false);
    }
  };

  if (!open || allNames.length === 0) return null;

  const pendingCount = rows.filter((r) => r.selected && !r.alreadyLinked).length;
  const linkedCount = rows.filter((r) => r.alreadyLinked).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review owners from report</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {allNames.length > 1
            ? `This report lists ${allNames.length} owners. Select who to create or link as contacts on this property.`
            : "Confirm the owner to create or link as a contact on this property."}
        </p>
        <ul className="max-h-64 space-y-3 overflow-y-auto pr-1">
          {rows.map((row, index) => (
            <li
              key={`${row.name}-${index}`}
              className="flex items-start gap-3 rounded-md border border-border/60 p-3"
            >
              <Checkbox
                id={`owner-row-${index}`}
                checked={row.selected}
                disabled={row.alreadyLinked}
                onCheckedChange={(v) => toggleRow(index, v === true)}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <Label
                  htmlFor={`owner-row-${index}`}
                  className={cn(
                    "cursor-pointer font-medium leading-tight",
                    row.alreadyLinked && "text-muted-foreground",
                  )}
                >
                  {row.name}
                </Label>
                {row.phone ? (
                  <p className="text-xs text-muted-foreground tabular-nums">{row.phone}</p>
                ) : null}
                {(() => {
                  const { first_name, last_name } = splitFirstLastName(row.name);
                  return (
                    <p className="text-xs text-muted-foreground">
                      First: {first_name || "—"} · Last: {last_name || "—"}
                    </p>
                  );
                })()}
                {row.alreadyLinked ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Already linked to this property</p>
                ) : row.existingContactName ? (
                  <p className="text-xs text-primary">Will link existing: {row.existingContactName}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">New contact will be created</p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch">
          <Button
            type="button"
            disabled={working || pendingCount === 0}
            onClick={() => void handleCreateSelected()}
          >
            {working ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Working…
              </>
            ) : pendingCount > 0 ? (
              `Create & link selected (${pendingCount})`
            ) : linkedCount > 0 ? (
              "All owners already linked"
            ) : (
              "Create selected"
            )}
          </Button>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {pendingCount === 0 ? "Close" : "Skip"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated Use OwnerReviewDialog */
export const OwnerSuggestionDialog = OwnerReviewDialog;
