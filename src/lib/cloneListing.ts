import type { Listing, ListingInsert } from "@/hooks/useListings";

const RESET_ON_CLONE = [
  "campaign_enquiry_count",
  "campaign_inspection_count",
  "campaign_offers_count",
  "key_date_listed",
  "key_date_agency_expiry",
  "key_date_settlement",
  "key_date_unconditional",
  "key_date_exchange",
  "campaign_start_at",
] as const;

/** Build insert payload for Reapit-style "Clone this listing". */
export function buildListingClonePayload(source: Listing): Omit<ListingInsert, "user_id"> {
  const {
    id: _id,
    created_at: _ca,
    updated_at: _ua,
    user_id: _uid,
    ...rest
  } = source as Listing & Record<string, unknown>;

  const payload = { ...rest } as Record<string, unknown>;

  for (const key of RESET_ON_CLONE) {
    if (key in payload) {
      if (key.endsWith("_count")) payload[key] = 0;
      else payload[key] = null;
    }
  }

  const address = (source.address ?? "").trim();
  payload.address = address
    ? address.includes("(copy)")
      ? address
      : `${address} (copy)`
    : "Listing (copy)";

  payload.pipeline_stage = "appraisal";
  payload.status = "active";

  return payload as Omit<ListingInsert, "user_id">;
}
