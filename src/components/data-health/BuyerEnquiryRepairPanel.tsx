import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useProperties } from "@/hooks/useProperties";
import { useListings } from "@/hooks/useListings";
import { useListingContactLinks } from "@/hooks/useListingContactLinks";
import { useListingOffers } from "@/hooks/useListingOffers";
import { useContacts, getContactDisplayName } from "@/hooks/useContacts";
import { useDeleteContactPropertyLink } from "@/hooks/useContactPropertyLinks";
import { useAddListingContactLink } from "@/hooks/useListingContactLinks";
import { useCreateActivityLog } from "@/hooks/useActivityLog";
import {
  buildRepairExclusions,
  linksEligibleForOwnerRepair,
} from "@/lib/buyerEnquiryRepair";
import { pickActiveContractOffer } from "@/lib/listingOfferPipelineSync";

const DEFAULT_EXCLUDE_NAMES = ["Corbin Evans", "Ashlee Evans"];

export function BuyerEnquiryRepairPanel() {
  const { toast } = useToast();
  const { data: properties = [] } = useProperties();
  const { data: listings = [] } = useListings();
  const { data: contacts = [] } = useContacts();
  const deletePropertyLink = useDeleteContactPropertyLink();
  const addListingLink = useAddListingContactLink();
  const createActivityLog = useCreateActivityLog();

  const [propertyId, setPropertyId] = useState("");
  const [listingId, setListingId] = useState("");
  const [running, setRunning] = useState(false);

  const { data: listingLinks = [] } = useListingContactLinks(listingId || undefined);
  const { data: offers = [] } = useListingOffers(listingId || undefined);

  const property = properties.find((p) => p.id === propertyId);
  const links = property?.contact_property_links ?? [];

  const contactNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of contacts) m.set(c.id, getContactDisplayName(c));
    for (const l of links) {
      const embedded = (l as { contacts?: { name?: string | null } }).contacts;
      if (embedded?.name) m.set(l.contact_id, embedded.name);
    }
    return m;
  }, [contacts, links]);

  const activeOffer = pickActiveContractOffer(offers);
  const keyBuyerIds = listingLinks.filter((l) => l.role === "key_buyer").map((l) => l.contact_id);

  const exclusions = useMemo(
    () =>
      buildRepairExclusions({
        keyBuyerContactIds: keyBuyerIds,
        primaryBuyerContactId: activeOffer?.buyer_contact_id,
        extraNames: DEFAULT_EXCLUDE_NAMES,
      }),
    [keyBuyerIds, activeOffer?.buyer_contact_id],
  );

  const eligible = useMemo(
    () => linksEligibleForOwnerRepair(links, contactNameById, exclusions),
    [links, contactNameById, exclusions],
  );

  const linkedListings = useMemo(() => {
    if (!propertyId) return listings;
    return listings.filter((l) => l.property_id === propertyId);
  }, [listings, propertyId]);

  const applyRepair = async () => {
    if (!propertyId || !listingId || eligible.length === 0) return;
    setRunning(true);
    let converted = 0;
    let skipped = 0;
    const errs: string[] = [];

    for (const link of eligible) {
      const name = contactNameById.get(link.contact_id);
      if (!link.id) continue;
      try {
        await deletePropertyLink.mutateAsync({
          id: link.id,
          property_id: propertyId,
          contact_id: link.contact_id,
        });
        try {
          await addListingLink.mutateAsync({
            listing_id: listingId,
            contact_id: link.contact_id,
            role: "prospective_buyer",
          });
          converted++;
        } catch {
          converted++;
          skipped++;
        }
        if (name) {
          await createActivityLog.mutateAsync({
            activity_type: "note",
            title: `Enquiry repair — ${name}`,
            description: "Moved from property owner link to listing prospective buyer.",
            listing_id: listingId,
            contact_id: link.contact_id,
            property_id: propertyId,
          });
        }
      } catch (e) {
        errs.push(name ?? link.contact_id);
        console.warn(e);
      }
    }

    setRunning(false);
    toast({
      title: "Repair complete",
      description: `${converted} contact${converted !== 1 ? "s" : ""} moved to prospective buyers.${errs.length ? ` ${errs.length} failed.` : ""}`,
    });
  };

  return (
    <Card className="zoho-card p-4 border-amber-500/30 bg-amber-500/5">
      <div className="flex items-start gap-3">
        <Wrench className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <h3 className="font-semibold text-foreground">Buyer enquiry repair</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Portal imports often link enquirers as property owners. Move them to{" "}
              <strong>prospective buyers</strong> on the listing instead. Contract buyers (e.g. Corbin & Ashlee Evans) are
              excluded automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Property (mis-linked owners)</Label>
              <Select value={propertyId || "__none__"} onValueChange={(v) => setPropertyId(v === "__none__" ? "" : v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select…</SelectItem>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.address_line1}
                      {p.city ? `, ${p.city}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Target listing</Label>
              <Select value={listingId || "__none__"} onValueChange={(v) => setListingId(v === "__none__" ? "" : v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select listing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select…</SelectItem>
                  {(linkedListings.length ? linkedListings : listings).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.address ?? "Listing"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {propertyId && (
            <div className="rounded-lg border border-border bg-card/60 p-3 text-sm">
              <p>
                <span className="font-medium">{eligible.length}</span> owner link
                {eligible.length !== 1 ? "s" : ""} eligible to convert
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Excludes key buyers and: {DEFAULT_EXCLUDE_NAMES.join(", ")}
              </p>
              {eligible.length > 0 && eligible.length <= 5 && (
                <ul className="mt-2 text-xs text-muted-foreground">
                  {eligible.map((l) => (
                    <li key={l.id}>{contactNameById.get(l.contact_id) ?? l.contact_id}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {propertyId && listingId && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={running || eligible.length === 0}
                onClick={() => void applyRepair()}
              >
                {running ? "Repairing…" : `Convert ${eligible.length} to listing buyers`}
              </Button>
              <Button type="button" size="sm" variant="outline" asChild>
                <Link to={`/listings/${listingId}`}>
                  Open listing <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          )}

          {propertyId && eligible.length > 10 && (
            <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Large batch — preview count before applying.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
