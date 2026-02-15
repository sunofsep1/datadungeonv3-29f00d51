import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProperties, formatPropertyAddress } from "@/hooks/useProperties";
import { useCreateContactPropertyLink } from "@/hooks/useContactPropertyLinks";
import { useToast } from "@/hooks/use-toast";
import { useMemo } from "react";

const RELATIONSHIP_TYPES = ["owner", "seller", "buyer", "tenant", "investor", "agent", "interested", "other"] as const;

interface LinkPropertyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string | null;
  onSuccess?: () => void;
  /** Already-linked property IDs for this contact (to exclude from dropdown) */
  linkedPropertyIds?: Set<string>;
}

export function LinkPropertyModal({
  open,
  onOpenChange,
  contactId,
  onSuccess,
  linkedPropertyIds: linkedIdsProp,
}: LinkPropertyModalProps) {
  const { toast } = useToast();
  const { data: allProperties = [] } = useProperties();
  const createLink = useCreateContactPropertyLink();

  const linkedPropertyIds = useMemo(() => {
    if (linkedIdsProp) return linkedIdsProp;
    return new Set<string>();
  }, [linkedIdsProp]);

  const availableProperties = useMemo(
    () => allProperties.filter((p) => !linkedPropertyIds.has(p.id)),
    [allProperties, linkedPropertyIds]
  );

  const [propertyId, setPropertyId] = useState("");
  const [role, setRole] = useState<string>("owner");
  const [notes, setNotes] = useState("");

  const handleLink = async () => {
    if (!contactId || !propertyId) {
      toast({ title: "Error", description: "Select a property.", variant: "destructive" });
      return;
    }
    try {
      await createLink.mutateAsync({
        contact_id: contactId,
        property_id: propertyId,
        role: role as (typeof RELATIONSHIP_TYPES)[number],
        notes: notes.trim() || null,
      });
      toast({ title: "Success", description: "Property linked." });
      onOpenChange(false);
      setPropertyId("");
      setRole("owner");
      setNotes("");
      onSuccess?.();
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      const msg = err?.message ?? (e instanceof Error ? e.message : "");
      const isDuplicate =
        err?.code === "23505" ||
        /duplicate|unique|already exists/i.test(String(msg));
      toast({
        title: "Error",
        description: isDuplicate
          ? "This property is already linked to this contact."
          : (e instanceof Error ? e.message : "Failed to link property"),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] bg-popover border-border">
        <DialogHeader>
          <DialogTitle>Link property to contact</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Property</Label>
            <Select
              value={propertyId}
              onValueChange={setPropertyId}
              disabled={availableProperties.length === 0}
            >
              <SelectTrigger className="w-full bg-input">
                <SelectValue
                  placeholder={
                    availableProperties.length === 0
                      ? "No properties available"
                      : "Select property..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableProperties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {formatPropertyAddress(p)}
                    {p.property_type && ` · ${p.property_type}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableProperties.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Create properties first, or they may all be linked already.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Relationship</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-full bg-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_TYPES.map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              className="bg-input min-h-[60px]"
              placeholder="e.g. Primary contact, joint owner..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleLink}
            disabled={!propertyId || createLink.isPending}
          >
            {createLink.isPending ? "Linking..." : "Link property"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
