import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatContactAddress, getContactDisplayName, type Contact } from "@/hooks/useContacts";
import { useUserCommunicationSettings } from "@/hooks/useUserCommunicationSettings";
import { mergeSmsPlaceholders } from "@/lib/smsTemplateMerge";
import {
  buildOfferLetterMergeContext,
  OFFER_LETTER_BODIES,
  OFFER_LETTER_LABELS,
  saveOfferLetterPrintPayload,
  type OfferLetterKind,
} from "@/lib/offerLetterPrint";
import { formatOfferPrice } from "@/lib/listingOffers";
import type { ListingOffer } from "@/hooks/useListingOffers";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: ListingOffer | null;
  listingAddress: string;
  buyer: Contact | null;
};

export function OfferLetterDialog({ open, onOpenChange, offer, listingAddress, buyer }: Props) {
  const navigate = useNavigate();
  const { data: commSettings } = useUserCommunicationSettings();
  const [kind, setKind] = useState<OfferLetterKind>("accept");
  const [body, setBody] = useState(OFFER_LETTER_BODIES.accept);

  useEffect(() => {
    if (open) {
      setKind("accept");
      setBody(OFFER_LETTER_BODIES.accept);
    }
  }, [open]);

  useEffect(() => {
    setBody(OFFER_LETTER_BODIES[kind]);
  }, [kind]);

  const signature = commSettings?.sms_signature?.trim() ?? "";
  const offerPriceFormatted = offer ? formatOfferPrice(offer.offer_price) : "—";

  const mergedBody = useMemo(() => {
    if (!buyer || !offer) return body;
    const ctx = buildOfferLetterMergeContext(buyer, signature, offerPriceFormatted, listingAddress);
    return mergeSmsPlaceholders(body.trim(), ctx);
  }, [body, buyer, offer, signature, offerPriceFormatted, listingAddress]);

  const handlePrint = () => {
    if (!offer || !buyer) return;
    saveOfferLetterPrintPayload({
      listingAddress,
      offerRef: offer.ref_code,
      offerPrice: offerPriceFormatted,
      letterKind: kind,
      recipientName: getContactDisplayName(buyer),
      mailingAddress: formatContactAddress(buyer),
      mergedBody,
    });
    onOpenChange(false);
    navigate("/listings/offers/letters/print");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Offer letter
          </DialogTitle>
          <DialogDescription>
            Reapit-style mail-merge for {offer?.ref_code ?? "offer"}
            {buyer ? ` — ${getContactDisplayName(buyer)}` : ""}
          </DialogDescription>
        </DialogHeader>
        {!buyer ? (
          <p className="text-sm text-muted-foreground">Link a buyer contact to this offer before generating a letter.</p>
        ) : (
          <div className="space-y-3">
            <div>
              <Label>Letter type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as OfferLetterKind)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(OFFER_LETTER_LABELS) as OfferLetterKind[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {OFFER_LETTER_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Body</Label>
              <Textarea className="mt-1 font-mono text-xs" rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
              <p className="text-[11px] text-muted-foreground mt-1">
                Placeholders: {"{{first_name}}"}, {"{{custom1}}"} (price), {"{{custom2}}"} (address), {"{{signature}}"}
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-3 text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">
              {mergedBody}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handlePrint} disabled={!buyer || !offer}>
            Print letter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
