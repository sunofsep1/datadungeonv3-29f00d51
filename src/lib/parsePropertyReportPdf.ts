/**
 * Parse Pricefinder Property Report PDF into structured property data.
 * Extracts text via PDF.js and parses the standard report format.
 */

import * as pdfjsLib from "pdfjs-dist";

// Configure worker for pdfjs (required for browser) - use unpkg for Vite compatibility
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${(pdfjsLib as { version?: string }).version || "4.0.379"}/build/pdf.worker.min.mjs`;
}

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

function extractTextFromPdf(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const typedArray = new Uint8Array(reader.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument(typedArray).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items
            .map((item: { str?: string }) => item.str || "")
            .join(" ");
          fullText += pageText + "\n";
        }
        resolve(fullText);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

function safeTrim(s: string | undefined | null): string {
  return s == null ? "" : String(s).trim();
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

/** Allowed DB values for properties_property_type_check; use when saving. */
export const PROPERTY_TYPE_VALUES = ["house", "apartment", "townhouse", "land"] as const;

export function normalizePropertyType(s: string | undefined | null): string {
  if (s == null || typeof s !== "string") return "house";
  const lower = s.toLowerCase().trim();
  if (/house|freehold/i.test(lower)) return "house";
  if (/apartment|unit|flat/i.test(lower)) return "apartment";
  if (/townhouse|town house/i.test(lower)) return "townhouse";
  if (/land|vacant/i.test(lower)) return "land";
  return "house";
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
    /\d+[\s\w]+(?:STREET|ROAD|AVENUE|DRIVE|PLACE|COURT|LANE|CRESCENT|PARADE|WAY|TERRACE|BOULEVARD|CLOSE|CRT|ST|RD|AVE|DR|PL|CT|LN|CRES|TCE|BLVD|CL)[,.\s]+[\w\s]+(?:,\s*)?(?:QLD|NSW|VIC|WA|SA|TAS|NT|ACT)\s*\d{4}/i
  );
  if (addrMatch?.[0]) {
    const addr = safeTrim(addrMatch[0]);
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

  // Owner Name(s): names appear BEFORE "Owner Name(s):" on the same line
  const ownerMatch = fullText.match(/([A-Za-z][A-Za-z\s&\.'-]+?)\s+Owner Name\(s\):/);
  if (ownerMatch?.[1]) result.owner_names = safeTrim(ownerMatch[1]) || null;

  // Phone(s)
  const phoneMatch = fullText.match(/Phone\(s\):\s*[\^]?([\d\s]+)/i);
  if (phoneMatch?.[1]) {
    const phones = String(phoneMatch[1]).match(/\d{10,11}/g) || [];
    result.owner_phones = phones.length ? phones : null;
  }

  // Owner Type
  const ownerTypeMatch = fullText.match(/Owner Type:\s*([^\n\t]+)/i);
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

  // Property Type: House - Freehold [Issuing] (full label, stop before disclaimer)
  const ptFullMatch = fullText.match(/Property Type:\s*([^\n]+?)(?=\s+Land Use:|Owner|$)/i);
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
  const areaMatch = fullText.match(/Area:\s*([\d,\.]+)\s*m²\s*(?:\(([\d,\.]+)\s*m²\))?/i);
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
  const featMatch = fullText.match(/Features:\s*([^$]+?)(?=\s*\$[\d,]|\s*Area \$\/m|Improvements:|Sales History)/i);
  if (featMatch?.[1]) {
    const raw = String(featMatch[1]);
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

  // Beds, Baths, Cars - often appear as "7 3 6" near "Area $/m2" or in a row
  const bedsBathsCarsMatch = fullText.match(/(\d+)\s+(\d+)\s+(\d+)\s*(?:\n|Area|\$|Sale)/);
  if (bedsBathsCarsMatch) {
    const [b, ba, c] = bedsBathsCarsMatch.slice(1, 4).map(Number);
    if (b >= 1 && b <= 20) result.bedrooms = b;
    if (ba >= 1 && ba <= 20) result.bathrooms = ba;
    if (c >= 0 && c <= 20) result.car_spaces = c;
  }

  // Sales History: $ 600,000 22/02/2017 Normal Sale
  const saleLines = text.match(/\$\s*[\d,]+\s+\d{2}\/\d{2}\/\d{4}\s+[^\n]+/g);
  if (saleLines) {
    result.sales_history = saleLines.slice(0, 5).map((line) => {
      const amt = line.match(/\$\s*([\d,]+)/);
      const dt = line.match(/(\d{2}\/\d{2}\/\d{4})/);
      return {
        amount: amt ? parseNumberFromText(amt[1]) ?? undefined : undefined,
        date: dt ? dt[1] : undefined,
        type: line.includes("Normal Sale") ? "Normal Sale" : undefined,
      };
    });
  }

  // Last sale amount as price if no other price
  const lastSaleMatch = fullText.match(/\$\s*([\d,]+)\s+(\d{2}\/\d{2}\/\d{4})\s+Normal Sale/i);
  if (lastSaleMatch && !result.price && !result.estimated_value) {
    result.price = parseNumberFromText(lastSaleMatch[1]);
  } else if (lastSaleMatch && !result.price) {
    result.price = parseNumberFromText(lastSaleMatch[1]);
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
  const text = await extractTextFromPdf(file);
  return parsePropertyReportText(text);
}
