import type { Json } from "@/integrations/supabase/types";

export const CONTACTS_SAVED_VIEW_V = 1 as const;
export const TASKS_SAVED_VIEW_V = 1 as const;
export const REQUIREMENTS_SEARCH_SAVED_VIEW_V = 1 as const;

/** Serializable contacts list state (v1). */
export type ContactsSavedViewPayloadV1 = {
  v: typeof CONTACTS_SAVED_VIEW_V;
  smart: string | null;
  searchQuery: string;
  filterTagIds: string[];
  filterSource: string;
  sortBy: string;
  filterHasProperty: boolean | null;
  filterLastTouched: string;
  filterLeadTemperature: string;
  filterTimeframeCategory: string;
  filterRoleCategory: string;
  filterContactClassification: string;
  filterNoNextTouch: boolean;
  filterAutomationBlocked: boolean;
  filterBirthdaysUpcoming: boolean;
  filterAnnualReviewCandidates: boolean;
  filterIncludeClassIds: string[];
  filterExcludeClassIds: string[];
  filterClassIncludeMatch: "any" | "all";
  filterSubscriptionKind: string;
  filterSubscriptionMode: "any" | "subscribed" | "not_subscribed";
  contactView: "list" | "grid";
  itemsPerPage: number;
};

export type TasksSavedViewPayloadV1 = {
  v: typeof TASKS_SAVED_VIEW_V;
  mainTab: "appointments" | "todos";
  appointmentsFilter: "all" | "today" | "upcoming" | "overdue" | "this_week";
};

export type RequirementsSearchSavedPayloadV1 = {
  v: typeof REQUIREMENTS_SEARCH_SAVED_VIEW_V;
  action: string;
  state: string;
  suburbs: string;
  priceMin: string;
  priceMax: string;
  bedsMin: string;
  bathsMin: string;
  parkingMin: string;
  landMin: string;
  landMax: string;
  buildingMin: string;
  buildingMax: string;
  propertyType: string;
  featuresRequired: string[];
  excludeMissing: boolean;
};

export function parseContactsSavedViewPayload(raw: unknown): ContactsSavedViewPayloadV1 | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== CONTACTS_SAVED_VIEW_V) return null;
  if (typeof o.searchQuery !== "string") return null;
  if (!Array.isArray(o.filterTagIds) || !o.filterTagIds.every((x) => typeof x === "string")) return null;
  if (typeof o.filterSource !== "string") return null;
  if (typeof o.sortBy !== "string") return null;
  const contactView = o.contactView === "grid" ? "grid" : "list";
  const itemsPerPage = typeof o.itemsPerPage === "number" && o.itemsPerPage > 0 ? Math.min(200, o.itemsPerPage) : 25;
  return {
    v: CONTACTS_SAVED_VIEW_V,
    smart: typeof o.smart === "string" || o.smart === null ? (o.smart as string | null) : null,
    searchQuery: o.searchQuery,
    filterTagIds: o.filterTagIds as string[],
    filterSource: o.filterSource,
    sortBy: o.sortBy,
    filterHasProperty:
      o.filterHasProperty === true || o.filterHasProperty === false ? o.filterHasProperty : null,
    filterLastTouched: typeof o.filterLastTouched === "string" ? o.filterLastTouched : "all",
    filterLeadTemperature: typeof o.filterLeadTemperature === "string" ? o.filterLeadTemperature : "all",
    filterTimeframeCategory:
      typeof o.filterTimeframeCategory === "string" ? o.filterTimeframeCategory : "all",
    filterRoleCategory: typeof o.filterRoleCategory === "string" ? o.filterRoleCategory : "all",
    filterContactClassification:
      typeof o.filterContactClassification === "string" ? o.filterContactClassification : "all",
    filterNoNextTouch: Boolean(o.filterNoNextTouch),
    filterAutomationBlocked: Boolean(o.filterAutomationBlocked),
    filterBirthdaysUpcoming: Boolean(o.filterBirthdaysUpcoming),
    filterAnnualReviewCandidates: Boolean(o.filterAnnualReviewCandidates),
    filterIncludeClassIds: Array.isArray(o.filterIncludeClassIds)
      ? o.filterIncludeClassIds.filter((x): x is string => typeof x === "string")
      : [],
    filterExcludeClassIds: Array.isArray(o.filterExcludeClassIds)
      ? o.filterExcludeClassIds.filter((x): x is string => typeof x === "string")
      : [],
    filterClassIncludeMatch: o.filterClassIncludeMatch === "all" ? "all" : "any",
    filterSubscriptionKind: typeof o.filterSubscriptionKind === "string" ? o.filterSubscriptionKind : "all",
    filterSubscriptionMode:
      o.filterSubscriptionMode === "subscribed" || o.filterSubscriptionMode === "not_subscribed"
        ? o.filterSubscriptionMode
        : "any",
    contactView,
    itemsPerPage,
  };
}

export function parseTasksSavedViewPayload(raw: unknown): TasksSavedViewPayloadV1 | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== TASKS_SAVED_VIEW_V) return null;
  const mainTab = o.mainTab === "todos" ? "todos" : "appointments";
  const af = o.appointmentsFilter;
  const appointmentsFilter =
    af === "today" || af === "upcoming" || af === "overdue" || af === "this_week" ? af : "all";
  return { v: TASKS_SAVED_VIEW_V, mainTab, appointmentsFilter };
}

export function parseRequirementsSearchSavedPayload(
  raw: unknown,
): RequirementsSearchSavedPayloadV1 | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== REQUIREMENTS_SEARCH_SAVED_VIEW_V) return null;
  return {
    v: REQUIREMENTS_SEARCH_SAVED_VIEW_V,
    action: typeof o.action === "string" ? o.action : "all",
    state: typeof o.state === "string" ? o.state : "QLD",
    suburbs: typeof o.suburbs === "string" ? o.suburbs : "",
    priceMin: typeof o.priceMin === "string" ? o.priceMin : "",
    priceMax: typeof o.priceMax === "string" ? o.priceMax : "",
    bedsMin: typeof o.bedsMin === "string" ? o.bedsMin : "",
    bathsMin: typeof o.bathsMin === "string" ? o.bathsMin : "",
    parkingMin: typeof o.parkingMin === "string" ? o.parkingMin : "",
    landMin: typeof o.landMin === "string" ? o.landMin : "",
    landMax: typeof o.landMax === "string" ? o.landMax : "",
    buildingMin: typeof o.buildingMin === "string" ? o.buildingMin : "",
    buildingMax: typeof o.buildingMax === "string" ? o.buildingMax : "",
    propertyType: typeof o.propertyType === "string" ? o.propertyType : "",
    featuresRequired: Array.isArray(o.featuresRequired)
      ? o.featuresRequired.filter((x): x is string => typeof x === "string")
      : [],
    excludeMissing: o.excludeMissing !== false,
  };
}

export function requirementsSearchPayloadToJson(p: RequirementsSearchSavedPayloadV1): Json {
  return p as unknown as Json;
}

export function contactsPayloadToJson(p: ContactsSavedViewPayloadV1): Json {
  return p as unknown as Json;
}

export function tasksPayloadToJson(p: TasksSavedViewPayloadV1): Json {
  return p as unknown as Json;
}
