import type { ContactSubscriptionKind } from "@/lib/contactSubscriptions";

export type ContactClassFilterState = {
  includeClassIds: string[];
  excludeClassIds: string[];
  /** Reapit: match ALL included classes vs ANY */
  includeMatch: "any" | "all";
};

export type ContactSubscriptionFilterState = {
  kind: ContactSubscriptionKind | "all";
  mode: "any" | "subscribed" | "not_subscribed";
};

export function contactPassesClassFilter(
  contactId: string,
  filter: ContactClassFilterState,
  classIdsByContact: Map<string, Set<string>>,
): boolean {
  const assigned = classIdsByContact.get(contactId) ?? new Set<string>();

  if (filter.excludeClassIds.some((id) => assigned.has(id))) {
    return false;
  }

  if (filter.includeClassIds.length === 0) {
    return true;
  }

  if (filter.includeMatch === "all") {
    return filter.includeClassIds.every((id) => assigned.has(id));
  }

  return filter.includeClassIds.some((id) => assigned.has(id));
}

export function contactPassesSubscriptionFilter(
  contactId: string,
  filter: ContactSubscriptionFilterState,
  subscriptionsByContact: Map<string, Map<ContactSubscriptionKind, boolean>>,
): boolean {
  if (filter.kind === "all" && filter.mode === "any") {
    return true;
  }

  const subs = subscriptionsByContact.get(contactId);
  if (filter.kind === "all") {
    if (filter.mode === "subscribed") {
      return subs != null && [...subs.values()].some(Boolean);
    }
    if (filter.mode === "not_subscribed") {
      return subs == null || ![...subs.values()].some(Boolean);
    }
    return true;
  }

  const subscribed = subs?.get(filter.kind) ?? false;
  if (filter.mode === "subscribed") return subscribed;
  if (filter.mode === "not_subscribed") return !subscribed;
  return true;
}

export function hasActiveClassFilters(filter: ContactClassFilterState): boolean {
  return filter.includeClassIds.length > 0 || filter.excludeClassIds.length > 0;
}

export function hasActiveSubscriptionFilters(filter: ContactSubscriptionFilterState): boolean {
  return filter.kind !== "all" || filter.mode !== "any";
}
