import { useEffect, useMemo, useRef, useState } from "react";
import { Calculator, Copy } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { calculateReiqReadyReckoner, formatAudCurrency } from "@/lib/reiqReadyReckoner";

function parseMoneyInput(raw: string): number {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export type ReiqReadyReckonerCardProps = {
  /** When set (e.g. from the contact’s listing), applied once as sale price when it arrives after mount. */
  suggestedSalePrice?: number | null;
};

export function ReiqReadyReckonerCard({ suggestedSalePrice }: ReiqReadyReckonerCardProps = {}) {
  const { toast } = useToast();
  const prefillApplied = useRef(false);
  const [salePrice, setSalePrice] = useState("1000000");
  const [commissionRatePct, setCommissionRatePct] = useState("2.2");
  const [includeGstOnCommission, setIncludeGstOnCommission] = useState(true);
  const [marketingCost, setMarketingCost] = useState("5000");
  const [legalFees, setLegalFees] = useState("1800");
  const [mortgagePayout, setMortgagePayout] = useState("0");
  const [otherCosts, setOtherCosts] = useState("0");

  const result = useMemo(
    () =>
      calculateReiqReadyReckoner({
        salePrice: parseMoneyInput(salePrice),
        commissionRatePct: parseMoneyInput(commissionRatePct),
        includeGstOnCommission,
        marketingCost: parseMoneyInput(marketingCost),
        legalFees: parseMoneyInput(legalFees),
        mortgagePayout: parseMoneyInput(mortgagePayout),
        otherCosts: parseMoneyInput(otherCosts),
      }),
    [commissionRatePct, includeGstOnCommission, legalFees, marketingCost, mortgagePayout, otherCosts, salePrice]
  );

  useEffect(() => {
    if (prefillApplied.current) return;
    if (suggestedSalePrice == null || !Number.isFinite(suggestedSalePrice) || suggestedSalePrice <= 0) return;
    setSalePrice(String(Math.round(suggestedSalePrice)));
    prefillApplied.current = true;
  }, [suggestedSalePrice]);

  const resetDefaults = () => {
    setSalePrice("1000000");
    setCommissionRatePct("2.2");
    setIncludeGstOnCommission(true);
    setMarketingCost("5000");
    setLegalFees("1800");
    setMortgagePayout("0");
    setOtherCosts("0");
    prefillApplied.current = false;
  };

  const copySummary = async () => {
    const lines = [
      "REIQ Ready Reckoner (estimate)",
      `Sale price: ${formatAudCurrency(parseMoneyInput(salePrice))}`,
      `Commission (inc GST): ${formatAudCurrency(result.commissionIncGst)}`,
      `Total costs: ${formatAudCurrency(result.totalCosts)}`,
      `Estimated net proceeds: ${formatAudCurrency(result.estimatedNetProceeds)}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast({ title: "Copied", description: "Summary copied to clipboard." });
    } catch {
      toast({ title: "Could not copy", description: "Clipboard access was blocked.", variant: "destructive" });
    }
  };

  return (
    <Card className="zoho-card border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">REIQ Ready Reckoner</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Quick estimate for sale proceeds after commission, marketing, legal and payout costs.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Sale price</Label>
          <Input value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Commission %</Label>
          <Input value={commissionRatePct} onChange={(e) => setCommissionRatePct(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Marketing</Label>
          <Input value={marketingCost} onChange={(e) => setMarketingCost(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Legal fees</Label>
          <Input value={legalFees} onChange={(e) => setLegalFees(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Mortgage payout</Label>
          <Input value={mortgagePayout} onChange={(e) => setMortgagePayout(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Other costs</Label>
          <Input value={otherCosts} onChange={(e) => setOtherCosts(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-md border border-border p-2">
        <Label htmlFor="gst-switch" className="text-xs text-muted-foreground">
          Include GST on commission
        </Label>
        <Switch id="gst-switch" checked={includeGstOnCommission} onCheckedChange={setIncludeGstOnCommission} />
      </div>

      <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Commission (inc GST)</span>
          <span>{formatAudCurrency(result.commissionIncGst)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total costs</span>
          <span>{formatAudCurrency(result.totalCosts)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold pt-1 border-t border-border">
          <span>Estimated net proceeds</span>
          <span>{formatAudCurrency(result.estimatedNetProceeds)}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" className="flex-1" onClick={resetDefaults}>
          Reset defaults
        </Button>
        <Button type="button" variant="outline" size="sm" className="flex-1 gap-1" onClick={() => void copySummary()}>
          <Copy className="h-3.5 w-3.5" />
          Copy summary
        </Button>
      </div>
    </Card>
  );
}
