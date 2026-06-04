import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateListingOffer, type ListingOffer } from "@/hooks/useListingOffers";
import {
  useCreateListingContractDocument,
  uploadContractDocumentFile,
} from "@/hooks/useListingContractDocuments";
import { useSeedOfferConditions } from "@/hooks/useOfferConditions";
import { parseSalesContractPdf, type ParsedSalesContract } from "@/lib/parseSalesContractPdf";
import { buildDefaultConditions } from "@/lib/offerConditions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File;
  offer: ListingOffer;
  listingId: string;
  onSaved: () => void;
};

export function ContractParseReviewDialog({
  open,
  onOpenChange,
  file,
  offer,
  listingId,
  onSaved,
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const updateOffer = useUpdateListingOffer();
  const createDoc = useCreateListingContractDocument();
  const seedConditions = useSeedOfferConditions();

  const [loading, setLoading] = useState(true);
  const [parsed, setParsed] = useState<ParsedSalesContract | null>(null);
  const [exchangeDate, setExchangeDate] = useState("");
  const [settlementDate, setSettlementDate] = useState("");
  const [price, setPrice] = useState("");
  const [specialConditions, setSpecialConditions] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void parseSalesContractPdf(file)
      .then((result) => {
        setParsed(result);
        setExchangeDate(result.contractDate ?? offer.exchange_date?.slice(0, 10) ?? "");
        setSettlementDate(result.settlementDate ?? offer.expected_settlement_date?.slice(0, 10) ?? "");
        setPrice(result.purchasePrice != null ? String(result.purchasePrice) : String(offer.offer_price));
        setSpecialConditions(result.specialConditionsSnippet ?? offer.special_conditions ?? "");
      })
      .catch(() => {
        setParsed(null);
        setExchangeDate(offer.exchange_date?.slice(0, 10) ?? format(new Date(), "yyyy-MM-dd"));
        setSettlementDate(offer.expected_settlement_date?.slice(0, 10) ?? "");
        setPrice(String(offer.offer_price));
        setSpecialConditions(offer.special_conditions ?? "");
      })
      .finally(() => setLoading(false));
  }, [open, file, offer]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const priceNum = Number(price.replace(/[^0-9.]/g, ""));
      await updateOffer.mutateAsync({
        id: offer.id,
        listing_id: listingId,
        ...(offer.status === "accepted" ? { status: "conditional" as const } : {}),
        exchange_date: exchangeDate || null,
        expected_settlement_date: settlementDate || null,
        settlement_date: settlementDate || null,
        offer_price: Number.isFinite(priceNum) && priceNum > 0 ? priceNum : undefined,
        special_conditions: specialConditions.trim() || null,
        portal_status: "under_contract",
      });

      if (exchangeDate) {
        await seedConditions.mutateAsync({
          offer_id: offer.id,
          listing_id: listingId,
          rows: buildDefaultConditions(exchangeDate),
        });
      }

      const { storage_path } = await uploadContractDocumentFile(
        user.id,
        listingId,
        offer.id,
        file,
      );
      await createDoc.mutateAsync({
        listing_id: listingId,
        offer_id: offer.id,
        doc_type: "signed_contract",
        title: file.name,
        storage_path,
        file_name: file.name,
        mime_type: file.type,
        source: "parsed_import",
        parsed_snapshot: parsed ? { ...parsed, rawText: parsed.rawText.slice(0, 2000) } : null,
      });

      toast({ title: "Contract lodged", description: "Review fields and conditions on the listing." });
      onSaved();
    } catch (e) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review contract import</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">Reading PDF…</p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Confirm extracted fields before saving. Training content only — always verify against the signed contract.
            </p>
            {parsed?.buyerNames.length ? (
              <p className="text-xs">
                Detected buyer: <span className="font-medium">{parsed.buyerNames.join(", ")}</span>
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contract date</Label>
                <Input type="date" className="mt-1" value={exchangeDate} onChange={(e) => setExchangeDate(e.target.value)} />
              </div>
              <div>
                <Label>Settlement date</Label>
                <Input type="date" className="mt-1" value={settlementDate} onChange={(e) => setSettlementDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Purchase price</Label>
              <Input className="mt-1" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div>
              <Label>Special conditions</Label>
              <Textarea className="mt-1" rows={3} value={specialConditions} onChange={(e) => setSpecialConditions(e.target.value)} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={loading || saving}>
            Lodge contract
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
