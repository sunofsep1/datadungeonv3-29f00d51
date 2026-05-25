import { useEffect, useMemo, useState } from "react";
import { Building2, Landmark, Scale, UserCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateListing } from "@/hooks/useListings";
import {
  AUTHORITY_TYPE_OPTIONS,
  FOR_SALE_OR_LEASE_OPTIONS,
  GST_STATUS_OPTIONS,
  OUTGOING_FIELD_GROUPS,
  OUTGOINGS_PERIOD_OPTIONS,
  SALE_METHOD_OPTIONS,
  computeTotalOutgoingsPerYear,
  formatListingMoney,
  parseListingMoneyInput,
  parsePercentInput,
  type ListingGeneralFields,
  type OutgoingsPeriod,
} from "@/lib/listingGeneral";

type Props = {
  listing: ListingGeneralFields;
  onUpdated?: () => void;
};

function moneyStr(v: number | null | undefined): string {
  return v != null && Number.isFinite(Number(v)) ? String(v) : "";
}

export function ListingGeneralPanel({ listing, onUpdated }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const updateListing = useUpdateListing();

  const [forSaleOrLease, setForSaleOrLease] = useState("for_sale");
  const [saleMethod, setSaleMethod] = useState<string>("");
  const [authorityType, setAuthorityType] = useState<string>("");
  const [gstStatus, setGstStatus] = useState<string>("");
  const [listedAsAuction, setListedAsAuction] = useState(false);
  const [offMarket, setOffMarket] = useState(false);
  const [hiddenListing, setHiddenListing] = useState(false);
  const [investmentFlag, setInvestmentFlag] = useState(false);
  const [tenanted, setTenanted] = useState(false);
  const [quotePrice, setQuotePrice] = useState("");
  const [leasePotential, setLeasePotential] = useState("");
  const [returnPct, setReturnPct] = useState("");
  const [accessDetails, setAccessDetails] = useState("");
  const [internalInfo, setInternalInfo] = useState("");
  const [legalDescription, setLegalDescription] = useState("");
  const [legalLot, setLegalLot] = useState("");
  const [legalVolume, setLegalVolume] = useState("");
  const [legalBlock, setLegalBlock] = useState("");
  const [legalDp, setLegalDp] = useState("");
  const [legalFolio, setLegalFolio] = useState("");
  const [legalSection, setLegalSection] = useState("");
  const [legalZoning, setLegalZoning] = useState("");
  const [outgoings, setOutgoings] = useState<Record<string, { amount: string; period: OutgoingsPeriod }>>({});

  useEffect(() => {
    setForSaleOrLease(listing.for_sale_or_lease?.trim() || "for_sale");
    setSaleMethod(listing.sale_method?.trim() ?? "");
    setAuthorityType(listing.authority_type?.trim() ?? "");
    setGstStatus(listing.gst_status?.trim() ?? "");
    setListedAsAuction(Boolean(listing.listed_as_auction));
    setOffMarket(Boolean(listing.off_market));
    setHiddenListing(Boolean(listing.hidden_listing));
    setInvestmentFlag(Boolean(listing.investment_flag));
    setTenanted(Boolean(listing.tenanted));
    setQuotePrice(moneyStr(listing.quote_price));
    setLeasePotential(moneyStr(listing.lease_potential_weekly));
    setReturnPct(listing.return_pct != null ? String(listing.return_pct) : "");
    setAccessDetails(listing.access_details?.trim() ?? "");
    setInternalInfo(listing.internal_info?.trim() ?? "");
    setLegalDescription(listing.legal_description?.trim() ?? "");
    setLegalLot(listing.legal_lot?.trim() ?? "");
    setLegalVolume(listing.legal_volume?.trim() ?? "");
    setLegalBlock(listing.legal_block?.trim() ?? "");
    setLegalDp(listing.legal_deposited_plan?.trim() ?? "");
    setLegalFolio(listing.legal_folio?.trim() ?? "");
    setLegalSection(listing.legal_section?.trim() ?? "");
    setLegalZoning(listing.legal_zoning?.trim() ?? "");

    const next: Record<string, { amount: string; period: OutgoingsPeriod }> = {};
    for (const { amountKey, periodKey } of OUTGOING_FIELD_GROUPS) {
      const amount = listing[amountKey] as number | null | undefined;
      const period = (listing[periodKey] as string | null | undefined) === "pq" ? "pq" : "pa";
      next[amountKey] = { amount: moneyStr(amount), period };
    }
    setOutgoings(next);
  }, [listing]);

  const totalOutgoingsPa = useMemo(() => {
    const draft: ListingGeneralFields = { ...listing, id: listing.id };
    for (const { amountKey, periodKey } of OUTGOING_FIELD_GROUPS) {
      const row = outgoings[amountKey];
      (draft as Record<string, unknown>)[amountKey] = parseListingMoneyInput(row?.amount ?? "");
      (draft as Record<string, unknown>)[periodKey] = row?.period ?? "pa";
    }
    return computeTotalOutgoingsPerYear(draft);
  }, [listing, outgoings]);

  const save = async (patch: Record<string, unknown>) => {
    try {
      await updateListing.mutateAsync({ id: listing.id, ...patch });
      onUpdated?.();
    } catch (err) {
      toast({
        title: "Could not save",
        description: err instanceof Error ? err.message : "Update failed. Run npm run db:push if columns are missing.",
        variant: "destructive",
      });
    }
  };

  const saveOutgoing = (amountKey: string, periodKey: string) => {
    const row = outgoings[amountKey];
    if (!row) return;
    const nextAmount = parseListingMoneyInput(row.amount);
    const nextPeriod = row.period;
    const curAmount = listing[amountKey as keyof ListingGeneralFields] as number | null | undefined;
    const curPeriod = (listing[periodKey as keyof ListingGeneralFields] as string | null) ?? "pa";
    if (nextAmount === (curAmount ?? null) && nextPeriod === curPeriod) return;
    void save({ [amountKey]: nextAmount, [periodKey]: nextPeriod });
  };

  const pending = updateListing.isPending;

  return (
    <div className="space-y-4">
      <Card className="zoho-card p-5 border-border">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">General</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Authority, sale method, and listing flags (Reapit General tab).
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-border/70 bg-muted/20 p-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
              Negotiator
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {listing.negotiator_id
                ? listing.negotiator_id === user?.id
                  ? "Assigned to you"
                  : "Assigned (another user)"
                : "Not assigned"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              disabled={pending || !user?.id || listing.negotiator_id === user.id}
              onClick={() => void save({ negotiator_id: user!.id })}
            >
              Assign to me
            </Button>
            {listing.negotiator_id ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                disabled={pending}
                onClick={() => void save({ negotiator_id: null })}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">For sale / lease</Label>
            <Select
              value={forSaleOrLease}
              onValueChange={(v) => {
                setForSaleOrLease(v);
                void save({ for_sale_or_lease: v });
              }}
              disabled={pending}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FOR_SALE_OR_LEASE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Sale method</Label>
            <Select
              value={saleMethod || "_none"}
              onValueChange={(v) => {
                const next = v === "_none" ? null : v;
                setSaleMethod(next ?? "");
                void save({ sale_method: next });
              }}
              disabled={pending}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">—</SelectItem>
                {SALE_METHOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Authority</Label>
            <Select
              value={authorityType || "_none"}
              onValueChange={(v) => {
                const next = v === "_none" ? null : v;
                setAuthorityType(next ?? "");
                void save({ authority_type: next });
              }}
              disabled={pending}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">—</SelectItem>
                {AUTHORITY_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Quote price</Label>
            <Input
              inputMode="numeric"
              placeholder="Optional vendor quote"
              value={quotePrice}
              onChange={(e) => setQuotePrice(e.target.value)}
              onBlur={() => {
                const next = parseListingMoneyInput(quotePrice);
                if (next === (listing.quote_price ?? null)) return;
                void save({ quote_price: next });
              }}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">GST status</Label>
            <Select
              value={gstStatus || "_none"}
              onValueChange={(v) => {
                const next = v === "_none" ? null : v;
                setGstStatus(next ?? "");
                void save({ gst_status: next });
              }}
              disabled={pending}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">—</SelectItem>
                {GST_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-border/60">
          {[
            { id: "auction", label: "Listed as auction", checked: listedAsAuction, key: "listed_as_auction" },
            { id: "off-market", label: "Off market", checked: offMarket, key: "off_market" },
            { id: "hidden", label: "Hidden listing", checked: hiddenListing, key: "hidden_listing" },
          ].map(({ id, label, checked, key }) => (
            <label key={id} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={checked}
                onCheckedChange={(v) => {
                  const next = Boolean(v);
                  if (key === "listed_as_auction") setListedAsAuction(next);
                  if (key === "off_market") setOffMarket(next);
                  if (key === "hidden_listing") setHiddenListing(next);
                  void save({ [key]: next });
                }}
                disabled={pending}
              />
              {label}
            </label>
          ))}
        </div>
      </Card>

      <Card className="zoho-card p-5 border-border">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Outgoings</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Per quarter or per year — total shown as annual.</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total (p.a.)</p>
            <p className="text-lg font-semibold tabular-nums">{formatListingMoney(totalOutgoingsPa)}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {OUTGOING_FIELD_GROUPS.map(({ amountKey, periodKey, label }) => {
            const row = outgoings[amountKey] ?? { amount: "", period: "pa" as OutgoingsPeriod };
            return (
              <div key={amountKey} className="space-y-1.5">
                <Label className="text-xs">{label}</Label>
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    inputMode="numeric"
                    placeholder="0"
                    value={row.amount}
                    onChange={(e) =>
                      setOutgoings((prev) => ({
                        ...prev,
                        [amountKey]: { ...row, amount: e.target.value },
                      }))
                    }
                    onBlur={() => saveOutgoing(amountKey, periodKey)}
                    disabled={pending}
                  />
                  <Select
                    value={row.period}
                    onValueChange={(v) => {
                      const period = v as OutgoingsPeriod;
                      setOutgoings((prev) => ({
                        ...prev,
                        [amountKey]: { ...row, period },
                      }));
                      void save({
                        [periodKey]: period,
                        [amountKey]: parseListingMoneyInput(row.amount),
                      });
                    }}
                    disabled={pending}
                  >
                    <SelectTrigger className="w-[110px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OUTGOINGS_PERIOD_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="zoho-card p-5 border-border">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Landmark className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Investment</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Lease potential and return for investor buyers.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-6 mb-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={investmentFlag}
              onCheckedChange={(v) => {
                const next = Boolean(v);
                setInvestmentFlag(next);
                void save({ investment_flag: next });
              }}
              disabled={pending}
            />
            Investment property
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={tenanted}
              onCheckedChange={(v) => {
                const next = Boolean(v);
                setTenanted(next);
                void save({ tenanted: next });
              }}
              disabled={pending}
            />
            Tenanted
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Lease potential ($/week)</Label>
            <Input
              inputMode="numeric"
              placeholder="e.g. 850"
              value={leasePotential}
              onChange={(e) => setLeasePotential(e.target.value)}
              onBlur={() => {
                const next = parseListingMoneyInput(leasePotential);
                if (next === (listing.lease_potential_weekly ?? null)) return;
                void save({ lease_potential_weekly: next });
              }}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Return %</Label>
            <Input
              inputMode="decimal"
              placeholder="e.g. 4.5"
              value={returnPct}
              onChange={(e) => setReturnPct(e.target.value)}
              onBlur={() => {
                const next = parsePercentInput(returnPct);
                if (next === (listing.return_pct ?? null)) return;
                void save({ return_pct: next });
              }}
              disabled={pending}
            />
          </div>
        </div>
      </Card>

      <Card className="zoho-card p-5 border-border">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Scale className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Legal</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Title and zoning for contracts and portal feeds.</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Legal description</Label>
            <Textarea
              rows={2}
              className="resize-none text-sm"
              value={legalDescription}
              onChange={(e) => setLegalDescription(e.target.value)}
              onBlur={() => {
                const next = legalDescription.trim() || null;
                if (next === (listing.legal_description?.trim() || null)) return;
                void save({ legal_description: next });
              }}
              disabled={pending}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { label: "Lot", value: legalLot, set: setLegalLot, key: "legal_lot" },
              { label: "Volume", value: legalVolume, set: setLegalVolume, key: "legal_volume" },
              { label: "Block", value: legalBlock, set: setLegalBlock, key: "legal_block" },
              { label: "Deposited plan (DP)", value: legalDp, set: setLegalDp, key: "legal_deposited_plan" },
              { label: "Folio", value: legalFolio, set: setLegalFolio, key: "legal_folio" },
              { label: "Section", value: legalSection, set: setLegalSection, key: "legal_section" },
              { label: "Zoning", value: legalZoning, set: setLegalZoning, key: "legal_zoning" },
            ].map(({ label, value, set, key }) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <Input
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  onBlur={() => {
                    const next = value.trim() || null;
                    const cur = (listing[key as keyof ListingGeneralFields] as string | null)?.trim() || null;
                    if (next === cur) return;
                    void save({ [key]: next });
                  }}
                  disabled={pending}
                />
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="zoho-card p-5 border-border">
        <h3 className="text-sm font-semibold mb-3">Access & internal</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Access details</Label>
            <Textarea
              rows={3}
              className="resize-none text-sm"
              placeholder="Key safe, alarm code, appointment-only…"
              value={accessDetails}
              onChange={(e) => setAccessDetails(e.target.value)}
              onBlur={() => {
                const next = accessDetails.trim() || null;
                if (next === (listing.access_details?.trim() || null)) return;
                void save({ access_details: next });
              }}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Internal info (private)</Label>
            <Textarea
              rows={3}
              className="resize-none text-sm"
              placeholder="Not shown on portals…"
              value={internalInfo}
              onChange={(e) => setInternalInfo(e.target.value)}
              onBlur={() => {
                const next = internalInfo.trim() || null;
                if (next === (listing.internal_info?.trim() || null)) return;
                void save({ internal_info: next });
              }}
              disabled={pending}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
