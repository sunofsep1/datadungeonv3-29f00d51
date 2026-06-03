import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Phone, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useContacts,
  getContactDisplayName,
  getPrimaryPhone,
} from "@/hooks/useContacts";
import { useBuyerRequirements } from "@/hooks/useBuyerRequirements";
import { useProperty } from "@/hooks/useProperties";
import { useListingContactLinks } from "@/hooks/useListingContactLinks";
import { useListingOffers } from "@/hooks/useListingOffers";
import type { Listing } from "@/hooks/useListings";
import {
  buildListingMatchProfile,
  matchBuyersToListing,
  profileRequirementFromContact,
  type BuyerRequirementRecord,
} from "@/lib/buyerRequirementMatch";
import { contactCanCall } from "@/lib/contactOutreach";
import { phoneToTelHref } from "@/lib/formatPhone";
import { openLogTouch } from "@/lib/openLogTouch";

type Props = {
  listing: Listing;
  listingId: string;
  onMatchBuyers: () => void;
};

export function ProspectiveBuyersPanel({ listing, listingId, onMatchBuyers }: Props) {
  const { data: contacts = [] } = useContacts();
  const { data: savedReqs = [] } = useBuyerRequirements();
  const { data: links = [] } = useListingContactLinks(listingId);
  const { data: offers = [] } = useListingOffers(listingId);
  const { data: property } = useProperty(listing.property_id ?? undefined);

  const listingProfile = useMemo(
    () => buildListingMatchProfile(listing, property ?? null),
    [listing, property],
  );

  const allRequirements = useMemo(() => {
    const rows: BuyerRequirementRecord[] = savedReqs.map((r) => ({ ...r, _source: "saved" as const }));
    const hasSaved = new Set(savedReqs.map((r) => r.contact_id));
    for (const c of contacts) {
      if (hasSaved.has(c.id)) continue;
      const profile = profileRequirementFromContact(c);
      if (profile) rows.push(profile);
    }
    return rows;
  }, [savedReqs, contacts]);

  const contactsById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  const matchScores = useMemo(() => {
    const matches = matchBuyersToListing(listingProfile, allRequirements, contactsById);
    return new Map(matches.map((m) => [m.contactId, m.matchScore]));
  }, [listingProfile, allRequirements, contactsById]);

  const buyers = useMemo(() => {
    const linked = links.filter((l) => l.role === "prospective_buyer" || l.role === "key_buyer");
    const ids = new Set(linked.map((l) => l.contact_id));
    const rows = linked.map((link) => {
      const offer = offers.find(
        (o) => o.buyer_contact_id === link.contact_id && !["withdrawn", "rejected"].includes(o.status),
      );
      return {
        contactId: link.contact_id,
        name:
          link.contacts?.name ??
          [link.contacts?.first_name, link.contacts?.last_name].filter(Boolean).join(" ") ??
          "Contact",
        role: link.role,
        matchScore: matchScores.get(link.contact_id) ?? null,
        offerStatus: offer?.status ?? null,
      };
    });

    for (const [contactId, score] of matchScores) {
      if (ids.has(contactId)) continue;
      if (score < 40) continue;
      const c = contactsById.get(contactId);
      if (!c) continue;
      rows.push({
        contactId,
        name: getContactDisplayName(c),
        role: "match",
        matchScore: score,
        offerStatus: offers.find((o) => o.buyer_contact_id === contactId)?.status ?? null,
      });
    }

    return rows.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0)).slice(0, 8);
  }, [links, offers, matchScores, contactsById]);

  return (
    <Card className="zoho-card p-4 border-border">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          Prospective buyers
        </h3>
        <Badge variant="secondary" className="tabular-nums">
          {buyers.length}
        </Badge>
      </div>

      {buyers.length === 0 ? (
        <p className="text-xs text-muted-foreground mb-3">
          No buyers linked yet. OFI check-ins and match buyers add them here.
        </p>
      ) : (
        <ul className="space-y-2 mb-3">
          {buyers.map((b) => (
            <BuyerRow key={b.contactId} buyer={b} contactsById={contactsById} listingId={listingId} />
          ))}
        </ul>
      )}

      <Button type="button" variant="outline" size="sm" className="w-full h-8 text-xs" onClick={onMatchBuyers}>
        Match buyers
      </Button>
    </Card>
  );
}

function BuyerRow({
  buyer,
  contactsById,
  listingId,
}: {
  buyer: {
    contactId: string;
    name: string;
    role: string;
    matchScore: number | null;
    offerStatus: string | null;
  };
  contactsById: Map<string, NonNullable<ReturnType<typeof useContacts>["data"]>[number]>;
  listingId: string;
}) {
  const contact = contactsById.get(buyer.contactId);
  const phone = contact ? getPrimaryPhone(contact) : null;

  return (
    <li className="rounded-md border border-border/60 p-2 bg-muted/10">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link to={`/contacts/${buyer.contactId}`} className="text-sm font-medium text-primary hover:underline line-clamp-1">
            {buyer.name}
          </Link>
          <div className="flex flex-wrap gap-1 mt-1">
            {buyer.matchScore != null ? (
              <Badge variant="outline" className="text-[10px] tabular-nums">
                Match {buyer.matchScore}%
              </Badge>
            ) : null}
            {buyer.offerStatus ? (
              <Badge variant="secondary" className="text-[10px] capitalize">
                {buyer.offerStatus.replace(/_/g, " ")}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 gap-0.5">
          {contact && contactCanCall(contact) && phone ? (
            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
              <a href={phoneToTelHref(phone)} aria-label="Call">
                <Phone className="h-3.5 w-3.5" />
              </a>
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Log touch"
            onClick={() =>
              openLogTouch({ contactId: buyer.contactId, listingId, channel: "phone" })
            }
          >
            <Phone className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </div>
      </div>
    </li>
  );
}
