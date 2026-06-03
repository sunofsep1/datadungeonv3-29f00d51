import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUpdateListing } from "@/hooks/useListings";

type Props = {
  listingId: string;
  keyDateListed?: string | null;
  keyDateAgencyExpiry?: string | null;
  keyDateSettlement?: string | null;
  onUpdated?: () => void;
};

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso?.trim()) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return format(d, "yyyy-MM-dd");
  } catch {
    return "";
  }
}

function fromDateInputValue(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  return `${v}T00:00:00.000Z`;
}

export function ListingKeyDatesPanel({
  listingId,
  keyDateListed,
  keyDateAgencyExpiry,
  keyDateSettlement,
  onUpdated,
}: Props) {
  const { toast } = useToast();
  const updateListing = useUpdateListing();
  const [listed, setListed] = useState("");
  const [expiry, setExpiry] = useState("");
  const [settlement, setSettlement] = useState("");

  useEffect(() => {
    setListed(toDateInputValue(keyDateListed));
    setExpiry(toDateInputValue(keyDateAgencyExpiry));
    setSettlement(toDateInputValue(keyDateSettlement));
  }, [keyDateListed, keyDateAgencyExpiry, keyDateSettlement]);

  const save = async (patch: {
    key_date_listed?: string | null;
    key_date_agency_expiry?: string | null;
    key_date_settlement?: string | null;
  }) => {
    try {
      await updateListing.mutateAsync({ id: listingId, ...patch });
      onUpdated?.();
    } catch (err) {
      toast({
        title: "Could not save date",
        description: err instanceof Error ? err.message : "Update failed",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="zoho-card p-4 border-border">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5" />
        Key dates
      </h3>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="key-date-listed" className="text-xs">
            On market / listed
          </Label>
          <Input
            id="key-date-listed"
            type="date"
            className="h-8 text-xs"
            value={listed}
            onChange={(e) => setListed(e.target.value)}
            onBlur={() => {
              const next = fromDateInputValue(listed);
              const cur = keyDateListed?.trim() || null;
              if (next === cur) return;
              void save({ key_date_listed: next });
            }}
            disabled={updateListing.isPending}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="key-date-expiry" className="text-xs">
            Agency expiry
          </Label>
          <Input
            id="key-date-expiry"
            type="date"
            className="h-8 text-xs"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            onBlur={() => {
              const next = fromDateInputValue(expiry);
              const cur = keyDateAgencyExpiry?.trim() || null;
              if (next === cur) return;
              void save({ key_date_agency_expiry: next });
            }}
            disabled={updateListing.isPending}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="key-date-settlement" className="text-xs">
            Settlement
          </Label>
          <Input
            id="key-date-settlement"
            type="date"
            className="h-8 text-xs"
            value={settlement}
            onChange={(e) => setSettlement(e.target.value)}
            onBlur={() => {
              const next = fromDateInputValue(settlement);
              const cur = keyDateSettlement?.trim() || null;
              if (next === cur) return;
              void save({ key_date_settlement: next });
            }}
            disabled={updateListing.isPending}
          />
        </div>
      </div>
    </Card>
  );
}
