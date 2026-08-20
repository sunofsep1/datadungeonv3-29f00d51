// Marketing Studio — Canva design generation from listing data.
//
// The app raises design_requests rows (status='pending'); the Canva-connected
// assistant sweeps them, generates candidates, and writes results back. The UI
// here only builds briefs and displays progress — no Canva credentials in-app.

export type DesignRequestKind =
  | "social_post"
  | "just_listed"
  | "open_home"
  | "price_update"
  | "sold"
  | "flyer"
  | "custom";

export type DesignRequestStatus =
  | "pending"
  | "generating"
  | "candidates_ready"
  | "selected"
  | "created"
  | "failed"
  | "cancelled";

export type DesignCandidate = {
  candidate_id: string;
  url: string;
  thumbnail_url: string | null;
};

export type DesignRequest = {
  id: string;
  user_id: string;
  listing_id: string | null;
  kind: DesignRequestKind;
  brief: string;
  status: DesignRequestStatus;
  candidates: DesignCandidate[] | null;
  selected_candidate_id: string | null;
  design_id: string | null;
  design_url: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export const DESIGN_KINDS: Array<{ key: DesignRequestKind; label: string; blurb: string }> = [
  { key: "just_listed", label: "Just Listed", blurb: "Announcement post for a fresh listing" },
  { key: "social_post", label: "Social post", blurb: "General Instagram/Facebook square post" },
  { key: "open_home", label: "Open home", blurb: "Inspection time promo" },
  { key: "price_update", label: "Price update", blurb: "New price announcement" },
  { key: "sold", label: "Sold", blurb: "Sold celebration post" },
  { key: "flyer", label: "Flyer (A4)", blurb: "Print flyer / letterbox drop" },
];

export const DESIGN_STATUS_LABEL: Record<DesignRequestStatus, string> = {
  pending: "Queued",
  generating: "Generating…",
  candidates_ready: "Pick a design",
  selected: "Creating design…",
  created: "Ready",
  failed: "Failed",
  cancelled: "Cancelled",
};

const BRAND =
  "Elegant, premium style matching Queensland Sotheby's International Realty branding: deep navy (#0e2140) with gold (#b08d3f) accents, serif headline font, sophisticated minimal high-end look.";
const AGENT = "Greg Leigh 0466 805 992";

export type ListingBriefInput = {
  address: string | null;
  bedrooms: number | null;
  bathrooms: string | number | null;
  property_type: string | null;
  display_price: string | null;
  quote_price: string | null;
  marketing_headline: string | null;
  campaign_next_inspection_at: string | null;
};

function shortAddress(address: string | null): string {
  if (!address) return "the property";
  return address.replace(/,?\s*(Qld|QLD|Queensland)[^,]*$/i, "").replace(/, Australia$/i, "").trim();
}

function specLine(l: ListingBriefInput): string {
  const parts: string[] = [];
  if (l.bedrooms) parts.push(`${l.bedrooms} BED`);
  if (l.bathrooms) parts.push(`${l.bathrooms} BATH`);
  if (l.property_type) parts.push(l.property_type.toUpperCase());
  return parts.join(" · ");
}

function inspectionLine(l: ListingBriefInput): string | null {
  if (!l.campaign_next_inspection_at) return null;
  const d = new Date(l.campaign_next_inspection_at);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Brisbane",
  });
}

export function buildListingBrief(kind: DesignRequestKind, l: ListingBriefInput): string {
  const addr = shortAddress(l.address);
  const specs = specLine(l);
  const price = l.display_price || l.quote_price;
  const headline = l.marketing_headline;
  const inspect = inspectionLine(l);

  const base = (format: string, mainText: string) =>
    `${format} for a luxury real estate listing: "${addr}"${headline ? ` — ${headline}` : ""}. ` +
    `Text on design: ${mainText}${specs ? `, "${specs}"` : ""}${price ? `, price "${price}"` : ""}, and "${AGENT}". ${BRAND}`;

  switch (kind) {
    case "just_listed":
      return base("Instagram post (square)", `"JUST LISTED", the address "${addr}"`);
    case "open_home":
      return base(
        "Instagram post (square)",
        `"OPEN HOME${inspect ? ` — ${inspect}` : ""}", the address "${addr}"`,
      );
    case "price_update":
      return base("Instagram post (square)", `"NEW PRICE", the address "${addr}"`);
    case "sold":
      return base("Instagram post (square)", `"SOLD", the address "${addr}", "Another one sold by Greg Leigh"`);
    case "flyer":
      return base("A4 print flyer", `"FOR SALE", the address "${addr}"`);
    case "social_post":
    default:
      return base("Instagram post (square)", `"FOR SALE", the address "${addr}"`);
  }
}
