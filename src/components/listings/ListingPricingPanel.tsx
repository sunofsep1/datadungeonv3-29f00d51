import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  buildBracketRows,
  pickSuggestedBracketLow,
  type PricingBundle,
  useAddCompetitorListing,
  useCreatePricingAnalysisWithBrackets,
  useDeleteCompetitorListing,
  usePricingAnalysis,
  useRebuildPriceBrackets,
  useUpdatePriceBracket,
  useUpdatePricingAnalysisFields,
} from "@/hooks/usePricingAnalysis";
import { useUpdateListing } from "@/hooks/useListings";
import type { Database } from "@/integrations/supabase/types";
import { BarChart3, Loader2, Trash2 } from "lucide-react";

type BracketRow = Database["public"]["Tables"]["price_brackets"]["Row"];

function formatAud(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

function BracketSupplyDemandInner({ listingId, bracket }: { listingId: string; bracket: BracketRow }) {
  const updateBracket = useUpdatePriceBracket();
  const [supply, setSupply] = useState(String(bracket.active_supply ?? 0));
  const [demand, setDemand] = useState(String(bracket.recent_demand ?? 0));

  const commit = () => {
    const s = Math.max(0, Math.floor(Number(supply) || 0));
    const d = Math.max(0, Math.floor(Number(demand) || 0));
    if (s === bracket.active_supply && d === bracket.recent_demand) return;
    void updateBracket.mutateAsync({
      listingId,
      id: bracket.id,
      active_supply: s,
      recent_demand: d,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        className="h-8 w-[72px] text-xs tabular-nums"
        inputMode="numeric"
        value={supply}
        onChange={(e) => setSupply(e.target.value)}
        onBlur={commit}
      />
      <span className="text-muted-foreground text-xs">/</span>
      <Input
        className="h-8 w-[72px] text-xs tabular-nums"
        inputMode="numeric"
        value={demand}
        onChange={(e) => setDemand(e.target.value)}
        onBlur={commit}
      />
      <span className="text-xs text-muted-foreground tabular-nums">
        score {bracket.opportunity_score != null ? Number(bracket.opportunity_score).toFixed(2) : "—"}
      </span>
    </div>
  );
}

function BracketSupplyDemandCell({ listingId, bracket }: { listingId: string; bracket: BracketRow }) {
  return (
    <BracketSupplyDemandInner
      key={`${bracket.id}-${bracket.active_supply}-${bracket.recent_demand}`}
      listingId={listingId}
      bracket={bracket}
    />
  );
}

function RebuildBracketsFields({
  bundle,
  listingId,
}: {
  bundle: PricingBundle;
  listingId: string;
}) {
  const [reTamLow, setReTamLow] = useState(String(bundle.tam_low));
  const [reTamHigh, setReTamHigh] = useState(String(bundle.tam_high));
  const [reBracketSize, setReBracketSize] = useState(String(bundle.bracket_size));
  const rebuild = useRebuildPriceBrackets();
  const { toast } = useToast();

  const handleRebuild = async () => {
    const low = Number(reTamLow);
    const high = Number(reTamHigh);
    const step = Number(reBracketSize);
    if (!Number.isFinite(low) || !Number.isFinite(high) || !Number.isFinite(step)) {
      toast({ title: "Check numbers", variant: "destructive" });
      return;
    }
    const preview = buildBracketRows(low, high, step);
    if (
      !window.confirm(
        `Replace all ${bundle.price_brackets.length} bracket row(s) with ${preview.length} new row(s)? Supply/demand counts will reset.`
      )
    ) {
      return;
    }
    try {
      await rebuild.mutateAsync({
        listingId,
        analysisId: bundle.id,
        tamLow: low,
        tamHigh: high,
        bracketSize: step,
      });
      toast({ title: "Brackets rebuilt" });
    } catch (e) {
      toast({
        title: "Rebuild failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="rounded-lg border border-border/80 p-4 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rebuild brackets</p>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label>TAM low</Label>
          <Input inputMode="decimal" value={reTamLow} onChange={(e) => setReTamLow(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>TAM high</Label>
          <Input inputMode="decimal" value={reTamHigh} onChange={(e) => setReTamHigh(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Bracket size</Label>
          <Input inputMode="numeric" value={reBracketSize} onChange={(e) => setReBracketSize(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button type="button" variant="outline" size="sm" disabled={rebuild.isPending} onClick={() => void handleRebuild()}>
            {rebuild.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rebuild"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ListingPricingPanelProps {
  listingId: string;
  listingPrice: number | null;
  onListingUpdated?: () => void;
}

export function ListingPricingPanel({ listingId, listingPrice, onListingUpdated }: ListingPricingPanelProps) {
  const { data: bundle, isLoading } = usePricingAnalysis(listingId);
  const createBundle = useCreatePricingAnalysisWithBrackets();
  const updateAnalysis = useUpdatePricingAnalysisFields();
  const addCompetitor = useAddCompetitorListing();
  const deleteCompetitor = useDeleteCompetitorListing();
  const updateListing = useUpdateListing();
  const { toast } = useToast();

  const [tamLow, setTamLow] = useState("");
  const [tamHigh, setTamHigh] = useState("");
  const [bracketSize, setBracketSize] = useState("25000");
  const [setupNotes, setSetupNotes] = useState("");

  const [compAddress, setCompAddress] = useState("");
  const [compPrice, setCompPrice] = useState("");
  const [compDom, setCompDom] = useState("");
  const [compCondition, setCompCondition] = useState<string>("");
  const [compNotes, setCompNotes] = useState("");

  const suggested =
    bundle?.price_brackets?.length ? pickSuggestedBracketLow(bundle.price_brackets) : null;

  const handleCreate = async () => {
    const low = Number(tamLow);
    const high = Number(tamHigh);
    const step = Number(bracketSize);
    if (!Number.isFinite(low) || !Number.isFinite(high) || !Number.isFinite(step)) {
      toast({ title: "Check numbers", description: "Enter valid TAM low, high, and bracket size.", variant: "destructive" });
      return;
    }
    try {
      await createBundle.mutateAsync({
        listingId,
        tamLow: low,
        tamHigh: high,
        bracketSize: step,
        listingPriceEstimate: listingPrice,
        notes: setupNotes.trim() || null,
      });
      toast({ title: "Pricing model created", description: "Brackets generated — add supply and demand per band." });
      setTamLow("");
      setTamHigh("");
      setSetupNotes("");
    } catch (e) {
      toast({
        title: "Could not create",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const handleApplySuggestion = async () => {
    if (!bundle || suggested == null) {
      toast({ title: "No suggestion", description: "Enter supply/demand so scores can rank brackets.", variant: "destructive" });
      return;
    }
    try {
      await updateAnalysis.mutateAsync({
        listingId,
        id: bundle.id,
        patch: { recommended_price: suggested },
      });
      await updateListing.mutateAsync({ id: listingId, price: suggested });
      toast({
        title: "Guide price updated",
        description: `Set to ${formatAud(suggested)} (top opportunity bracket low).`,
      });
      onListingUpdated?.();
    } catch (e) {
      toast({
        title: "Could not update listing",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const handleAddCompetitor = async () => {
    if (!bundle || !compAddress.trim()) {
      toast({ title: "Address required", variant: "destructive" });
      return;
    }
    const price = compPrice.trim() === "" ? null : Number(compPrice);
    const dom = compDom.trim() === "" ? null : Math.floor(Number(compDom));
    if (compPrice.trim() !== "" && !Number.isFinite(price as number)) {
      toast({ title: "Invalid price", variant: "destructive" });
      return;
    }
    try {
      await addCompetitor.mutateAsync({
        listingId,
        analysisId: bundle.id,
        address: compAddress,
        listPrice: price,
        dom: dom != null && Number.isFinite(dom) ? dom : null,
        condition:
          compCondition === "better" || compCondition === "same" || compCondition === "worse"
            ? compCondition
            : null,
        notes: compNotes.trim() || null,
      });
      setCompAddress("");
      setCompPrice("");
      setCompDom("");
      setCompCondition("");
      setCompNotes("");
      toast({ title: "Competitor added" });
    } catch (e) {
      toast({
        title: "Could not add",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="zoho-card p-6 border-border mb-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BarChart3 className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-foreground/90">Pricing intelligence</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            TAM brackets, supply vs demand, and competitors. Suggested guide uses the strongest opportunity
            bracket (demand ÷ supply; pure demand if no supply).
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading pricing model…
        </div>
      ) : !bundle ? (
        <div className="space-y-4 rounded-lg border border-border/80 bg-muted/20 p-4">
          <p className="text-sm text-muted-foreground">
            No pricing model yet. Set your total addressable market (TAM) range — we&apos;ll create{" "}
            {bracketSize ? `~${Math.max(1, Math.ceil((Number(tamHigh || 1) - Number(tamLow || 0)) / Number(bracketSize || 1)))}` : ""}{" "}
            price bands (preview updates when fields are valid).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="tam-low">TAM low</Label>
              <Input id="tam-low" inputMode="decimal" value={tamLow} onChange={(e) => setTamLow(e.target.value)} placeholder="450000" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tam-high">TAM high</Label>
              <Input id="tam-high" inputMode="decimal" value={tamHigh} onChange={(e) => setTamHigh(e.target.value)} placeholder="550000" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bracket-step">Bracket size</Label>
              <Input
                id="bracket-step"
                inputMode="numeric"
                value={bracketSize}
                onChange={(e) => setBracketSize(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="setup-notes">Notes (optional)</Label>
            <Textarea
              id="setup-notes"
              rows={2}
              value={setupNotes}
              onChange={(e) => setSetupNotes(e.target.value)}
              placeholder="Strategy, buyer pool, auction vs private…"
            />
          </div>
          <Button type="button" disabled={createBundle.isPending} onClick={() => void handleCreate()}>
            {createBundle.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create brackets
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Suggested guide (bracket low)</p>
              <p className="text-lg font-semibold tabular-nums">{formatAud(suggested)}</p>
              {bundle.recommended_price != null && (
                <p className="text-xs text-muted-foreground">Saved recommendation: {formatAud(Number(bundle.recommended_price))}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => void handleApplySuggestion()}>
                Apply suggestion to listing guide
              </Button>
            </div>
          </div>

          <RebuildBracketsFields key={bundle.id} bundle={bundle} listingId={listingId} />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="pb-2 pr-3">Bracket</th>
                  <th className="pb-2">Supply / demand</th>
                </tr>
              </thead>
              <tbody>
                {bundle.price_brackets.map((b) => (
                  <tr key={b.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 tabular-nums whitespace-nowrap">
                      {formatAud(Number(b.bracket_low))} – {formatAud(Number(b.bracket_high))}
                    </td>
                    <td className="py-2">
                      <BracketSupplyDemandCell listingId={listingId} bracket={b} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Competition</p>
            {bundle.competitor_listings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No competitors logged.</p>
            ) : (
              <ul className="space-y-2">
                {bundle.competitor_listings.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-md border border-border/60 px-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-sm">{c.address}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.list_price != null ? formatAud(Number(c.list_price)) : "—"}
                        {c.days_on_market != null ? ` · ${c.days_on_market} DOM` : ""}
                        {c.condition_vs_ours ? ` · vs us: ${c.condition_vs_ours}` : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label="Remove competitor"
                      disabled={deleteCompetitor.isPending}
                      onClick={() =>
                        void deleteCompetitor.mutateAsync({ listingId, id: c.id }).then(() => toast({ title: "Removed" }))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 items-end">
              <div className="sm:col-span-2 space-y-1">
                <Label>Address</Label>
                <Input value={compAddress} onChange={(e) => setCompAddress(e.target.value)} placeholder="12 Example St" />
              </div>
              <div className="space-y-1">
                <Label>List price</Label>
                <Input inputMode="decimal" value={compPrice} onChange={(e) => setCompPrice(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>DOM</Label>
                <Input inputMode="numeric" value={compDom} onChange={(e) => setCompDom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Condition</Label>
                <Select value={compCondition || "__none__"} onValueChange={(v) => setCompCondition(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    <SelectItem value="better">Better</SelectItem>
                    <SelectItem value="same">Same</SelectItem>
                    <SelectItem value="worse">Worse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" size="sm" disabled={addCompetitor.isPending} onClick={() => void handleAddCompetitor()}>
                Add
              </Button>
            </div>
            <Textarea
              rows={2}
              className="text-sm"
              value={compNotes}
              onChange={(e) => setCompNotes(e.target.value)}
              placeholder="Optional competitor notes"
            />
          </div>

          <div className="space-y-1">
            <Label>Analysis notes</Label>
            <Textarea
              key={`an-${bundle.id}-${bundle.notes ?? ""}`}
              rows={2}
              className="text-sm"
              defaultValue={bundle.notes ?? ""}
              onBlur={(e) => {
                const v = e.target.value.trim() || null;
                if (v !== (bundle.notes ?? null)) {
                  void updateAnalysis.mutateAsync({ listingId, id: bundle.id, patch: { notes: v } });
                }
              }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
