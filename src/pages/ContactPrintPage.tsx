/**
 * Standalone print view for a contact. Rendered without MainLayout so it can
 * be opened in an iframe for print preview or in a new window for printing.
 * No sidebar or app chrome.
 */
import { useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { THEME_HTML_CLASSES } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { useContact } from "@/hooks/useContact";
import { useProperties } from "@/hooks/useProperties";
import {
  useNurtureEnrollmentsForContact,
  useNurtureSequencesList,
} from "@/hooks/useNurtureSequences";
import {
  ContactPrintLayout,
  type LinkedPropertyForPrint,
  type NurtureJourneyForPrint,
} from "@/components/contacts/ContactPrintLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "lucide-react";

export default function ContactPrintPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  /**
   * Always use light theme tokens for this route so the iframe / new-tab preview looks like paper,
   * not the app’s dark palette. (Print @media rules also force white; this fixes on-screen preview.)
   */
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove(...([...THEME_HTML_CLASSES] as string[]));
    html.classList.add("light");
  }, []);
  const { data: contact, isLoading, isError } = useContact(id);
  const { data: allProperties = [] } = useProperties();
  const { data: enrollments = [] } = useNurtureEnrollmentsForContact(id);
  const { data: sequencesList = [] } = useNurtureSequencesList();

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

  const nurtureJourneys: NurtureJourneyForPrint[] = useMemo(() => {
    const seqMap = new Map(sequencesList.map((s) => [s.id, s]));
    return enrollments.map((e) => {
      const seq = seqMap.get(e.sequence_id);
      const steps = (seq?.steps ?? [])
        .slice()
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((st) => ({
          title: st.title ?? `Step ${(st.sort_order ?? 0) + 1}`,
          stepType: st.step_type ?? null,
        }));
      return {
        enrollmentId: e.id,
        sequenceName: seq?.name?.trim() || "Sequence",
        sequenceDescription: seq?.description?.trim() ?? null,
        startedAt: e.started_at,
        nextStepAt: e.next_step_at,
        currentStepIndex: e.current_step_index,
        totalSteps: steps.length,
        pauseFollowupCadence: Boolean(e.pause_followup_cadence),
        pauseReason: e.pause_reason ?? null,
        steps,
      };
    });
  }, [enrollments, sequencesList]);

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
        linkedProperties={linkedProperties}
        nurtureJourneys={nurtureJourneys}
      />
    </div>
  );
}
