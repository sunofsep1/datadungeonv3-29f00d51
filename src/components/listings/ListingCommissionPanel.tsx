import { useMemo, useState } from "react";
import { Lock, Percent, Plus, Trash2, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCommissionRate } from "@/hooks/useCommissionRate";
import { useListingOffers } from "@/hooks/useListingOffers";
import { useUpdateListing, type Listing } from "@/hooks/useListings";
import {
  useListingCommissionSplits,
  useCreateListingCommissionSplit,
  useDeleteListingCommissionSplit,
} from "@/hooks/useListingCommissionSplits";
import { listingSearchPrice } from "@/lib/listingPriceFields";
import {
  allocateCommissionSplits,
  calculateListingCommission,
  commissionSalePriceFromOffers,
  formatCommissionAud,
  isListingCommissionUnlocked,
  totalSplitPct,
} from "@/lib/listingCommission";
import { cn } from "@/lib/utils";

type Props = {
  listing: Listing;
  listingId: string;
};

export function ListingCommissionPanel({ listing, listingId }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { commissionRate: defaultRate } = useCommissionRate();
  const { data: offers = [] } = useListingOffers(listingId);
  const { data: splits = [], isLoading } = useListingCommissionSplits(listingId);
  const createSplit = useCreateListingCommissionSplit();
  const deleteSplit = useDeleteListingCommissionSplit();
  const updateListing = useUpdateListing();

  const [addOpen, setAddOpen] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [splitPct, setSplitPct] = useState("");
  const [grossPct, setGrossPct] = useState("");

  const unlocked = isListingCommissionUnlocked(offers, listing.pipeline_stage);

  const ext = listing as Listing & { commission_gross_pct?: number | null };
  const storedGrossPct = ext.commission_gross_pct;
  const activeGrossPct =
    storedGrossPct != null && storedGrossPct > 0 ? Number(storedGrossPct) : defaultRate;

  const salePrice = useMemo(
    () =>
      commissionSalePriceFromOffers(
        offers,
        listingSearchPrice(listing as Listing & { search_price?: number | null }),
      ),
    [offers, listing],
  );

  const totals = useMemo(() => {
    if (salePrice == null) return null;
    return calculateListingCommission({
      salePrice,
      grossCommissionPct: activeGrossPct,
    });
  }, [salePrice, activeGrossPct]);

  const splitAmounts = useMemo(
    () => (totals ? allocateCommissionSplits(totals, splits) : []),
    [totals, splits],
  );

  const splitTotal = totalSplitPct(splits);
  const agentLabel =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email?.split("@")[0] ??
    "Listing agent";

  const saveGrossPct = async () => {
    const n = Number(grossPct.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(n) || n <= 0 || n > 100) {
      toast({ title: "Enter a valid commission %", variant: "destructive" });
      return;
    }
    try {
      await updateListing.mutateAsync({ id: listingId, commission_gross_pct: n });
      toast({ title: "Commission % saved" });
      setGrossPct("");
    } catch (e) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const addAgentSplit = async () => {
    const pct = Number(splitPct.replace(/[^0-9.]/g, ""));
    const name = agentName.trim() || agentLabel;
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      toast({ title: "Enter a valid split %", variant: "destructive" });
      return;
    }
    try {
      await createSplit.mutateAsync({
        listing_id: listingId,
        agent_name: name,
        split_pct: pct,
        sort_order: splits.length,
      });
      toast({ title: "Split added" });
      setAddOpen(false);
      setAgentName("");
      setSplitPct("");
    } catch (e) {
      toast({
        title: "Could not add split",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  if (!unlocked) {
    return (
      <Card className="zoho-card p-4 sm:p-5 border-border border-dashed">
        <div className="flex items-start gap-3 text-muted-foreground">
          <Lock className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Commission</h3>
            <p className="text-sm mt-1">
              Splits unlock when an offer is exchanged (conditional) or the listing moves to under contract.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="zoho-card p-4 sm:p-5 border-border">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
            <Percent className="h-4 w-4 text-primary" />
            Commission
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gross {activeGrossPct}% on {formatCommissionAud(salePrice)}
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add split
        </Button>
      </div>

      {totals ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {[
            { label: "Ex GST", value: totals.grossExGst },
            { label: "GST", value: totals.gstAmount },
            { label: "Inc GST", value: totals.grossIncGst, highlight: true },
            { label: "Sale price", value: totals.salePrice },
          ].map(({ label, value, highlight }) => (
            <div
              key={label}
              className={cn(
                "rounded-lg border p-2.5",
                highlight ? "border-primary/40 bg-primary/5" : "border-border/70 bg-muted/10",
              )}
            >
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="text-sm font-semibold tabular-nums">{formatCommissionAud(value)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-4">Set a sale price via an accepted offer or search price.</p>
      )}

      <div className="flex flex-wrap items-end gap-2 mb-4 pb-4 border-b border-border/60">
        <div className="flex-1 min-w-[140px]">
          <Label className="text-xs">Agreed gross commission %</Label>
          <div className="flex gap-2 mt-1">
            <Input
              placeholder={String(activeGrossPct)}
              value={grossPct}
              onChange={(e) => setGrossPct(e.target.value)}
              className="h-9"
            />
            <Button type="button" size="sm" variant="secondary" className="h-9" onClick={() => void saveGrossPct()}>
              Save
            </Button>
          </div>
        </div>
        {splitTotal > 0 && (
          <p
            className={cn(
              "text-xs tabular-nums",
              splitTotal > 100.01 ? "text-destructive" : "text-muted-foreground",
            )}
          >
            Splits total {splitTotal.toFixed(1)}%
          </p>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading splits…</p>
      ) : splitAmounts.length === 0 ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Users className="h-4 w-4" />
          No agent splits yet. Add listing agent and conjunctional splits.
        </p>
      ) : (
        <ul className="space-y-2">
          {splitAmounts.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/10 p-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{row.agent_name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {row.split_pct}% · {formatCommissionAud(row.amountIncGst)} inc GST
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive shrink-0"
                onClick={() => void deleteSplit.mutateAsync({ id: row.id, listingId })}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add commission split</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Agent name</Label>
              <Input
                className="mt-1"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder={agentLabel}
              />
            </div>
            <div>
              <Label>Split %</Label>
              <Input
                className="mt-1"
                value={splitPct}
                onChange={(e) => setSplitPct(e.target.value)}
                placeholder="50"
              />
            </div>
            <Button type="button" className="w-full" onClick={() => void addAgentSplit()} disabled={createSplit.isPending}>
              Add split
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
