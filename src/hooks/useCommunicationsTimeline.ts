import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLog, type ActivityLogRow } from "@/hooks/useActivityLog";
import { useInteractions, type Interaction } from "@/hooks/useInteractions";
import { useAppointmentsByContact } from "@/hooks/useAppointments";
import {
  mergeCommunicationsTimeline,
  type SmsOutboundRow,
  type UnifiedCommItem,
} from "@/lib/communicationsTimeline";
import { supabaseErrorMessage } from "@/lib/supabaseErrorMessage";

type Params = {
  contactId?: string | null;
  propertyId?: string | null;
  listingId?: string | null;
  /** Extra contact IDs to include SMS/interactions for (e.g. listing people). */
  linkedContactIds?: string[];
  includeAppointments?: boolean;
  unifiedComms?: boolean;
  limit?: number;
};

async function fetchSmsForContacts(contactIds: string[]): Promise<SmsOutboundRow[]> {
  if (!contactIds.length) return [];
  const { data, error } = await supabase
    .from("sms_outbound")
    .select("id, contact_id, to_phone, body_preview, status, created_at")
    .in("contact_id", contactIds)
    .order("created_at", { ascending: false })
    .limit(120);
  if (error) {
    if (error.code === "42P01") return [];
    throw new Error(supabaseErrorMessage(error));
  }
  return (data ?? []) as SmsOutboundRow[];
}

async function fetchInteractionsForContacts(contactIds: string[]): Promise<Interaction[]> {
  if (!contactIds.length) return [];
  const { data, error } = await supabase
    .from("interactions")
    .select("*")
    .in("contact_id", contactIds)
    .order("timestamp", { ascending: false })
    .limit(120);
  if (error) {
    if (error.code === "42P01") return [];
    throw new Error(supabaseErrorMessage(error));
  }
  return (data ?? []) as Interaction[];
}

export function useCommunicationsTimeline({
  contactId,
  propertyId,
  listingId,
  linkedContactIds = [],
  includeAppointments = false,
  unifiedComms = true,
  limit,
}: Params) {
  const activityFilters =
    contactId != null && contactId !== ""
      ? { contactId }
      : propertyId != null && propertyId !== ""
        ? { propertyId }
        : { listingId };

  const { data: activities = [], isLoading: activitiesLoading } = useActivityLog({
    ...activityFilters,
    limit: limit ?? 120,
  });

  const primaryContactId = contactId ?? null;
  const allContactIds = Array.from(
    new Set([primaryContactId, ...linkedContactIds].filter(Boolean) as string[]),
  );

  const { data: primaryInteractions = [], isLoading: primaryInteractionsLoading } = useInteractions(
    unifiedComms && primaryContactId ? primaryContactId : undefined,
  );

  const { data: linkedBundle = { interactions: [], sms: [] }, isLoading: linkedLoading } = useQuery({
    queryKey: ["communications_linked", allContactIds.join(",")],
    queryFn: async () => {
      const extraIds = allContactIds.filter((id) => id !== primaryContactId);
      const [interactions, sms] = await Promise.all([
        primaryContactId ? [] : fetchInteractionsForContacts(allContactIds),
        fetchSmsForContacts(allContactIds),
      ]);
      const extraInteractions =
        extraIds.length > 0 && primaryContactId
          ? await fetchInteractionsForContacts(extraIds)
          : interactions;
      return { interactions: extraInteractions, sms };
    },
    enabled: unifiedComms && allContactIds.length > 0,
  });

  const { data: contactAppointments = [], isLoading: appointmentsLoading } = useAppointmentsByContact(
    includeAppointments && primaryContactId ? primaryContactId : null,
    limit ?? 120,
  );

  const items: UnifiedCommItem[] = mergeCommunicationsTimeline(
    activities as ActivityLogRow[],
    unifiedComms
      ? [
          ...primaryInteractions,
          ...(linkedBundle.interactions ?? []),
        ]
      : [],
    unifiedComms ? (linkedBundle.sms ?? []) : [],
    includeAppointments && unifiedComms
      ? contactAppointments.map((a) => ({
          id: a.id,
          title: a.title,
          date: a.date,
          location: a.location ?? null,
        }))
      : [],
  );

  const capped = limit ? items.slice(0, limit) : items;

  return {
    items: capped,
    isLoading:
      activitiesLoading ||
      primaryInteractionsLoading ||
      linkedLoading ||
      (includeAppointments && appointmentsLoading),
  };
}
