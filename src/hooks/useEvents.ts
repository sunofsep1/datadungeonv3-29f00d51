import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCreateInteraction } from "./useInteractions";

/**
 * Event logging system for tracking key actions in the CRM.
 * This provides a foundation for future automation and webhooks.
 */

export type EventType =
  | "contact.created"
  | "contact.updated"
  | "contact.status_changed"
  | "listing.created"
  | "listing.stage_moved"
  | "property.created"
  | "property.linked";

export interface EventData {
  type: EventType;
  entityId: string;
  entityType: "contact" | "listing" | "property";
  metadata?: Record<string, any>;
}

/**
 * Hook to log events as interactions (for now)
 * In the future, this could emit to a dedicated events table or webhook
 */
export function useLogEvent() {
  const createInteraction = useCreateInteraction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: EventData & { contactId?: string }) => {
      // For now, log as interaction if contactId is provided
      // Future: could create dedicated events table or call webhook
      if (event.contactId) {
        const subject = getEventSubject(event.type, event.metadata);
        const body = getEventBody(event.type, event.metadata);
        
        await createInteraction.mutateAsync({
          contact_id: event.contactId,
          type: "note",
          channel: "system",
          subject,
          body: body || null,
        });
      }
      
      // Invalidate relevant queries
      if (event.entityType === "contact") {
        queryClient.invalidateQueries({ queryKey: ["contacts"] });
        queryClient.invalidateQueries({ queryKey: ["contact", event.entityId] });
      } else if (event.entityType === "listing") {
        queryClient.invalidateQueries({ queryKey: ["listings"] });
      } else if (event.entityType === "property") {
        queryClient.invalidateQueries({ queryKey: ["properties"] });
      }
      
      return event;
    },
  });
}

function getEventSubject(type: EventType, metadata?: Record<string, any>): string {
  switch (type) {
    case "contact.created":
      return "Contact created";
    case "contact.updated":
      return "Contact updated";
    case "contact.status_changed":
      return `Status changed: ${metadata?.oldStatus || ""} → ${metadata?.newStatus || ""}`;
    case "listing.created":
      return "Deal added to pipeline";
    case "listing.stage_moved":
      return `Pipeline stage: ${metadata?.oldStage || ""} → ${metadata?.newStage || ""}`;
    case "property.created":
      return "Property added";
    case "property.linked":
      return "Property linked to contact";
    default:
      return "Event logged";
  }
}

function getEventBody(type: EventType, metadata?: Record<string, any>): string | null {
  switch (type) {
    case "contact.status_changed":
      return metadata?.reason || null;
    case "listing.stage_moved":
      return metadata?.address ? `Deal: ${metadata.address}` : null;
    case "property.linked":
      return metadata?.propertyAddress || null;
    default:
      return null;
  }
}

/**
 * Helper to log contact status change
 */
export function useLogContactStatusChange() {
  const logEvent = useLogEvent();
  
  return {
    logStatusChange: async (
      contactId: string,
      oldStatus: string | null,
      newStatus: string
    ) => {
      await logEvent.mutateAsync({
        type: "contact.status_changed",
        entityId: contactId,
        entityType: "contact",
        contactId,
        metadata: { oldStatus, newStatus },
      });
    },
  };
}

/**
 * Helper to log listing stage movement
 */
export function useLogListingStageMove() {
  const logEvent = useLogEvent();
  
  return {
    logStageMove: async (
      listingId: string,
      contactId: string | null | undefined,
      oldStage: string | null,
      newStage: string,
      address: string
    ) => {
      if (contactId) {
        await logEvent.mutateAsync({
          type: "listing.stage_moved",
          entityId: listingId,
          entityType: "listing",
          contactId,
          metadata: { oldStage, newStage, address },
        });
      }
    },
  };
}
