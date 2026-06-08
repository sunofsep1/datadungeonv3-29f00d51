import { listingKanbanColumnId } from "@/lib/listingKanbanStages";

/**
 * Agentbox/Reapit model: appraisals and listings are distinct work modes on the same property journey.
 * DataDungeon stores both as rows in `listings`, distinguished by `pipeline_stage`:
 * - `appraisal` → Appraisals hub (open appraisal / pre-listing stock)
 * - `listing` and beyond → Listings sales board (listed through settled)
 *
 * The separate `pricing_analyses` table is CMA/pricing intelligence — not the same as pipeline appraisals.
 */

export type AppraisalListingFilterSource = {
  pipeline_stage?: string | null;
  status?: string | null;
};

/** True when listing is in appraisal/prep pipeline stage and not withdrawn. */
export function isAppraisalPipelineListing(listing: AppraisalListingFilterSource): boolean {
  if (String(listing.status ?? "active").toLowerCase() === "withdrawn") return false;
  return listingKanbanColumnId(listing.pipeline_stage) === "appraisal";
}

export function filterAppraisalPipelineListings<T extends AppraisalListingFilterSource>(listings: T[]): T[] {
  return listings.filter(isAppraisalPipelineListing);
}

/** User-facing noun for a CRM property record at this pipeline stage. */
export function pipelineRecordNoun(pipelineStage: string | null | undefined): "Appraisal" | "Listing" {
  return listingKanbanColumnId(pipelineStage) === "appraisal" ? "Appraisal" : "Listing";
}

/** List hub route for a property record at this pipeline stage. */
export function pipelineDetailBackPath(pipelineStage: string | null | undefined): "/appraisals" | "/listings" {
  return listingKanbanColumnId(pipelineStage) === "appraisal" ? "/appraisals" : "/listings";
}
