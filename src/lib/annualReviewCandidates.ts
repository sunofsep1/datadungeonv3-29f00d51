/** Contacts the annual-review engine typically seeds from (see `seed_january_annual_reviews`). */
export function contactInAnnualReviewPool(contactCategory: string | null | undefined): boolean {
  const c = String(contactCategory ?? "")
    .trim()
    .toLowerCase();
  return c === "top_100" || c === "past_client";
}

/**
 * True when the contact should appear on the "annual review candidates" smart list:
 * in the review pool and either has no review row for the year yet, or only a `pending` row.
 */
export function isAnnualReviewSchedulingCandidate(
  contactCategory: string | null | undefined,
  reviewStatusForYear: string | undefined,
): boolean {
  if (!contactInAnnualReviewPool(contactCategory)) return false;
  if (reviewStatusForYear == null || reviewStatusForYear === "") return true;
  return reviewStatusForYear === "pending";
}
