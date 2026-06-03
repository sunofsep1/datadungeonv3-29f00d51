/**
 * Heuristic parser for QLD residential sale contract PDFs (text-based).
 * Always review parsed fields before saving — formats vary by solicitor.
 */

import { extractTextFromPdfFile } from "@/lib/extractPdfText";

export type ParsedSalesContract = {
  rawText: string;
  buyerNames: string[];
  vendorNames: string[];
  purchasePrice: number | null;
  contractDate: string | null;
  settlementDate: string | null;
  financeDays: number | null;
  buildingPestDays: number | null;
  specialConditionsSnippet: string | null;
};

function parseAudPrice(text: string): number | null {
  const m =
    text.match(/purchase\s*price[:\s]*\$?\s*([\d,]+(?:\.\d{2})?)/i) ??
    text.match(/contract\s*price[:\s]*\$?\s*([\d,]+(?:\.\d{2})?)/i) ??
    text.match(/\$\s*([\d,]{6,}(?:\.\d{2})?)/);
  if (!m?.[1]) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseIsoDate(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const re = new RegExp(`${label}[:\\s]*(\\d{1,2}[/.-]\\d{1,2}[/.-]\\d{2,4})`, "i");
    const m = text.match(re);
    if (!m?.[1]) continue;
    const parts = m[1].split(/[/.-]/);
    if (parts.length !== 3) continue;
    let [d, mo, y] = parts.map((p) => parseInt(p, 10));
    if (y < 100) y += 2000;
    if (d > 31 || mo > 12) continue;
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return null;
}

function parseDays(text: string, pattern: RegExp): number | null {
  const m = text.match(pattern);
  if (!m?.[1]) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parsePartyNames(text: string, label: string): string[] {
  const re = new RegExp(`${label}[:\\s]+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)+)`, "i");
  const m = text.match(re);
  if (!m?.[1]) return [];
  return [m[1].trim()];
}

export function parseSalesContractText(rawText: string): ParsedSalesContract {
  const text = rawText.replace(/\s+/g, " ").trim();
  return {
    rawText: text.slice(0, 8000),
    buyerNames: parsePartyNames(text, "buyer|purchaser"),
    vendorNames: parsePartyNames(text, "vendor|seller"),
    purchasePrice: parseAudPrice(text),
    contractDate: parseIsoDate(text, ["contract date", "date of contract", "exchange date"]),
    settlementDate: parseIsoDate(text, ["settlement date", "date for settlement", "settling on"]),
    financeDays: parseDays(text, /finance[^.]{0,40}?(\d{1,3})\s*(?:business\s*)?days/i),
    buildingPestDays: parseDays(text, /building[^.]{0,40}?(\d{1,3})\s*(?:business\s*)?days/i),
    specialConditionsSnippet: (() => {
      const m = text.match(/special conditions[:\s]+(.{40,400})/i);
      return m?.[1]?.trim() ?? null;
    })(),
  };
}

export async function parseSalesContractPdf(file: File): Promise<ParsedSalesContract> {
  const rawText = await extractTextFromPdfFile(file);
  return parseSalesContractText(rawText);
}
