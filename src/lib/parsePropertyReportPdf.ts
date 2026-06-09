/**
 * Parse Pricefinder Property Report PDF into structured property data.
 * Extracts text via PDF.js and parses the standard report format.
 */

import { extractRawTextFromPdfFile } from "@/lib/extractPdfText";
import {
  isPlausibleOwnerName,
  isPlausibleOwnerNames,
  joinOwnerNames,
  sanitizeOwnerNamesRaw,
  splitOwnerNames,
} from "@/lib/ownerNameParse";
import { normalizePropertyType } from "@/lib/propertyType";

export { isPlausibleOwnerName, isPlausibleOwnerNames } from "@/lib/ownerNameParse";

export interface ParsedPropertyReport {
  // Core property fields (map to DB)
  address_line1?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  country?: string;
  property_type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  car_spaces?: number | null;
  price?: number | null;
  estimated_value?: number | null;
  lot_size?: number | null;
  building_size?: number | null;
  notes?: string | null;
  // Report-specific (stored in property_report JSONB)
  lot_plan?: string | null;
  zoning?: string | null;
  land_use?: string | null;
  council?: string | null;
  features?: string[] | null;
  owner_names?: string | null;
  owner_phones?: string[] | null;
  owner_type?: string | null;
  valuation_amount?: number | null;
  valuation_date?: string | null;
  sales_history?: Array<{
    amount?: number;
    date?: string;
    type?: string;
    area?: string;
    vendor?: string;
  }> | null;
  property_id?: string | null;
  ubd_ref?: string | null;
  /** Full label e.g. "House - Freehold [Issuing]" */
  property_type_full?: string | null;
  /** e.g. [{ amount: 560000, date: "30/06/2024" }, { amount: 430000, date: "30/06/2022" }] */
  valuation_amounts?: Array<{ amount: number; date?: string }> | null;
  /** e.g. "$552 ($1,504)" */
  area_per_m2?: string | null;
  water_sewerage?: string | null;
}

function safeTrim(s: string | undefined | null): string {
  return s == null ? "" : String(s).trim();
}

const OWNER_SECTION_HEADER =
  /(?:Owner\s+Details|Owner\s+Type|Owner\s+Address|Owner\s+Occupied|Owner\s+Name(?:\(s\))?)\s+/gi;

function stripOwnerSectionHeaders(value: string): string {
  return safeTrim(value.replace(OWNER_SECTION_HEADER, " "));
}

function trySetOwnerNames(result: ParsedPropertyReport, candidate: string | null | undefined): boolean {
  const sanitized = sanitizeOwnerNamesRaw(candidate);
  if (!sanitized) return false;
  result.owner_names = sanitized;
  return true;
}

function extractOwnerNamesFromText(fullText: string): string | null {
  const NON_NAME_HEADERS = [
    "owner details",
    "property details",
    "property report",
    "owner address",
    "owner occupied",
    "owner type",
  ];

  // 1. Name before "Owner Name(s):" — common Pricefinder print-page layout
  const ownerBeforeLabel = [
    ...fullText.matchAll(/([A-Za-z][A-Za-z\s&.;'-]{2,120})\s+Owner Name\(s\):/gi),
  ];
  if (ownerBeforeLabel.length > 0) {
    const candidate = safeTrim(ownerBeforeLabel[ownerBeforeLabel.length - 1]![1]);
    if (
      candidate &&
      !NON_NAME_HEADERS.some((h) => candidate.toLowerCase().includes(h)) &&
      isPlausibleOwnerNames(candidate)
    ) {
      return candidate;
    }
  }

  // 2. Name after "Owner Name(s):" — skip PDF section headers (Owner Details, Owner Type, …)
  const ownerAfterLabel = fullText.match(
    /Owner Name\(s\):\s*(?:(?:Owner\s+Details|Owner\s+Type|Owner\s+Address|Owner\s+Occupied)\s+)*(?:&\s*|and\s+)?([A-Za-z][A-Za-z\s&.;'-]{2,120}?)\s+(?:Owner\s+Type|Phone|Property|Land|Council|Features|Area|Sales|Postal|Address|Mailing)/i,
  );
  if (ownerAfterLabel?.[1]) {
    const candidate = stripOwnerSectionHeaders(ownerAfterLabel[1]);
    if (isPlausibleOwnerNames(candidate)) {
      return candidate;
    }
  }

  // 3. ALL-CAPS name in Owner Details section — last resort
  const ownerSectionMatch = fullText.match(/Owner Details(.{0,600}?)(?=Property Details|$)/i);
  const ownerSection = ownerSectionMatch?.[1] ?? "";
  if (ownerSection) {
    const capsNameMatch = ownerSection.match(
      /([A-Z][A-Z'-]{1,30}(?:\s+[A-Z][A-Z'-]{1,30}){1,6}(?:\s*[;&]\s*[A-Z][A-Z'-]{1,30}(?:\s+[A-Z][A-Z'-]{1,30}){1,6})*)/,
    );
    if (capsNameMatch?.[1]) {
      const candidate = stripOwnerSectionHeaders(capsNameMatch[1]);
      if (isPlausibleOwnerNames(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

function parseOwnerPhonesFromText(fullText: string): string[] | null {
  const phoneMatch = fullText.match(/Phone\(s\):\s*\^?\s*([\d\s()A-Za-z]+?)(?=\s+(?:N\/A|Owner|Property|Land|Council|Features|Area|Sales|Postal|Address|Mailing|RPD|Valuation)|$)/i);
  if (!phoneMatch?.[1]) return null;

  // Strip directory suffix e.g. "(DUNCAN)" and whitespace before extracting digits
  const segment = String(phoneMatch[1])
    .replace(/\([A-Za-z\s]+\)/g, " ")
    .replace(/\s+/g, "");
  const phones = segment.match(/\d{10,11}/g) || [];
  return phones.length ? phones : null;
}

/** Remove disclaimer and long boilerplate from parsed text so only main points are kept */
function stripDisclaimerAndTruncate(s: string | undefined | null, maxLen = 200): string | null {
  if (s == null || typeof s !== "string") return null;
  let t = safeTrim(s);
  const stopPhrases = [
    "The materials are provided as an information source only",
    "Based on or contains data provided by the State of Queensland",
    "Department of Resources",
    "no warranty in relation to the data",
    "propertydatacodeofconduct.com.au",
    "Prepared on ",
    "Property Data Solutions",
    "© ",
  ];
  for (const phrase of stopPhrases) {
    const i = t.indexOf(phrase);
    if (i !== -1) t = t.slice(0, i).trim();
  }
  if (t.length > maxLen) t = t.slice(0, maxLen).trim();
  return t.length ? t : null;
}

function parseNumberFromText(s: string | undefined | null): number | null {
  if (s == null) return null;
  const m = String(s).replace(/[$,]/g, "").match(/[\d.]+/);
  return m ? parseFloat(m) : null;
}

function parseAddressParts(fullAddress: string | undefined | null): {
  address_line1?: string;
  city?: string;
  state?: string;
  postcode?: string;
} {
  if (fullAddress == null || typeof fullAddress !== "string") return {};
  // e.g. "145 MILL STREET, REDLAND BAY, QLD 4165"
  const parts = fullAddress.split(",").map((p) => safeTrim(p));
  if (parts.length >= 3) {
    const last = parts[parts.length - 1];
    const postcodeMatch = last.match(/([A-Z]{2,4})\s+(\d{4})/);
    return {
      address_line1: parts[0] || undefined,
      city: parts[1] || undefined,
      state: postcodeMatch ? postcodeMatch[1] : parts[2] || undefined,
      postcode: postcodeMatch ? postcodeMatch[2] : last?.match(/\d{4}/)?.[0] || undefined,
    };
  }
  if (parts.length === 2) {
    return {
      address_line1: parts[0],
      city: parts[1],
      state: undefined,
      postcode: undefined,
    };
  }
  return { address_line1: fullAddress || undefined };
}

/**
 * Parse Pricefinder Property Report text into structured data.
 */
export function parsePropertyReportText(text: string | undefined | null): ParsedPropertyReport {
  const result: ParsedPropertyReport = { country: "Australia" };
  if (text == null || typeof text !== "string") return result;
  const fullText = text.replace(/\s+/g, " ");

  // Address: "145 MILL STREET, REDLAND BAY, QLD 4165" - use full match (regex has no capturing group)
  const addrMatch = fullText.match(
    /\d+[\s\w]+(?:STREET|ROAD|AVENUE|DRIVE|PLACE|COURT|LANE|CRESCENT|PARADE|WAY|TERRACE|BOULEVARD|CLOSE|CRT|ST|RD|AVE|DR|PL|CT|LN|CRES|TCE|BLVD|CL)(?:\s+OF)?[,.\s]+[\w\s]+(?:,\s*)?(?:QLD|NSW|VIC|WA|SA|TAS|NT|ACT)\s*\d{4}/i
  );
  if (addrMatch?.[0]) {
    let addr = safeTrim(addrMatch[0]);
    addr = addr.replace(/\b(DRIVE|ROAD|STREET|AVENUE|LANE|COURT|PLACE|PARADE|WAY|TERRACE|CLOSE)\s+OF,/i, "$1,");
    const parts = parseAddressParts(addr.replace(/\s+/g, " "));
    result.address_line1 = parts.address_line1;
    result.city = parts.city;
    result.state = parts.state;
    result.postcode = parts.postcode;
  }

  // Fallback: look for "NUMBER STREET, SUBURB, STATE POSTCODE" - exclude "PROPERTY REPORT"
  const altAddr = fullText.match(/(\d+[\s\w]+(?:STREET|ROAD|AVE|RD|ST|DR|PL|CT)[,.\s][\w\s]+(?:QLD|NSW|VIC|WA|SA|TAS|NT|ACT)\s*\d{4})/i);
  if (!result.address_line1 && altAddr?.[1]) {
    const parts = parseAddressParts(safeTrim(altAddr[1]));
    result.address_line1 = parts.address_line1;
    result.city = parts.city;
    result.state = parts.state;
    result.postcode = parts.postcode;
  }

  // Owner Name(s): priority — before label, after label, then Owner Details section
  trySetOwnerNames(result, extractOwnerNamesFromText(fullText));

  // Some PDF exports put the first owner before the label and the second after (e.g. "SANDRA MCDONALD Owner Name(s): & JULIAN …").
  const ownersFromExtract = result.owner_names ? splitOwnerNames(result.owner_names) : [];
  const needsTrailingOwnerMerge =
    result.owner_names &&
    ownersFromExtract.length < 2 &&
    !/\s&\s|\s+and\s+|,|;|\r|\n/i.test(result.owner_names);
  if (needsTrailingOwnerMerge) {
    const trailingOwner = fullText.match(
      /Owner Name\(s\):\s*(?:(?:Owner\s+Details|Owner\s+Type|Owner\s+Address|Owner\s+Occupied)\s+)*(?:&\s*|and\s+)?([A-Za-z][A-Za-z\s.;'-]{1,80}?)\s+(?:Owner\s+Type|Phone|Property|Land|Council|Features|Area|Sales|Postal|Address|Mailing)/i,
    );
    const extra = stripOwnerSectionHeaders(trailingOwner?.[1] ?? "");
    if (extra && isPlausibleOwnerName(extra)) {
      const base = result.owner_names.toLowerCase();
      const extraLower = extra.toLowerCase();
      if (!base.includes(extraLower) && !extraLower.includes(base)) {
        const baseSurname = base.split(/\s+/).pop()?.toLowerCase() ?? "";
        const extraSurname = extra.split(/\s+/).pop()?.toLowerCase() ?? "";
        const joiner =
          baseSurname && extraSurname && baseSurname !== extraSurname ? "; " : " & ";
        result.owner_names = `${result.owner_names}${joiner}${extra}`;
      }
    }
  }

  if (result.owner_names) {
    result.owner_names = sanitizeOwnerNamesRaw(result.owner_names) ?? joinOwnerNames(result.owner_names);
  }

  result.owner_phones = parseOwnerPhonesFromText(fullText);

  // Owner Type — stop before next section header
  const ownerTypeMatch = fullText.match(/Owner Type:\s*([\w\s]{1,50}?)(?=\s+Property|\s+Valuation|$)/i);
  if (ownerTypeMatch?.[1]) result.owner_type = safeTrim(ownerTypeMatch[1]) || null;

  // RPD / Lot plan – short e.g. "L177 RP30552"
  const rpdMatch = fullText.match(/RPD:\s*([A-Z]*\d+\s+[A-Z0-9]+)/i);
  if (rpdMatch?.[1]) result.lot_plan = safeTrim(rpdMatch[1]) || null;

  // Valuation Amount(s): $560,000 - Site Value on 30/06/2024 (capture all)
  const valRegex = /Valuation Amount:\s*\$\s*([\d,]+)[^\d]*?(\d{2}\/\d{2}\/\d{4})?/gi;
  const valAmounts: Array<{ amount: number; date?: string }> = [];
  let valM;
  while ((valM = valRegex.exec(fullText)) !== null) {
    const amt = parseNumberFromText(valM[1]);
    if (amt != null) valAmounts.push({ amount: amt, date: valM[2] ?? undefined });
  }
  if (valAmounts.length) {
    result.valuation_amounts = valAmounts;
    result.estimated_value = valAmounts[0].amount;
  }
  const valDateMatch = fullText.match(/Valuation Amount[^\n]*?(\d{2}\/\d{2}\/\d{4})/i);
  if (valDateMatch?.[1]) result.valuation_date = valDateMatch[1];

  // Property Type: House - Freehold [Issuing] (stop before RPD, Valuation, or Land Use)
  const ptFullMatch = fullText.match(/Property Type:\s*([^\n]+?)(?=\s+(?:Land Use:|RPD:|Valuation|Owner)|$)/i);
  if (ptFullMatch?.[1]) {
    const full = stripDisclaimerAndTruncate(ptFullMatch[1], 80) || safeTrim(ptFullMatch[1]);
    if (full) {
      result.property_type_full = full;
      result.property_type = normalizePropertyType(full);
    }
  }

  // Land Use – one short phrase e.g. "SINGLE UNIT DWELLING"
  const landUseMatch = fullText.match(/Land Use:\s*([A-Z][A-Z\s]+?)(?=\s+Zoning|$)/i);
  if (landUseMatch?.[1]) result.land_use = stripDisclaimerAndTruncate(landUseMatch[1], 60) || null;

  // Zoning – one short phrase
  const zoneMatch = fullText.match(/Zoning\s+([A-Za-z][A-Za-z\s]+?)(?=\s+Area:|Council:|$)/i);
  if (zoneMatch?.[1]) result.zoning = stripDisclaimerAndTruncate(zoneMatch[1], 60) || null;

  // Area: 1,077 m² (399 m²) - land (building)
  const areaMatch = fullText.match(/Area:\s*([\d,.]+)\s*m²\s*(?:\(([\d,.]+)\s*m²\))?/i);
  if (areaMatch?.[1]) {
    result.lot_size = parseFloat(String(areaMatch[1]).replace(/,/g, "")) || null;
    if (areaMatch[2]) {
      result.building_size = parseFloat(String(areaMatch[2]).replace(/,/g, "")) || null;
    }
  }

  // Council – short name e.g. "REDLAND"
  const councilMatch = fullText.match(/Council:\s*([A-Za-z][A-Za-z\s]{0,40}?)(?=\s+Water|Features|$)/i);
  if (councilMatch?.[1]) result.council = stripDisclaimerAndTruncate(councilMatch[1], 40) || null;

  // Features: comma-separated list - stop at Area $/m2 or Sales History
  // Note: "Improvements:" can appear inline within the features list (do NOT use it as a stop word)
  const featMatch = fullText.match(/Features:\s*([^$]+?)(?=\s*\$[\d,]|\s*Area \$\/m|Sales History)/i);
  // Fallback: column-by-column PDF.js ordering puts feature text BEFORE the "Features:" label.
  // Also triggers when after-label matched but captured an empty string.
  const featBeforeLabel = !featMatch?.[1]
    ? fullText.match(/([A-Za-z][A-Za-z,\s'\-:]{10,400}?)\s+Features:/i)
    : null;
  const featRaw = (featMatch?.[1] || null) ?? featBeforeLabel?.[1] ?? null;
  if (featRaw) {
    const raw = String(featRaw);
    const stripped = stripDisclaimerAndTruncate(raw, 500);
    if (!stripped) result.features = null;
    else {
      const feats = stripped
        .split(/[,;]/)
        .map((f) => safeTrim(f))
        .filter((f) => f.length > 0 && f.length < 50);
      result.features = feats.length ? feats : null;
    }
  }

  // Beds, Baths, Cars - after Area $/m2 row or standalone triplet before Sale or Area section
  const bedsAfterArea = fullText.match(/Area\s*\$\/m2:\s*(\d+)\s+(\d+)\s+(\d+)/i);
  const bedsBathsCarsMatch =
    bedsAfterArea ??
    fullText.match(/(\d+)\s+(\d+)\s+(\d+)\s*(?:Sale Amount|Sale Date|\$[\d,]+\s+\d{2}\/|Area:)/i);
  if (bedsBathsCarsMatch) {
    const [b, ba, c] = bedsBathsCarsMatch.slice(1, 4).map(Number);
    if (b >= 1 && b <= 20) result.bedrooms = b;
    if (ba >= 1 && ba <= 20) result.bathrooms = ba;
    if (c >= 0 && c <= 20) result.car_spaces = c;
  }

  // Sales History — extract $amount + date pairs from normalized text.
  // Using fullText (all whitespace collapsed to space) handles both row-by-row and
  // column-by-column PDF table layouts. Only look within the Sales History section.
  const salesSectionStart = fullText.indexOf("Sales History");
  const salesSection = salesSectionStart >= 0 ? fullText.slice(salesSectionStart) : fullText;

  // Approach 1: amount and date are adjacent (row-by-row PDF layout, most common)
  const salePairMatches = [...salesSection.matchAll(/\$\s*([\d,]+)\s+(\d{2}\/\d{2}\/\d{4})/g)].filter(
    (m) => (parseNumberFromText(m[1]) ?? 0) > 50_000,
  );

  // Approach 2: amount and date appear in separate columns — extract independently and align by index
  let saleAmountsCol: number[] = [];
  let saleDatesCol: string[] = [];
  if (salePairMatches.length === 0) {
    saleAmountsCol = [...salesSection.matchAll(/\$\s*([\d,]+)/g)]
      .map((m) => parseNumberFromText(m[1]) ?? 0)
      .filter((a) => a > 50_000);
    saleDatesCol = [...salesSection.matchAll(/(\d{2}\/\d{2}\/\d{4})/g)].map((m) => m[1]);
  }

  // Determine sale type label(s) — may be "Normal Sale", "Mortgagee Sale" etc.
  const saleTypeMatches = [
    ...salesSection.matchAll(/Normal Sale|Mortgagee Sale|Auction Sale|Vacant Land Sale|Body Corporate Sale/gi),
  ].map((m) => m[0]);

  if (salePairMatches.length > 0) {
    result.sales_history = salePairMatches.slice(0, 5).map((m, i) => ({
      amount: parseNumberFromText(m[1]) ?? undefined,
      date: m[2] ?? undefined,
      type: saleTypeMatches[i] ?? (salesSection.includes("Normal Sale") ? "Normal Sale" : undefined),
    }));
  } else if (saleAmountsCol.length > 0) {
    const len = Math.min(saleAmountsCol.length, saleDatesCol.length, 5);
    result.sales_history = Array.from({ length: len }, (_, i) => ({
      amount: saleAmountsCol[i],
      date: saleDatesCol[i],
      type: saleTypeMatches[i] ?? (salesSection.includes("Normal Sale") ? "Normal Sale" : undefined),
    }));
  }

  // Most recent sale as price (first entry in history = most recent)
  if (!result.price && result.sales_history?.[0]?.amount) {
    result.price = result.sales_history[0].amount;
  }

  // Property ID – only "1674208 / QLD227492" style (short, no disclaimer)
  const propIdMatch = fullText.match(/Property ID:\s*([\d\w]+\s*\/\s*[\w\d]+)/i);
  if (propIdMatch?.[1]) result.property_id = stripDisclaimerAndTruncate(propIdMatch[1], 80) || null;

  // UBD Ref – only short ref e.g. "226 K14"
  const ubdMatch = fullText.match(/UBD Ref:\s*(\d+\s+[A-Z]\d+)/i);
  if (ubdMatch?.[1]) result.ubd_ref = safeTrim(ubdMatch[1]) || null;

  // Area $/m2: only "$552 ($1,504)" style
  const areaPerM2Match = fullText.match(/Area\s*\$\/m2:\s*([$\d,\s()]+?)(?=\s*[\d]+\s+[\d]+\s+[\d]+|Sale Amount|$)/i);
  if (areaPerM2Match?.[1]) result.area_per_m2 = stripDisclaimerAndTruncate(areaPerM2Match[1], 30) || null;

  // Water/Sewerage – often empty or one short line
  const waterMatch = fullText.match(/Water\/Sewerage:\s*([^\n]{0,80})/i);
  if (waterMatch?.[1]) result.water_sewerage = stripDisclaimerAndTruncate(waterMatch[1], 80) || null;

  // Notes combine features if no explicit notes
  if (result.features?.length && !result.notes) {
    result.notes = result.features.join(", ");
  }

  return result;
}

/**
 * Extract text from PDF file and parse as Pricefinder Property Report.
 */
export async function parsePropertyReportPdf(file: File): Promise<ParsedPropertyReport> {
  const text = await extractRawTextFromPdfFile(file);
  return parsePropertyReportText(text);
}
