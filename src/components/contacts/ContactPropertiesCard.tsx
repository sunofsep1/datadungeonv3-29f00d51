import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building2, Plus, Trash2 } from "lucide-react";
import { useContact } from "@/hooks/useContact";
import { useProperties, formatPropertyAddress } from "@/hooks/useProperties";
import { useDeleteContactPropertyLink } from "@/hooks/useContactPropertyLinks";
import { useToast } from "@/hooks/use-toast";
import { useCreatePropertyFromContactAddress } from "@/hooks/useCreatePropertyFromContactAddress";

interface ContactPropertiesCardProps {
  contactId: string | null;
  onOpenChange?: (open: boolean) => void;
  onLinkPropertyClick: () => void;
  onViewProperty?: (propertyId: string) => void;
}

export function ContactPropertiesCard({
  contactId,
  onOpenChange,
  onLinkPropertyClick,
  onViewProperty,
}: ContactPropertiesCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: contact } = useContact(contactId || undefined);
  const { data: allProperties = [] } = useProperties();
  const deleteLink = useDeleteContactPropertyLink();
  const createFromAddress = useCreatePropertyFromContactAddress();

  const linkedProperties = useMemo(() => {
    if (!contact?.contact_property_links) return [];
    return contact.contact_property_links
      .map((link) => {
        const property = allProperties.find((p) => p.id === link.property_id);
        return property ? { ...link, property } : null;
      })
      .filter(Boolean) as Array<typeof contact.contact_property_links[0] & { property: typeof allProperties[0] }>;
  }, [contact?.contact_property_links, allProperties]);

  const linkedPropertyIds = useMemo(
    () => new Set((contact?.contact_property_links ?? []).map((l) => l.property_id)),
    [contact?.contact_property_links]
  );
  const availableProperties = useMemo(
    () => allProperties.filter((p) => !linkedPropertyIds.has(p.id)),
    [allProperties, linkedPropertyIds]
  );

  const handleView = (propertyId: string) => {
    onOpenChange?.(false);
    if (onViewProperty) onViewProperty(propertyId);
    else navigate(`/properties/${propertyId}`);
  };

  const handleUnlink = async (linkId: string, propertyId: string) => {
    if (!contactId) return;
    try {
      await deleteLink.mutateAsync({ id: linkId, property_id: propertyId, contact_id: contactId });
      toast({ title: "Removed", description: "Property unlinked." });
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to unlink", variant: "destructive" });
    }
  };

  const handleCreateFromAddress = async () => {
    if (!contactId || !contact?.address_line1) {
      onLinkPropertyClick();
      return;
    }
    try {
      await createFromAddress.createAndLink({
        contact_id: contactId,
        address: {
          address_line1: contact.address_line1,
          address_line2: contact.address_line2 || null,
          city: contact.city || null,
          state: contact.state || null,
          postcode: contact.postcode || null,
          country: contact.country || "Australia",
        },
        role: "owner",
      });
      toast({ title: "Success", description: "Property created and linked!" });
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof (e as { message?: string })?.message === "string"
            ? (e as { message: string }).message
            : String(e);
      toast({ title: "Error", description: msg || "Failed to create property", variant: "destructive" });
    }
  };

  const handleLinkClick = () => {
    if (contact?.address_line1) handleCreateFromAddress();
    else onLinkPropertyClick();
  };

  return (
    <Card className="zoho-card p-4 border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Properties
        </h3>
        <Button variant="outline" size="sm" className="gap-1 h-8" onClick={handleLinkClick}>
          <Plus className="w-3.5 h-3.5" /> Link property
        </Button>
      </div>
      {linkedProperties.length > 0 ? (
        <div className="space-y-3">
          {linkedProperties.map((link) => {
            const property = link.property;
            if (!property) return null;
            const addr = formatPropertyAddress(property);
            return (
              <div key={link.id} className="rounded-lg border border-border p-3 space-y-2">
                <button
                  type="button"
                  onClick={() => handleView(property.id)}
                  className="font-medium text-sm text-foreground hover:underline text-left block w-full"
                >
                  {addr}
                </button>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  {property.property_type && <Badge variant="secondary" className="text-xs">{property.property_type}</Badge>}
                  {property.bedrooms != null && <span>{property.bedrooms} bed</span>}
                  {property.bathrooms != null && <span>{property.bathrooms} bath</span>}
                </div>
                {property.price != null && property.price > 0 && (
                  <p className="text-sm font-semibold text-foreground">${Number(property.price).toLocaleString()}</p>
                )}
                {link.role && <Badge variant="outline" className="text-xs capitalize">{link.role}</Badge>}
                <div className="flex gap-2 pt-1">
                  <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => handleView(property.id)}>
                    View
                  </Button>
                  {link.id && (
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-destructive hover:text-destructive" onClick={() => handleUnlink(link.id!, property.id)} disabled={deleteLink.isPending}>
                      <Trash2 className="w-3 h-3" /> Unlink
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6">
          <MapPin className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No properties linked. Use the button above to link one.</p>
        </div>
      )}
    </Card>
  );
}
