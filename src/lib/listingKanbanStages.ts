/** Canonical `listings.pipeline_stage` slugs for sales kanban + journey sync. */
export const LISTING_KANBAN_COLUMN_IDS = [
  "appraisal",
  "listing",
  "under_contract",
  "unconditional",
  "settled",
  "past_client",
] as const;

export type ListingKanbanColumnId = (typeof LISTING_KANBAN_COLUMN_IDS)[number];

/** Labels for `pipeline_stage` selects (matches sales board columns). */
export const LISTING_PIPELINE_STAGE_OPTIONS: { id: ListingKanbanColumnId; label: string }[] = [
  { id: "appraisal", label: "Appraisal / prep" },
  { id: "listing", label: "Listed" },
  { id: "under_contract", label: "Under contract" },
  { id: "unconditional", label: "Unconditional" },
  { id: "settled", label: "Settled" },
  { id: "past_client", label: "Past client" },
];

/**
 * Map stored `pipeline_stage` to a kanban column. Unknown values fall back to appraisal.
 */
export function listingKanbanColumnId(pipelineStage: string | null | undefined): ListingKanbanColumnId {
  const raw = (pipelineStage || "appraisal").toLowerCase().replace(/\s+/g, "_");
  if (raw === "new") return "appraisal";
  if (raw === "prep") return "appraisal";
  if (raw === "negotiation") return "listing";
  if ((LISTING_KANBAN_COLUMN_IDS as readonly string[]).includes(raw)) return raw as ListingKanbanColumnId;
  return "appraisal";
}
