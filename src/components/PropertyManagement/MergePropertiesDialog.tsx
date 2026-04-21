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
import { formatPropertyAddress, type PropertyWithLinks } from "@/hooks/useProperties";
import { useMergeProperties } from "@/hooks/useMergeProperties";
import { propertiesShareSameFormattedAddress } from "@/lib/mergePropertyFields";
import { errorMessageFromUnknown } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type MergePropertiesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: PropertyWithLinks[];
  onMerged?: (primaryId: string) => void;
};

export function MergePropertiesDialog({ open, onOpenChange, properties, onMerged }: MergePropertiesDialogProps) {
  const { toast } = useToast();
  const mergeProperties = useMergeProperties();
  const [primaryId, setPrimaryId] = useState<string>("");

  useEffect(() => {
    if (!open || properties.length === 0) return;
    setPrimaryId((prev) => (prev && properties.some((p) => p.id === prev) ? prev : properties[0]!.id));
  }, [open, properties]);

  const sameAddress = useMemo(
    () => propertiesShareSameFormattedAddress(properties as import("@/hooks/useProperties").Property[]),
    [properties],
  );

  const preview = useMemo(() => {
    const primary = properties.find((p) => p.id === primaryId);
    if (!primary) return null;
    const linkCount = properties.reduce((n, p) => n + (p.contact_property_links?.length ?? 0), 0);
    const ownerNames = new Set<string>();
    for (const p of properties) {
      for (const l of p.contact_property_links ?? []) {
        const name = l.contacts?.name?.trim();
        if (name) ownerNames.add(name);
      }
    }
    return { primary, linkCount, ownerNames: [...ownerNames] };
  }, [properties, primaryId]);

  const handleMerge = async () => {
    if (!primaryId || properties.length < 2) return;
    try {
      await mergeProperties.mutateAsync({
        primaryPropertyId: primaryId,
        properties: properties as import("@/hooks/useProperties").Property[],
      });
      toast({
        title: "Properties merged",
        description: "One record now holds the combined owners, listings, tasks, and notes.",
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
            Merge properties
          </DialogTitle>
          <DialogDescription>
            Combine {properties.length} property rows into one. The record you keep stays in your list; the others are
            removed after contact links, listings, deals, tasks, and activity rows are moved across.
          </DialogDescription>
        </DialogHeader>

        {!sameAddress ? (
          <Alert variant="destructive" className="border-destructive/50">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Addresses differ</AlertTitle>
            <AlertDescription>
              Selected rows don&apos;t all format to the same address. Merge only if you&apos;re sure they are the same
              home (e.g. duplicate imports).
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Keep this property (primary)</Label>
          <RadioGroup value={primaryId} onValueChange={setPrimaryId} className="gap-0">
            <ScrollArea className="max-h-[220px] rounded-md border border-border pr-2">
              <div className="space-y-2 p-2">
                {properties.map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-start gap-3 rounded-md border border-border/80 bg-muted/20 px-3 py-2 hover:bg-muted/40"
                  >
                    <RadioGroupItem value={p.id} id={`merge-prop-primary-${p.id}`} className="mt-1" />
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="font-medium text-foreground truncate" title={formatPropertyAddress(p)}>
                        {formatPropertyAddress(p)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                        {p.property_type ? <div className="capitalize">{p.property_type}</div> : null}
                        {(p.contact_property_links?.length ?? 0) > 0 ? (
                          <div>{p.contact_property_links!.length} linked contact(s)</div>
                        ) : (
                          <div>No linked contacts</div>
                        )}
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
              <span className="text-muted-foreground">Address:</span> {formatPropertyAddress(preview.primary)}
            </p>
            <p>
              <span className="text-muted-foreground">Contact links:</span> {preview.linkCount} row
              {preview.linkCount !== 1 ? "s" : ""} consolidated (same person + property deduped)
            </p>
            {preview.ownerNames.length > 0 ? (
              <p>
                <span className="text-muted-foreground">Linked names:</span> {preview.ownerNames.slice(0, 4).join(" · ")}
                {preview.ownerNames.length > 4 ? ` (+${preview.ownerNames.length - 4} more)` : ""}
              </p>
            ) : null}
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mergeProperties.isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleMerge()} disabled={mergeProperties.isPending || properties.length < 2}>
            {mergeProperties.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Merging…
              </>
            ) : (
              "Merge into one property"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
