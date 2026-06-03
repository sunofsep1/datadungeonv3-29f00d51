import { useCreateProperty } from "@/hooks/useProperties";
import { useCreateContactPropertyLink } from "@/hooks/useContactPropertyLinks";

export interface ContactAddressInput {
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  country?: string | null;
}

export function useCreatePropertyFromContactAddress() {
  const createProperty = useCreateProperty();
  const createLink = useCreateContactPropertyLink();

  const createAndLink = async (input: { contact_id: string; address: ContactAddressInput; role?: string; notes?: string | null }) => {
    const hasAddress = Boolean(input.address.address_line1?.trim());
    if (!hasAddress) {
      throw new Error("Address line 1 is required to create a property.");
    }

    const property = await createProperty.mutateAsync({
      address_line1: input.address.address_line1?.trim() || null,
      address_line2: input.address.address_line2?.trim() || null,
      city: input.address.city?.trim() || null,
      state: input.address.state?.trim() || null,
      postcode: input.address.postcode?.trim() || null,
      country: input.address.country?.trim() || "Australia",
    });

    await createLink.mutateAsync({
      contact_id: input.contact_id,
      property_id: property.id,
      role: input.role ?? "owner",
      notes: input.notes ?? null,
    });

    return property;
  };

  return {
    createAndLink,
    isPending: createProperty.isPending || createLink.isPending,
  };
}

