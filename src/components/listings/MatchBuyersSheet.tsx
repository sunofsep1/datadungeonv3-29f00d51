import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, MessageSquare, Phone, Users } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useContacts,
  getContactDisplayName,
  getPrimaryEmail,
  getPrimaryPhone,
  type ContactWithMeta,
} from "@/hooks/useContacts";
import { useBuyerRequirements } from "@/hooks/useBuyerRequirements";
import { useProperty } from "@/hooks/useProperties";
import type { Listing } from "@/hooks/useListings";
import {
  buildListingMatchProfile,
  matchBuyersToListing,
  profileRequirementFromContact,
  type BuyerRequirementRecord,
  type BuyerMatchResult,
} from "@/lib/buyerRequirementMatch";
import { listingSearchPrice } from "@/lib/listingPriceFields";
import { contactCanCall, contactCanEmail, contactCanSms } from "@/lib/contactOutreach";
import { phoneToTelHref } from "@/lib/formatPhone";
import { EmailComposeDialog } from "@/components/contacts/EmailComposeDialog";
import { SendSmsDialog } from "@/components/contacts/SendSmsDialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: Listing;
};

export function MatchBuyersSheet({ open, onOpenChange, listing }: Props) {
  const { data: contacts = [], isLoading: contactsLoading } = useContacts();
  const { data: savedReqs = [], isLoading: reqsLoading } = useBuyerRequirements();
  const { data: property } = useProperty(listing.property_id ?? undefined);
  const [emailOpen, setEmailOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);

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

  const matches = useMemo(
    () => matchBuyersToListing(listingProfile, allRequirements, contactsById),
    [listingProfile, allRequirements, contactsById],
  );

  const activeContact = activeContactId ? contactsById.get(activeContactId) : null;
  const activeEmail = activeContact ? getPrimaryEmail(activeContact) : null;
  const activePhone = activeContact ? getPrimaryPhone(activeContact) : null;
  const loading = contactsLoading || reqsLoading;
  const price = listingSearchPrice(listing);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Match buyers
            </SheetTitle>
            <p className="text-xs text-muted-foreground text-left">
              {listing.address}
              {price != null
                ? ` · ${new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(price)}`
                : ""}
            </p>
          </SheetHeader>

          <MatchList
            loading={loading}
            matches={matches}
            contactsById={contactsById}
            onEmail={(id) => {
              setActiveContactId(id);
              setEmailOpen(true);
            }}
            onSms={(id) => {
              setActiveContactId(id);
              setSmsOpen(true);
            }}
          />
        </SheetContent>
      </Sheet>

      {activeEmail ? (
        <EmailComposeDialog
          open={emailOpen}
          onOpenChange={setEmailOpen}
          to={activeEmail}
          contactId={activeContactId ?? undefined}
          contactName={activeContact ? getContactDisplayName(activeContact) : undefined}
        />
      ) : null}

      {activePhone ? (
        <SendSmsDialog
          open={smsOpen}
          onOpenChange={setSmsOpen}
          to={activePhone}
          contactId={activeContactId}
          contactName={activeContact ? getContactDisplayName(activeContact) : undefined}
        />
      ) : null}
    </>
  );
}

function MatchList({
  loading,
  matches,
  contactsById,
  onEmail,
  onSms,
}: {
  loading: boolean;
  matches: BuyerMatchResult[];
  contactsById: Map<string, ContactWithMeta>;
  onEmail: (contactId: string) => void;
  onSms: (contactId: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex-1 space-y-2 mt-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <p className="text-sm text-muted-foreground mt-4">
        No matching buyer briefs. Add suburbs and budget on contacts, or create saved buyer requirements.
      </p>
    );
  }

  return (
    <ul className="flex-1 overflow-y-auto mt-4 space-y-2 pr-1">
      {matches.map((m) => {
        const c = contactsById.get(m.contactId);
        const name = c ? getContactDisplayName(c) : "Contact";
        const email = c && contactCanEmail(c) ? getPrimaryEmail(c) : null;
        const phone = c && contactCanSms(c) ? getPrimaryPhone(c) : null;
        const tel = c && contactCanCall(c) ? phoneToTelHref(getPrimaryPhone(c)) : null;
        return (
          <li key={m.contactId} className="rounded-lg border border-border/70 bg-card p-3">
            <p className="font-medium text-sm text-foreground truncate">{name}</p>
            <MatchBadges m={m} />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tel ? (
                <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" asChild>
                  <a href={tel}>
                    <Phone className="h-3.5 w-3.5" /> Call
                  </a>
                </Button>
              ) : null}
              {email ? (
                <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => onEmail(m.contactId)}>
                  <Mail className="h-3.5 w-3.5" /> Email
                </Button>
              ) : null}
              {phone ? (
                <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => onSms(m.contactId)}>
                  <MessageSquare className="h-3.5 w-3.5" /> SMS
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" className="h-8 text-xs" asChild>
                <Link to={`/contacts/${m.contactId}`}>Open</Link>
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function MatchBadges({ m }: { m: BuyerMatchResult }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {m.matchReasons.map((r) => (
        <Badge key={r} variant="secondary" className="text-[10px] font-normal">
          {r}
        </Badge>
      ))}
      {m.requirementSource === "profile" ? (
        <Badge variant="outline" className="text-[10px] font-normal">
          From contact profile
        </Badge>
      ) : null}
    </div>
  );
}
