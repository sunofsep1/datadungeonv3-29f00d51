import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Plus, Trash2, Phone, Mail, ChevronRight } from "lucide-react";
import { formatPhoneDisplay } from "@/lib/formatPhone";
import { useCreateContactPropertyLink, useDeleteContactPropertyLink } from "@/hooks/useContactPropertyLinks";
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

interface PropertyContactsCardProps {
  property: PropertyWithLinks;
  onLinkClick: () => void;
  className?: string;
  /** Full contacts list for fallback when link.contacts is missing */
  contactsList?: ContactLookup[];
}

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

export function PropertyContactsCard({ property, onLinkClick, className, contactsList = [] }: PropertyContactsCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createLink = useCreateContactPropertyLink();
  const deleteLink = useDeleteContactPropertyLink();
  const links = property.contact_property_links ?? [];
  const contactById = useMemo(() => new Map(contactsList.map((c) => [c.id, c])), [contactsList]);
  const owners = useMemo(() => {
    const withRole = links.filter((l) => (l.role || "owner").toLowerCase() === "owner");
    return withRole
      .map((l) => (l as { contacts?: ContactLookup | null }).contacts ?? contactById.get(l.contact_id))
      .map((c) => contactDisplayName(c))
      .filter(Boolean);
  }, [links, contactById]);
  const coOwnersLabel = owners.length > 1 ? `Co-owners: ${owners.join(", ")}` : null;

  const handleRemove = async (linkId: string | undefined, contactId: string) => {
    if (!linkId) return;
    try {
      await deleteLink.mutateAsync({ id: linkId, property_id: property.id, contact_id: contactId });
      toast({ title: "Removed", description: "Contact unlinked." });
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to unlink", variant: "destructive" });
    }
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
      {coOwnersLabel && (
        <p className="text-muted-foreground text-sm mb-2">{coOwnersLabel}</p>
      )}
      {links.length > 0 && (
        <p className="text-muted-foreground/90 text-xs mb-3">Click a contact to open their profile. You can add multiple owners or other roles.</p>
      )}
      {links.length === 0 ? (
        <p className="text-muted-foreground text-sm">No owners or linked contacts yet. Use &quot;Link contact&quot; to add someone (e.g. owner, buyer, agent).</p>
      ) : (
        <ul className="space-y-3">
          {links.map((l, i) => {
            const contact = (l as { contacts?: ContactLookup | null }).contacts ?? contactById.get(l.contact_id);
            const displayName = contactDisplayName(contact);
            const email = contact?.email ?? null;
            const phone = contact?.phone ?? null;
            return (
            <li
              key={l.id ?? `${l.contact_id}-${l.property_id}-${i}`}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/contacts/${l.contact_id}`)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/contacts/${l.contact_id}`); } }}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border-l-4 border-l-teal border border-border bg-muted/30 hover:bg-teal/10 hover:border-teal/30 transition-colors cursor-pointer group"
            >
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground group-hover:text-teal transition-colors">
                    {displayName}
                  </span>
                  <Badge variant="secondary" className="text-xs capitalize bg-teal/15 text-teal border-teal/30">
                    {l.role || "owner"}
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
                      {phone}
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
                  onClick={(e) => { e.stopPropagation(); navigate(`/contacts/${l.contact_id}`); }}
                >
                  View contact
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); handleRemove(l.id, l.contact_id); }}
                  disabled={deleteLink.isPending}
                  title="Unlink from property"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </li>
          );
          })}
        </ul>
      )}
    </Card>
  );
}
