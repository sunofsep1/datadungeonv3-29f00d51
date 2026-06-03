import { Card } from "@/components/ui/card";
import { ContactAmlPanel, type ContactAmlFields } from "@/components/contacts/ContactAmlPanel";
import { ContactClassesSubscriptionsPanel } from "@/components/contacts/ContactClassesSubscriptionsPanel";
import { ContactOutreachPreferences } from "@/components/contacts/ContactOutreachPreferences";
import { ContactScorePanel } from "@/components/contacts/ContactScorePanel";
import { LeadClassificationPanel, type ClassificationRecord } from "@/components/contacts/LeadClassificationPanel";
import type { ContactWithMeta } from "@/hooks/useContacts";

type Props = {
  contactId: string;
  contact: ContactWithMeta;
  onUpdated?: () => void;
};

export function ContactCrmSettingsPanel({ contactId, contact, onUpdated }: Props) {
  const aml: ContactAmlFields = {
    id: contact.id,
    aml_id_verified: (contact as { aml_id_verified?: boolean }).aml_id_verified,
    aml_verified_at: (contact as { aml_verified_at?: string | null }).aml_verified_at,
    aml_pep_clear: (contact as { aml_pep_clear?: boolean }).aml_pep_clear,
    aml_notes: (contact as { aml_notes?: string | null }).aml_notes,
  };

  return (
    <div className="space-y-5">
      <Card className="zoho-card border-border/80 bg-muted/15 p-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          CRM settings power smart lists, nurture auto-enroll, and compliance tracking. They stay out of the
          main profile so day-to-day contact details stay front and centre.
        </p>
      </Card>

      <LeadClassificationPanel mode="contact" entityId={contactId} record={contact as ClassificationRecord} />
      <ContactScorePanel contactId={contactId} />
      <ContactAmlPanel contact={aml} />
      <ContactOutreachPreferences contact={contact} onUpdated={onUpdated} />
      <ContactClassesSubscriptionsPanel contactId={contactId} />
    </div>
  );
}
