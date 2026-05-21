import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { FileText, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { useContacts, getContactDisplayName } from "@/hooks/useContacts";
import {
  useListingOffers,
  useCreateListingOffer,
  useUpdateListingOffer,
  useDeleteListingOffer,
  type ListingOffer,
} from "@/hooks/useListingOffers";
import {
  filterOffersByTab,
  formatOfferPrice,
  offerStatusActions,
  offerStatusLabel,
  type ListingOffersTab,
  type ListingOfferStatus,
} from "@/lib/listingOffers";
import { useCreateActivityLog } from "@/hooks/useActivityLog";
import { cn } from "@/lib/utils";

type Props = { listingId: string; listingAddress?: string | null };

function parsePrice(raw: string): number | null {
  const n = Number(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function statusBadgeClass(status: string): string {
  if (status === "accepted" || status === "unconditional" || status === "settled") {
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
  }
  if (status === "rejected" || status === "withdrawn" || status === "fallen_through") {
    return "bg-destructive/10 text-destructive border-destructive/30";
  }
  if (status === "conditional") return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
  return "bg-muted text-muted-foreground border-border";
}

export function ListingOffersPanel({ listingId, listingAddress }: Props) {
  const { toast } = useToast();
  const { data: offers = [], isLoading } = useListingOffers(listingId);
  const { data: contacts = [] } = useContacts();
  const createOffer = useCreateListingOffer();
  const updateOffer = useUpdateListingOffer();
  const deleteOffer = useDeleteListingOffer();
  const createActivityLog = useCreateActivityLog();

  const [tab, setTab] = useState<ListingOffersTab>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [offerDate, setOfferDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [offerPrice, setOfferPrice] = useState("");
  const [buyerId, setBuyerId] = useState("");
  const [solicitorId, setSolicitorId] = useState("");
  const [investor, setInvestor] = useState(false);
  const [inclusions, setInclusions] = useState("");
  const [specialConditions, setSpecialConditions] = useState("");
  const [notes, setNotes] = useState("");

  const contactsById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const filtered = useMemo(() => filterOffersByTab(offers, tab), [offers, tab]);

  const resetForm = () => {
    setOfferDate(format(new Date(), "yyyy-MM-dd"));
    setOfferPrice("");
    setBuyerId("");
    setSolicitorId("");
    setInvestor(false);
    setInclusions("");
    setSpecialConditions("");
    setNotes("");
  };

  const submitOffer = async () => {
    const price = parsePrice(offerPrice);
    if (!price) {
      toast({ title: "Enter a valid offer price", variant: "destructive" });
      return;
    }
    try {
      const row = await createOffer.mutateAsync({
        listing_id: listingId,
        offer_date: offerDate,
        offer_price: price,
        buyer_contact_id: buyerId || null,
        buyer_solicitor_contact_id: solicitorId || null,
        investor,
        inclusions,
        special_conditions: specialConditions,
        notes,
      });
      await createActivityLog.mutateAsync({
        activity_type: "offer",
        title: `Offer ${row.ref_code} — ${formatOfferPrice(price)}`,
        description: buyerId
          ? `Buyer: ${getContactDisplayName(contactsById.get(buyerId)!)}`
          : notes.trim() || null,
        listing_id: listingId,
        contact_id: buyerId || null,
      });
      toast({ title: "Offer recorded", description: `Ref ${row.ref_code}` });
      setAddOpen(false);
      resetForm();
    } catch (e) {
      toast({
        title: "Could not save offer",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const changeStatus = async (offer: ListingOffer, status: ListingOfferStatus) => {
    try {
      const patch: Parameters<typeof updateOffer.mutateAsync>[0] = {
        id: offer.id,
        listing_id: listingId,
        status,
      };
      if (status === "conditional" && !offer.exchange_date) {
        patch.exchange_date = format(new Date(), "yyyy-MM-dd");
      }
      if (status === "settled" && !offer.settlement_date) {
        patch.settlement_date = format(new Date(), "yyyy-MM-dd");
      }
      await updateOffer.mutateAsync(patch);
      await createActivityLog.mutateAsync({
        activity_type: "offer",
        title: `${offer.ref_code}: ${offerStatusLabel(status)}`,
        description: formatOfferPrice(offer.offer_price),
        listing_id: listingId,
        contact_id: offer.buyer_contact_id,
      });
      toast({ title: "Updated", description: offerStatusLabel(status) });
    } catch (e) {
      toast({
        title: "Could not update",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const remove = async (offer: ListingOffer) => {
    try {
      await deleteOffer.mutateAsync({ id: offer.id, listingId });
      toast({ title: "Offer removed" });
    } catch (e) {
      toast({
        title: "Could not delete",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="zoho-card p-4 sm:p-5 border-border">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Offers & contracts
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {offers.length} record{offers.length !== 1 ? "s" : ""}
            {listingAddress ? ` · ${listingAddress}` : ""}
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add offer
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ListingOffersTab)}>
        <TabsList className="mb-3 h-8">
          <TabsTrigger value="offers" className="text-xs px-3">
            Offers ({filterOffersByTab(offers, "offers").length})
          </TabsTrigger>
          <TabsTrigger value="contracts" className="text-xs px-3">
            Contracts ({filterOffersByTab(offers, "contracts").length})
          </TabsTrigger>
          <TabsTrigger value="all" className="text-xs px-3">
            All ({offers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {tab === "contracts"
                ? "No contracts yet. Accept an offer, then exchange to conditional."
                : "No offers logged yet."}
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((offer) => (
                <OfferRow
                  key={offer.id}
                  offer={offer}
                  buyerName={
                    offer.buyer_contact_id
                      ? getContactDisplayName(contactsById.get(offer.buyer_contact_id) ?? { id: offer.buyer_contact_id })
                      : null
                  }
                  onStatus={(s) => void changeStatus(offer, s)}
                  onDelete={() => void remove(offer)}
                />
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log offer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Offer date</Label>
                <Input type="date" className="mt-1" value={offerDate} onChange={(e) => setOfferDate(e.target.value)} />
              </div>
              <div>
                <Label>Offer price *</Label>
                <Input
                  className="mt-1"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  placeholder="850000"
                />
              </div>
            </div>
            <ContactPicker label="Buyer" value={buyerId} onChange={setBuyerId} contacts={contacts} />
            <ContactPicker label="Buyer solicitor" value={solicitorId} onChange={setSolicitorId} contacts={contacts} />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={investor} onCheckedChange={(v) => setInvestor(v === true)} />
              Investor purchase
            </label>
            <div>
              <Label>Inclusions</Label>
              <Textarea className="mt-1" rows={2} value={inclusions} onChange={(e) => setInclusions(e.target.value)} />
            </div>
            <div>
              <Label>Special conditions</Label>
              <Textarea
                className="mt-1"
                rows={2}
                value={specialConditions}
                onChange={(e) => setSpecialConditions(e.target.value)}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea className="mt-1" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button type="button" className="w-full" onClick={() => void submitOffer()} disabled={createOffer.isPending}>
              Save offer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function OfferRow({
  offer,
  buyerName,
  onStatus,
  onDelete,
}: {
  offer: ListingOffer;
  buyerName: string | null;
  onStatus: (s: ListingOfferStatus) => void;
  onDelete: () => void;
}) {
  const actions = offerStatusActions(offer.status);

  return (
    <li className="rounded-lg border border-border/70 bg-muted/10 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold tabular-nums">{formatOfferPrice(offer.offer_price)}</span>
            <Badge variant="outline" className={cn("text-[10px]", statusBadgeClass(offer.status))}>
              {offerStatusLabel(offer.status)}
            </Badge>
            <span className="text-xs text-muted-foreground">{offer.ref_code}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {format(new Date(offer.offer_date), "d MMM yyyy")}
            {buyerName ? (
              <>
                {" · "}
                {offer.buyer_contact_id ? (
                  <Link to={`/contacts/${offer.buyer_contact_id}`} className="text-primary hover:underline">
                    {buyerName}
                  </Link>
                ) : (
                  buyerName
                )}
              </>
            ) : null}
            {offer.investor ? " · Investor" : ""}
          </p>
          {offer.exchange_date ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              Exchange {format(new Date(offer.exchange_date), "d MMM yyyy")}
              {offer.settlement_date
                ? ` · Settlement ${format(new Date(offer.settlement_date), "d MMM yyyy")}`
                : ""}
            </p>
          ) : null}
          {offer.special_conditions ? (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{offer.special_conditions}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1">
          {actions.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs">
                  Update
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.map((a) => (
                  <DropdownMenuItem key={a.value} onClick={() => onStatus(a.value)}>
                    {a.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </li>
  );
}

function ContactPicker({
  label,
  value,
  onChange,
  contacts,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  contacts: ReturnType<typeof useContacts>["data"];
}) {
  const list = contacts ?? [];
  const selected = list.find((c) => c.id === value);

  return (
    <div>
      <Label>{label}</Label>
      <Command className="mt-1 rounded-lg border border-border">
        <CommandInput placeholder="Search contacts…" />
        <CommandList className="max-h-36">
          <CommandEmpty>No contacts</CommandEmpty>
          <CommandGroup>
            <CommandItem
              value="__none__"
              onSelect={() => onChange("")}
              className={!value ? "bg-muted" : undefined}
            >
              None
            </CommandItem>
            {list.map((c) => (
              <CommandItem
                key={c.id}
                value={getContactDisplayName(c)}
                onSelect={() => onChange(c.id)}
                className={value === c.id ? "bg-muted" : undefined}
              >
                {getContactDisplayName(c)}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
      {selected ? (
        <p className="text-xs text-muted-foreground mt-1">Selected: {getContactDisplayName(selected)}</p>
      ) : null}
    </div>
  );
}
