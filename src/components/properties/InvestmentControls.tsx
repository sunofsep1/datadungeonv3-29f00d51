import { useState } from "react";
import { Home, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUpdateProperty } from "@/hooks/useProperties";
import { useToast } from "@/hooks/use-toast";

export type OwnershipType = "owner_occupier" | "investment" | "unknown";

const OPTIONS: { value: OwnershipType; label: string; hint: string }[] = [
  { value: "owner_occupier", label: "Owner-occupier", hint: "Owner lives here" },
  { value: "investment", label: "Investment", hint: "Absentee owner / landlord" },
  { value: "unknown", label: "Unknown", hint: "Not classified yet" },
];

/** Violet "Investment" flag + click-to-set ownership. Self-contained; reuses useUpdateProperty. */
export function InvestmentControls({
  propertyId,
  ownershipType,
}: {
  propertyId: string;
  ownershipType?: string | null;
}) {
  const value = (ownershipType as OwnershipType) || "unknown";
  const update = useUpdateProperty();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const set = (v: OwnershipType) => {
    setOpen(false);
    if (v === value) return;
    update.mutate(
      { id: propertyId, ownership_type: v } as never,
      {
        onSuccess: () =>
          toast({
            title:
              v === "investment"
                ? "Flagged as investment property"
                : v === "owner_occupier"
                  ? "Marked owner-occupier"
                  : "Ownership cleared",
          }),
        onError: (e: unknown) =>
          toast({ title: "Couldn't update", description: e instanceof Error ? e.message : "", variant: "destructive" }),
      },
    );
  };

  const trigger =
    value === "investment" ? (
      <Badge className="cursor-pointer gap-1 border border-violet-500/40 bg-violet-500/15 text-xs text-violet-300 hover:bg-violet-500/25">
        <Building2 className="h-3 w-3" /> Investment
      </Badge>
    ) : value === "owner_occupier" ? (
      <Badge variant="outline" className="cursor-pointer gap-1 text-xs">
        <Home className="h-3 w-3" /> Owner-occupier
      </Badge>
    ) : (
      <Badge variant="outline" className="cursor-pointer text-xs text-muted-foreground">
        Set ownership
      </Badge>
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Set property ownership">
          {trigger}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        <p className="px-2 py-1.5 text-xs text-muted-foreground">Ownership</p>
        {OPTIONS.map((o) => (
          <Button
            key={o.value}
            variant="ghost"
            size="sm"
            className={`w-full justify-start gap-2 ${o.value === value ? "bg-accent/50" : ""}`}
            onClick={() => set(o.value)}
            disabled={update.isPending}
          >
            {o.value === "investment" ? (
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-violet-400" />
            ) : o.value === "owner_occupier" ? (
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-muted-foreground" />
            ) : (
              <span className="inline-block h-2.5 w-2.5 rounded-full border border-border" />
            )}
            <span className="flex-1 text-left">
              {o.label}
              <span className="block text-[10px] text-muted-foreground">{o.hint}</span>
            </span>
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/** Read-only violet badge for lists/cards. Renders nothing unless the property is an investment. */
export function InvestmentBadge({ ownershipType }: { ownershipType?: string | null }) {
  if (ownershipType !== "investment") return null;
  return (
    <Badge className="gap-1 border border-violet-500/40 bg-violet-500/15 text-[10px] text-violet-300">
      <Building2 className="h-3 w-3" /> Investment
    </Badge>
  );
}
