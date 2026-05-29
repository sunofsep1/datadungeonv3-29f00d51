import { useNavigate, Link } from "react-router-dom";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Plus, Trash2, Phone, Mail, ChevronRight, Users } from "lucide-react";
import { formatPhoneDisplay } from "@/lib/formatPhone";
import { useDeleteContactPropertyLink } from "@/hooks/useContactPropertyLinks";
import { useListings } from "@/hooks/useListings";
import type { PropertyWithLinks } from "@/hooks/useProperties";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ContactLookup = {
  id: string;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
};

type PropertyLink = PropertyWithLinks["contact_property_links"] extends (infer T)[] | undefined
  ? T
  : never;

interface PropertyContactsCardProps {
  property: PropertyWithLinks;
  onLinkClick: () => void;
  className?: string;
  contactsList?: ContactLookup[];
}

const OWNER_ROLES = new Set(["owner", "seller"]);

function contactDisplayName(c: ContactLookup | null | undefined): string {
  if (!c) return "Contact";
  if (c.name?.trim()) return c.name.trim();
  const first = c.first_name?.trim() ?? "";
  const last = c.last_name?.trim() ?? "";
  const full = [first, last].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (c.email?.trim()) return c.email.trim();
  if (c.phone?.trim()) return c.phone.trim();
  return "Contact";
}

function linkRole(l: PropertyLink): string {
  return (l.role || "owner").toLowerCase();
}

function ContactLinkRow({
  l,
  contact,
  onNavigate,
  onRemove,
  removing,
}: {
  l: PropertyLink;
  contact: ContactLookup | null | undefined;
  onNavigate: (id: string) => void;
  onRemove: (linkId: string | undefined, contactId: string) => void;
  removing: boolean;
}) {
  const displayName = contactDisplayName(contact);
  const email = contact?.email ?? null;
  const phone = contact?.phone ?? null;
  const role = linkRole(l);

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={() => onNavigate(l.contact_id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onNavigate(l.contact_id);
        }
      }}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border-l-4 border-l-teal border border-border bg-muted/30 hover:bg-teal/10 hover:border-teal/30 transition-colors cursor-pointer group"
    >
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-foreground group-hover:text-teal transition-colors">
            {displayName}
          </span>
          <Badge variant="secondary" className="text-xs capitalize bg-teal/15 text-teal border-teal/30">
            {role}
          </Badge>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-teal shrink-0 ml-auto sm:ml-0" />
        </div>
        <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
          {email && (
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-2 text-foreground/90 hover:text-teal transition-colors w-fit"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className="w-3.5 h-3.5 shrink-0 text-teal/90" />
              {email}
            </a>
          )}
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-2 text-foreground/90 hover:text-teal transition-colors w-fit"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="w-3.5 h-3.5 shrink-0 text-teal/90" />
              {formatPhoneDisplay(phone)}
            </a>
          )}
        </div>
        {l.notes && (
          <p className="text-sm text-muted-foreground mt-1 pt-2 border-t border-border">{l.notes}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(l.contact_id);
          }}
        >
          View contact
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(l.id, l.contact_id);
          }}
          disabled={removing}
          title="Unlink from property"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </li>
  );
}

export function PropertyContactsCard({
  property,
  onLinkClick,
  className,
  contactsList = [],
}: PropertyContactsCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const deleteLink = useDeleteContactPropertyLink();
  const { data: listings = [] } = useListings();
  const links = property.contact_property_links ?? [];
  const contactById = useMemo(() => new Map(contactsList.map((c) => [c.id, c])), [contactsList]);

  const listingForProperty = useMemo(
    () => listings.find((l) => l.property_id === property.id && String(l.status ?? "active").toLowerCase() !== "withdrawn"),
    [listings, property.id],
  );

  const ownerLinks = useMemo(() => links.filter((l) => OWNER_ROLES.has(linkRole(l))), [links]);
  const otherLinks = useMemo(() => links.filter((l) => !OWNER_ROLES.has(linkRole(l))), [links]);

  const ownerNames = ownerLinks
    .map((l) => {
      const c = (l as { contacts?: ContactLookup | null }).contacts ?? contactById.get(l.contact_id);
      return contactDisplayName(c);
    })
    .filter(Boolean);

  const coOwnersLabel = ownerNames.length > 1 ? `Co-owners: ${ownerNames.join(", ")}` : null;

  const handleRemove = async (linkId: string | undefined, contactId: string) => {
    if (!linkId) return;
    try {
      await deleteLink.mutateAsync({ id: linkId, property_id: property.id, contact_id: contactId });
      toast({ title: "Removed", description: "Contact unlinked." });
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to unlink",
        variant: "destructive",
      });
    }
  };

  const renderSection = (title: string, sectionLinks: PropertyLink[]) => {
    if (sectionLinks.length === 0) return null;
    return (
      <div className="mb-4 last:mb-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
        <ul className="space-y-3">
          {sectionLinks.map((l, i) => {
            const contact = (l as { contacts?: ContactLookup | null }).contacts ?? contactById.get(l.contact_id);
            return (
              <ContactLinkRow
                key={l.id ?? `${l.contact_id}-${i}`}
                l={l}
                contact={contact}
                onNavigate={(cid) => navigate(`/contacts/${cid}`)}
                onRemove={handleRemove}
                removing={deleteLink.isPending}
              />
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <Card className={cn("zoho-card p-6 border-teal/25 bg-teal/5", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal/20 text-teal">
            <User className="w-4 h-4" />
          </span>
          Owners & linked contacts
        </h3>
        <Button size="sm" onClick={onLinkClick} className="gap-1 bg-teal text-teal-foreground hover:opacity-90 border-0">
          <Plus className="w-4 h-4" /> Link contact
        </Button>
      </div>

      {listingForProperty && ownerLinks.length > 3 && (
        <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
          <p className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <Users className="h-4 w-4 shrink-0" />
            Many contacts are linked as owners — they may be buyer enquiries from import.
          </p>
          <Button variant="link" size="sm" className="h-auto p-0 mt-1" asChild>
            <Link to={`/listings/${listingForProperty.id}#listing-offers`}>
              View listing buyers & repair on Data health →
            </Link>
          </Button>
        </div>
      )}

      {coOwnersLabel && ownerLinks.length <= 3 && (
        <p className="text-muted-foreground text-sm mb-2">{coOwnersLabel}</p>
      )}

      {links.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No owners or linked contacts yet. Use &quot;Link contact&quot; for vendors; buyer enquiries belong on the
          listing, not here.
        </p>
      ) : (
        <>
          {renderSection("Owners / vendors", ownerLinks)}
          {renderSection("Other linked contacts", otherLinks)}
        </>
      )}
    </Card>
  );
}
