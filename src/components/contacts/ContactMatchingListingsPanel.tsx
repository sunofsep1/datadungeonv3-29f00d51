import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Home, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useContactBuyerRequirements } from "@/hooks/useBuyerRequirements";
import { useListings, type Listing } from "@/hooks/useListings";
import { useProperties } from "@/hooks/useProperties";
import {
  buildListingMatchProfile,
  matchListingsToRequirements,
  profileRequirementFromContact,
  type BuyerRequirementRecord,
} from "@/lib/buyerRequirementMatch";
import { listingPublicPriceLabel } from "@/lib/listingPriceFields";
import { useContact } from "@/hooks/useContact";

type Props = { contactId: string };

function formatAud(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function ContactMatchingListingsPanel({ contactId }: Props) {
  const { data: contact } = useContact(contactId);
  const { data: savedReqs = [], isLoading: reqsLoading } = useContactBuyerRequirements(contactId);
  const { data: listings = [], isLoading: listingsLoading } = useListings();
  const { data: properties = [], isLoading: propsLoading } = useProperties();

  const propertiesById = useMemo(
    () => new Map(properties.map((p) => [p.id, p])),
    [properties],
  );

  const requirements = useMemo(() => {
    const rows: BuyerRequirementRecord[] = savedReqs.map((r) => ({ ...r, _source: "saved" as const }));
    if (contact && savedReqs.length === 0) {
      const profile = profileRequirementFromContact(contact);
      if (profile) rows.push(profile);
    }
    return rows;
  }, [savedReqs, contact]);

  const matches = useMemo(() => {
    if (!requirements.length) return [];

    const activeListings = listings.filter(
      (l) => l.status === "active" || l.status === "pending",
    );

    const listingProfiles = activeListings.map((listing) => {
      const property = listing.property_id ? propertiesById.get(listing.property_id) ?? null : null;
      return {
        id: listing.id,
        address: listing.address,
        profile: buildListingMatchProfile(listing, property),
      };
    });

    return matchListingsToRequirements(requirements, listingProfiles);
  }, [requirements, listings, propertiesById]);

  const listingsById = useMemo(() => new Map(listings.map((l) => [l.id, l])), [listings]);

  const loading = reqsLoading || listingsLoading || propsLoading;

  if (!requirements.length) {
    return (
      <Card className="zoho-card p-5 sm:p-6 border-border">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Matching listings</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Add a buyer brief above to see listings that match this contact&apos;s criteria.
        </p>
      </Card>
    );
  }

  return (
    <Card className="zoho-card p-5 sm:p-6 border-border">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Matching listings</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Active listings that satisfy at least one buyer brief
          </p>
        </div>
        {!loading && (
          <Badge variant="secondary" className="tabular-nums">
            {matches.length}
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Scanning listings…
        </div>
      ) : matches.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No active listings match these requirements right now. Try widening suburbs or budget.
        </p>
      ) : (
        <ul className="space-y-2">
          {matches.map((match) => {
            const listing = listingsById.get(match.listingId) as
              | (Listing & { search_price?: number | null; display_price?: string | null })
              | undefined;
            if (!listing) return null;

            return (
              <li
                key={match.listingId}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-muted/10 p-3"
              >
                <div className="min-w-0 flex items-start gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Home className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-2">
                      {listing.address || "Listing"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {listingPublicPriceLabel(listing, formatAud)}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {match.matchReasons.slice(0, 4).map((r) => (
                        <Badge key={r} variant="outline" className="text-[10px] px-1.5 py-0">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" className="shrink-0 h-8 text-xs" asChild>
                  <Link to={`/listings/${match.listingId}`}>View</Link>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
