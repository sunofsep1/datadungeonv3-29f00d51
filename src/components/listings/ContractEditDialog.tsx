import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useContacts, getContactDisplayName } from "@/hooks/useContacts";
import { useUpdateListingOffer, type ListingOffer } from "@/hooks/useListingOffers";
import {
  useOfferConditions,
  useSeedOfferConditions,
  useUpdateOfferCondition,
  useCreateOfferCondition,
} from "@/hooks/useOfferConditions";
import {
  buildDefaultConditions,
  computeDepositAmount,
  computeGrossCommission,
  conditionStatusClass,
  conditionStatusLabel,
  effectiveConditionStatus,
} from "@/lib/offerConditions";
import { formatOfferPrice } from "@/lib/listingOffers";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: ListingOffer | null;
  listingId: string;
  commissionPct?: number;
};

export function ContractEditDialog({ open, onOpenChange, offer, listingId, commissionPct = 2.5 }: Props) {
  const { toast } = useToast();
  const { data: contacts = [] } = useContacts();
  const updateOffer = useUpdateListingOffer();
  const { data: conditions = [] } = useOfferConditions(offer?.id);
  const seedConditions = useSeedOfferConditions();
  const updateCondition = useUpdateOfferCondition();
  const createCondition = useCreateOfferCondition();

  const [newConditionLabel, setNewConditionLabel] = useState("");
  const [newConditionDue, setNewConditionDue] = useState("");

  const [exchangeDate, setExchangeDate] = useState("");
  const [expUnconditional, setExpUnconditional] = useState("");
  const [expSettlement, setExpSettlement] = useState("");
  const [displayPrice, setDisplayPrice] = useState("");
  const [portalStatus, setPortalStatus] = useState<"available" | "under_contract" | "sold">("under_contract");
  const [vendorSolicitorId, setVendorSolicitorId] = useState("");
  const [depositType, setDepositType] = useState<"percentage" | "flat">("flat");
  const [depositAmount, setDepositAmount] = useState("");
  const [commissionType, setCommissionType] = useState<"percentage" | "custom">("percentage");
  const [balanceTrust, setBalanceTrust] = useState("");
  const [balanceIbd, setBalanceIbd] = useState("");
  const [ibdName, setIbdName] = useState("");
  const [ibdNumber, setIbdNumber] = useState("");
  const [ibdBsb, setIbdBsb] = useState("");
  const [ibdBank, setIbdBank] = useState("");
  const [ibdBranch, setIbdBranch] = useState("");

  useEffect(() => {
    if (!open || !offer) return;
    const ext = offer as ListingOffer & Record<string, unknown>;
    setExchangeDate(offer.exchange_date?.slice(0, 10) ?? offer.offer_date.slice(0, 10));
    setExpUnconditional(String(ext.expected_unconditional_date ?? "").slice(0, 10));
    setExpSettlement(String(ext.expected_settlement_date ?? offer.settlement_date ?? "").slice(0, 10));
    setDisplayPrice(String(ext.display_price ?? ""));
    setPortalStatus((ext.portal_status as typeof portalStatus) ?? "under_contract");
    setVendorSolicitorId(String(ext.vendor_solicitor_contact_id ?? ""));
    setDepositType((ext.deposit_type as typeof depositType) ?? "flat");
    setDepositAmount(ext.deposit_amount != null ? String(ext.deposit_amount) : "");
    setCommissionType((ext.commission_type as typeof commissionType) ?? "percentage");
    setBalanceTrust(ext.balance_held_trust != null ? String(ext.balance_held_trust) : "");
    setBalanceIbd(ext.balance_held_ibd != null ? String(ext.balance_held_ibd) : "");
    setIbdName(String(ext.ibd_account_name ?? ""));
    setIbdNumber(String(ext.ibd_account_number ?? ""));
    setIbdBsb(String(ext.ibd_bsb ?? ""));
    setIbdBank(String(ext.ibd_bank ?? ""));
    setIbdBranch(String(ext.ibd_branch ?? ""));
  }, [open, offer]);

  useEffect(() => {
    if (!open || !offer?.id || !exchangeDate || conditions.length > 0 || seedConditions.isPending) return;
    void seedConditions.mutateAsync({
      offer_id: offer.id,
      listing_id: listingId,
      rows: buildDefaultConditions(exchangeDate),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once per open
  }, [open, offer?.id, exchangeDate, conditions.length]);

  const depositValue = useMemo(() => {
    const raw = Number(depositAmount.replace(/[^0-9.]/g, ""));
    if (!offer || !Number.isFinite(raw)) return null;
    return computeDepositAmount(Number(offer.offer_price), depositType, raw);
  }, [depositAmount, depositType, offer]);

  const grossComm = useMemo(() => {
    if (!offer) return null;
    if (commissionType === "custom") return null;
    return computeGrossCommission(Number(offer.offer_price), commissionPct);
  }, [offer, commissionType, commissionPct]);

  const save = async () => {
    if (!offer) return;
    try {
      const depositRaw = Number(depositAmount.replace(/[^0-9.]/g, ""));
      await updateOffer.mutateAsync({
        id: offer.id,
        listing_id: listingId,
        exchange_date: exchangeDate || null,
        expected_unconditional_date: expUnconditional || null,
        expected_settlement_date: expSettlement || null,
        settlement_date: expSettlement || null,
        display_price: displayPrice.trim() || null,
        portal_status: portalStatus,
        vendor_solicitor_contact_id: vendorSolicitorId || null,
        deposit_type: depositType,
        deposit_amount: Number.isFinite(depositRaw) ? depositRaw : null,
        commission_type: commissionType,
        gross_comm_incgst: grossComm?.incGst ?? null,
        gross_comm_exgst: grossComm?.exGst ?? null,
        balance_held_trust: Number(balanceTrust.replace(/[^0-9.]/g, "")) || 0,
        balance_held_ibd: Number(balanceIbd.replace(/[^0-9.]/g, "")) || 0,
        ibd_account_name: ibdName.trim() || null,
        ibd_account_number: ibdNumber.trim() || null,
        ibd_bsb: ibdBsb.trim() || null,
        ibd_bank: ibdBank.trim() || null,
        ibd_branch: ibdBranch.trim() || null,
      });
      toast({ title: "Contract updated" });
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  if (!offer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contract — {offer.ref_code}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Contract date</Label>
            <Input type="date" className="mt-1" value={exchangeDate} onChange={(e) => setExchangeDate(e.target.value)} />
          </div>
          <div>
            <Label>Contract price</Label>
            <p className="mt-2 font-mono text-sm tabular-nums">{formatOfferPrice(offer.offer_price)}</p>
          </div>
          <div>
            <Label>Expected unconditional</Label>
            <Input type="date" className="mt-1" value={expUnconditional} onChange={(e) => setExpUnconditional(e.target.value)} />
          </div>
          <div>
            <Label>Expected settlement</Label>
            <Input type="date" className="mt-1" value={expSettlement} onChange={(e) => setExpSettlement(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Display price (portals)</Label>
          <Input
            className="mt-1"
            placeholder='e.g. "Under Contract" or "Contact Agent"'
            value={displayPrice}
            onChange={(e) => setDisplayPrice(e.target.value)}
          />
        </div>

        <div>
          <Label className="mb-2 block">Portal status</Label>
          <RadioGroup value={portalStatus} onValueChange={(v) => setPortalStatus(v as typeof portalStatus)} className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="available" /> Available
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="under_contract" /> Under contract
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="sold" /> Sold
            </label>
          </RadioGroup>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Deposit type</Label>
            <Select value={depositType} onValueChange={(v) => setDepositType(v as typeof depositType)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flat">Flat $</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{depositType === "percentage" ? "Deposit %" : "Deposit $"}</Label>
            <Input className="mt-1" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
            {depositValue != null ? (
              <p className="text-xs text-muted-foreground mt-1">= {formatOfferPrice(depositValue)}</p>
            ) : null}
          </div>
        </div>

        {grossComm ? (
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/20 p-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Gross comm (ex GST)</p>
              <p className="font-mono tabular-nums">{formatOfferPrice(grossComm.exGst)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gross comm (inc GST)</p>
              <p className="font-mono tabular-nums text-primary">{formatOfferPrice(grossComm.incGst)}</p>
            </div>
          </div>
        ) : null}

        <div>
          <Label>Vendor solicitor</Label>
          <Select value={vendorSolicitorId || "__none__"} onValueChange={(v) => setVendorSolicitorId(v === "__none__" ? "" : v)}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {contacts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {getContactDisplayName(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {conditions.length > 0 ? (
          <div className="space-y-2">
            <Label>Conditions</Label>
            <ul className="space-y-1.5">
              {conditions.map((c) => {
                const status = effectiveConditionStatus(c.status, c.due_date);
                return (
                  <li key={c.id} className="rounded-md border border-border/70 px-2 py-1.5 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium truncate">{c.label}</p>
                      <span className={cn("rounded border px-1.5 py-0.5 text-[10px] shrink-0", conditionStatusClass(status))}>
                        {conditionStatusLabel(status)}
                      </span>
                    </div>
                    <Input
                      type="date"
                      className="h-7 text-xs"
                      value={c.due_date.slice(0, 10)}
                      onChange={(e) =>
                        void updateCondition.mutateAsync({
                          id: c.id,
                          offer_id: c.offer_id,
                          due_date: e.target.value,
                        })
                      }
                    />
                    <div className="flex gap-1">
                      {status !== "complete" && status !== "waived" ? (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] px-2"
                            onClick={() =>
                              void updateCondition.mutateAsync({ id: c.id, offer_id: c.offer_id, status: "complete" })
                            }
                          >
                            Done
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] px-2"
                            onClick={() =>
                              void updateCondition.mutateAsync({ id: c.id, offer_id: c.offer_id, status: "waived" })
                            }
                          >
                            Waive
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex gap-2 pt-1">
              <Input
                className="h-8 text-xs flex-1"
                placeholder="New condition label"
                value={newConditionLabel}
                onChange={(e) => setNewConditionLabel(e.target.value)}
              />
              <Input
                type="date"
                className="h-8 text-xs w-[130px]"
                value={newConditionDue}
                onChange={(e) => setNewConditionDue(e.target.value)}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 shrink-0"
                disabled={!newConditionLabel.trim() || !newConditionDue || !offer}
                onClick={() => {
                  if (!offer) return;
                  void createCondition
                    .mutateAsync({
                      offer_id: offer.id,
                      listing_id: listingId,
                      condition_type: "other",
                      label: newConditionLabel.trim(),
                      due_date: newConditionDue,
                    })
                    .then(() => {
                      setNewConditionLabel("");
                      setNewConditionDue("");
                    });
                }}
              >
                Add
              </Button>
            </div>
          </div>
        ) : null}

        <Collapsible>
          <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium py-1">
            IBD account details
            <ChevronDown className="h-4 w-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Balance in trust</Label>
                <Input className="mt-1" value={balanceTrust} onChange={(e) => setBalanceTrust(e.target.value)} />
              </div>
              <div>
                <Label>Balance in IBD</Label>
                <Input className="mt-1" value={balanceIbd} onChange={(e) => setBalanceIbd(e.target.value)} />
              </div>
            </div>
            <Input placeholder="Account name" value={ibdName} onChange={(e) => setIbdName(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="BSB" value={ibdBsb} onChange={(e) => setIbdBsb(e.target.value)} />
              <Input placeholder="Account number" value={ibdNumber} onChange={(e) => setIbdNumber(e.target.value)} />
            </div>
            <Input placeholder="Bank" value={ibdBank} onChange={(e) => setIbdBank(e.target.value)} />
            <Input placeholder="Branch" value={ibdBranch} onChange={(e) => setIbdBranch(e.target.value)} />
          </CollapsibleContent>
        </Collapsible>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={updateOffer.isPending}>
            Save contract
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
