import { ContactPropertiesCard } from "../ContactPropertiesCard";

interface PropertiesTabProps {
  contactId: string | null;
  onLinkPropertyClick: () => void;
  onViewProperty?: (propertyId: string) => void;
  onOpenChange?: (open: boolean) => void;
}

/** Tab content: linked properties for a contact (reuses ContactPropertiesCard). */
export function PropertiesTab({
  contactId,
  onLinkPropertyClick,
  onViewProperty,
  onOpenChange,
}: PropertiesTabProps) {
  return (
    <div className="py-4">
      <ContactPropertiesCard
        contactId={contactId}
        onOpenChange={onOpenChange}
        onLinkPropertyClick={onLinkPropertyClick}
        onViewProperty={onViewProperty}
      />
    </div>
  );
}
