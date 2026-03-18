/**
 * Standalone print view for a contact. Rendered without MainLayout so it can
 * be opened in an iframe for print preview or in a new window for printing.
 * No sidebar or app chrome.
 */
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useContact } from "@/hooks/useContact";
import { useInteractions } from "@/hooks/useInteractions";
import { useProperties } from "@/hooks/useProperties";
import { useAppointments } from "@/hooks/useAppointments";
import { ContactPrintLayout, type LinkedPropertyForPrint, type AppointmentForPrint } from "@/components/contacts/ContactPrintLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "lucide-react";

export default function ContactPrintPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contact, isLoading, isError } = useContact(id);
  const { data: interactions = [] } = useInteractions(id);
  const { data: allProperties = [] } = useProperties();
  const { data: appointments = [] } = useAppointments();

  const linkedProperties: LinkedPropertyForPrint[] = (contact?.contact_property_links ?? [])
    .map((link) => {
      const property = allProperties.find((p) => p.id === link.property_id);
      return property
        ? {
            id: link.id!,
            property_id: link.property_id,
            role: link.role ?? null,
            notes: link.notes ?? null,
            property: {
              id: property.id,
              address_line1: property.address_line1 ?? null,
              address_line2: property.address_line2 ?? null,
              city: property.city ?? null,
              state: property.state ?? null,
              postcode: property.postcode ?? null,
              country: property.country ?? null,
              property_type: property.property_type ?? null,
              bedrooms: property.bedrooms ?? null,
              bathrooms: property.bathrooms ?? null,
              price: property.price ?? null,
            },
          }
        : null;
    })
    .filter(Boolean) as LinkedPropertyForPrint[];

  const contactAppointments: AppointmentForPrint[] = (appointments ?? [])
    .filter((apt) => apt.contact_id === id)
    .map((apt) => ({
      id: apt.id,
      title: apt.title ?? null,
      date: apt.date,
      location: apt.location ?? null,
    }));

  if (isLoading) {
    return (
      <div className="contact-print-page">
        <div className="print-page-chrome print-only-hide">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="contact-print-document">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !contact) {
    return (
      <div className="contact-print-page">
        <div className="print-page-chrome print-only-hide">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <p className="p-6 text-muted-foreground">Contact not found.</p>
      </div>
    );
  }

  return (
    <div className="contact-print-page">
      <div className="print-page-chrome print-only-hide">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="gap-2">
          <X className="w-4 h-4" /> Close
        </Button>
      </div>
      <ContactPrintLayout
        contact={contact}
        interactions={interactions}
        linkedProperties={linkedProperties}
        contactAppointments={contactAppointments}
      />
    </div>
  );
}
