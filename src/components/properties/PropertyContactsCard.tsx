import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Plus, Trash2, Phone, Mail } from "lucide-react";
import { useCreateContactPropertyLink, useDeleteContactPropertyLink } from "@/hooks/useContactPropertyLinks";
import type { PropertyWithLinks } from "@/hooks/useProperties";
import { useToast } from "@/hooks/use-toast";

interface PropertyContactsCardProps {
  property: PropertyWithLinks;
  onLinkClick: () => void;
}

export function PropertyContactsCard({ property, onLinkClick }: PropertyContactsCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createLink = useCreateContactPropertyLink();
  const deleteLink = useDeleteContactPropertyLink();
  const links = property.contact_property_links ?? [];

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
    <Card className="zoho-card p-6 border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <User className="w-4 h-4" />
          Linked contacts
        </h3>
        <Button size="sm" onClick={onLinkClick} className="gap-1">
          <Plus className="w-4 h-4" /> Link contact
        </Button>
      </div>
      {links.length === 0 ? (
        <p className="text-white/60 text-sm">No linked contacts yet. Link contacts to this property.</p>
      ) : (
        <ul className="space-y-2">
          {links.map((l, i) => (
            <li key={l.id ?? `${l.contact_id}-${l.property_id}-${i}`} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-secondary/50">
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); navigate(`/contacts/${l.contact_id}`); }}
                    className="font-medium text-foreground hover:underline text-left"
                  >
                    {l.contacts?.name ?? "Unknown"}
                  </button>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {l.role || "owner"}
                  </Badge>
                </div>
                {(l.contacts?.phone || l.contacts?.email) && (
                  <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
                    {l.contacts?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {l.contacts.phone}
                      </span>
                    )}
                    {l.contacts?.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {l.contacts.email}
                      </span>
                    )}
                  </div>
                )}
                {l.notes && <p className="text-sm text-white/60">{l.notes}</p>}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/contacts/${l.contact_id}`); }}>
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); handleRemove(l.id, l.contact_id); }}
                  disabled={deleteLink.isPending}
                  title="Unlink contact"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
