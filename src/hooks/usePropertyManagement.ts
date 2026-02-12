import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useContact } from "./useContact";
import { useProperty } from "./useProperties";
import {
  useCreateContactPropertyLink,
  useDeleteContactPropertyLink,
  type ContactPropertyLinkInsert,
} from "./useContactPropertyLinks";
import type { PropertyWithLinks } from "./useProperties";

/** Link row with nested property (from useContact select) */
export type ContactPropertyLinkWithProperty = {
  id: string;
  contact_id: string;
  property_id: string;
  role: string;
  notes: string | null;
  property: PropertyWithLinks | Record<string, unknown> | null;
};

/** Link row with nested contact (from useProperty select) */
export type PropertyContactLinkWithContact = {
  id: string;
  contact_id: string;
  property_id: string;
  role: string;
  notes: string | null;
  contact: { id: string; name: string; email: string | null; phone: string | null } | null;
};

/** Get properties linked to a contact (derived from useContact) */
export function useContactProperties(contactId: string | undefined) {
  const { data: contact, ...rest } = useContact(contactId);
  const links: ContactPropertyLinkWithProperty[] =
    contact?.contact_property_links?.map((link: { id?: string; property_id: string; role?: string; notes?: string | null; [key: string]: unknown }) => ({
      id: (link.id as string) ?? "",
      contact_id: contactId ?? "",
      property_id: link.property_id,
      role: (link.role as string) ?? "owner",
      notes: (link.notes as string | null) ?? null,
      property: (link.properties as PropertyWithLinks) ?? null,
    })) ?? [];
  return {
    data: links,
    contact,
    ...rest,
  };
}

/** Get contacts linked to a property (derived from useProperty) */
export function usePropertyContacts(propertyId: string | undefined) {
  const { data: property, ...rest } = useProperty(propertyId);
  const links: PropertyContactLinkWithContact[] =
    property?.contact_property_links?.map((link) => ({
      id: link.id,
      contact_id: link.contact_id,
      property_id: link.property_id,
      role: link.role,
      notes: link.notes ?? null,
      contact: link.contacts ?? null,
    })) ?? [];
  return {
    data: links,
    property,
    ...rest,
  };
}

/** Link a property to a contact (wraps useCreateContactPropertyLink) */
export function useLinkPropertyToContact() {
  return useCreateContactPropertyLink();
}

/** Unlink a property from a contact (wraps useDeleteContactPropertyLink) */
export function useRemovePropertyLink() {
  return useDeleteContactPropertyLink();
}
