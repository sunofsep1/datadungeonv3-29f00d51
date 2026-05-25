import { parse, isValid } from "date-fns";
import type { InvoiceGstMode } from "@/lib/invoiceTotals";
import type { InvoiceDirection } from "@/hooks/useInvoices";

export type ParsedInvoiceLineItem = {
  description: string;
  quantity: number;
  unit_price: number;
  gst_rate?: number;
};

export type ParsedInvoiceDraft = {
  direction: InvoiceDirection;
  invoice_number?: string;
  counterparty_name?: string;
  counterparty_abn?: string;
  property_address?: string;
  issue_date?: string;
  due_date?: string;
  terms_days?: number;
  gst_mode?: InvoiceGstMode;
  notes?: string;
  line_items?: ParsedInvoiceLineItem[];
  detected_fields: string[];
};

const MONTHS =
  "January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec";

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function parseMoney(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseAuDateToIso(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const s = raw.trim();
  const formats = [
    "d MMMM yyyy",
    "d MMM yyyy",
    "dd MMMM yyyy",
    "dd MMM yyyy",
    "d/MM/yyyy",
    "dd/MM/yyyy",
    "yyyy-MM-dd",
  ];
  for (const fmt of formats) {
    const d = parse(s, fmt, new Date());
    if (isValid(d)) return toIsoDate(d);
  }
  const slash = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]);
    let year = Number(slash[3]);
    if (year < 100) year += 2000;
    const d = new Date(Date.UTC(year, month - 1, day));
    if (isValid(d)) return toIsoDate(d);
  }
  return null;
}

function daysBetween(startIso: string, endIso: string): number | null {
  const a = new Date(`${startIso}T00:00:00.000Z`);
  const b = new Date(`${endIso}T00:00:00.000Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

function detectDirection(text: string): InvoiceDirection {
  const lower = text.toLowerCase();
  const gregIssuer =
    lower.includes("greg leigh") &&
    (lower.includes("real estate sales executive") || lower.includes("sunofsep@gmail.com"));
  const toAgency =
    lower.includes("accounts department") ||
    (lower.includes("queensland sotheby") && lower.includes("reimbursement"));
  if (gregIssuer && toAgency) return "outgoing";
  if (lower.includes("tax invoice") && lower.includes("greg leigh") && !gregIssuer) return "incoming";
  if (lower.includes("pty ltd") || lower.includes("pty. ltd")) return "incoming";
  return "incoming";
}

function extractInvoiceNumber(text: string): string | undefined {
  const patterns = [
    /Invoice\s*(?:No\.?|Number|#)\s*[:\s]*([A-Z]{0,4}-?\d[\w-]*)/i,
    /\b(INV-\d+)\b/i,
    /\b(TAX-\d+)\b/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return undefined;
}

function extractAbn(text: string): string | undefined {
  const m = text.match(/ABN\s*[:\s]*(\d{2}\s?\d{3}\s?\d{3}\s?\d{3})/i);
  if (!m?.[1]) return undefined;
  return m[1].replace(/\s/g, " ").trim();
}

function extractCounterparty(text: string, direction: InvoiceDirection): string | undefined {
  if (direction === "outgoing") {
    if (/Queensland Sotheby'?s International Realty/i.test(text)) {
      return "Queensland Sotheby's International Realty";
    }
    return undefined;
  }
  const pty = text.match(/([A-Z][A-Za-z0-9&.'\- ]+(?:Pty\.?\s*Ltd\.?|PTY LTD))/i);
  if (pty?.[1]) return normalizeWhitespace(pty[1]);
  return undefined;
}

function extractPropertyAddress(text: string): string | undefined {
  const patterns = [
    new RegExp(
      `(\\d+[A-Za-z]?\\s+[A-Za-z][\\w\\s'-]+,\\s*[A-Za-z][\\w\\s'-]+,\\s*(?:QLD|NSW|VIC|WA|SA|TAS|ACT|NT)\\s+\\d{4})`,
      "i",
    ),
    new RegExp(
      `(\\d+[A-Za-z]?\\s+[A-Za-z][\\w\\s'-]+,\\s*[A-Za-z][\\w\\s'-]+)`,
      "i",
    ),
    /(\d+\s+[A-Za-z][\w\s'-]+,\s*Narangba)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const addr = normalizeWhitespace(m[1].split("—")[0].split(" - ")[0]);
      if (addr.length > 8) return addr;
    }
  }
  return undefined;
}

function extractIssueDate(text: string): string | undefined {
  const patterns = [
    new RegExp(`Issue\\s*Date\\s*[\\s:]*((?:\\d{1,2}\\s+(?:${MONTHS})\\s+\\d{4})|\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})`, "i"),
    new RegExp(`Date\\s*[\\s:]*((?:\\d{1,2}\\s+(?:${MONTHS})\\s+\\d{4})|\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})`, "i"),
    new RegExp(`((?:\\d{1,2}\\s+(?:${MONTHS})\\s+\\d{4}))`, "i"),
  ];
  for (const p of patterns) {
    const m = text.match(p);
    const iso = parseAuDateToIso(m?.[1]);
    if (iso) return iso;
  }
  return undefined;
}

function extractDueDate(text: string): string | undefined {
  const patterns = [
    new RegExp(`Due\\s*(?:Date)?\\s*[\\s:]*((?:\\d{1,2}\\s+(?:${MONTHS})\\s+\\d{4})|\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})`, "i"),
    new RegExp(`Payment\\s*Due\\s*[\\s:]*((?:\\d{1,2}\\s+(?:${MONTHS})\\s+\\d{4})|\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})`, "i"),
  ];
  for (const p of patterns) {
    const m = text.match(p);
    const iso = parseAuDateToIso(m?.[1]);
    if (iso) return iso;
  }
  return undefined;
}

function extractTotal(text: string): number | null {
  const patterns = [
    /Total\s*Due\s*\$?\s*([\d,]+\.?\d*)/i,
    /Total\s*(?:AUD)?\s*\$?\s*([\d,]+\.?\d*)/i,
    /Amount\s*Due\s*\$?\s*([\d,]+\.?\d*)/i,
    /\$\s*([\d,]+\.\d{2})\s*AUD/i,
  ];
  for (const p of patterns) {
    const matches = [...text.matchAll(new RegExp(p.source, p.flags + "g"))];
    const last = matches.at(-1);
    const n = parseMoney(last?.[1]);
    if (n != null && n > 0) return n;
  }
  return null;
}

function extractLineDescription(text: string, propertyAddress?: string): string | undefined {
  if (propertyAddress) {
    const idx = text.indexOf(propertyAddress.split(",")[0]);
    if (idx >= 0) {
      const slice = text.slice(idx, idx + 220);
      const cleaned = normalizeWhitespace(slice);
      if (cleaned.length > 12) return cleaned.slice(0, 200);
    }
  }
  const desc =
    text.match(/(?:Description|Item|Services?)\s*[:\s]+(.{15,180}?)(?:\s+\$|\s+Qty|\s+Total)/i)?.[1] ||
    text.match(/(Social Media[^$]{10,160})/i)?.[1] ||
    text.match(/(\d+\s+[A-Za-z][\w\s,'-]+(?:Imagery|Marketing|Video|Staging|Floor Plan)[^$]{0,120})/i)?.[1];
  return desc ? normalizeWhitespace(desc) : undefined;
}

function extractNotes(text: string): string | undefined {
  const m = text.match(/(Reimbursement of[\s\S]{20,800}?)(?:\s+BSB|\s+Westpac|\s+Total|$)/i);
  if (m?.[1]) return normalizeWhitespace(m[1]).slice(0, 2000);
  const noAbn = text.match(/(No ABN quoted:[\s\S]{20,600}?)(?:\s+Total|$)/i);
  if (noAbn?.[1]) return normalizeWhitespace(noAbn[1]).slice(0, 2000);
  return undefined;
}

function detectGstMode(text: string, direction: InvoiceDirection): InvoiceGstMode {
  const lower = text.toLowerCase();
  if (direction === "outgoing") return "none";
  if (lower.includes("gst inclusive") || lower.includes("inc gst") || lower.includes("includes gst")) {
    return "inclusive";
  }
  if (lower.includes("gst exclusive") || lower.includes("ex gst")) return "exclusive";
  if (lower.includes("gst") && lower.includes("n/a")) return "none";
  if (lower.includes("reimbursement") && !lower.includes("gst")) return "none";
  return "inclusive";
}

/** Pure parser — tested with fixture text samples. */
export function parseInvoiceFromText(text: string): ParsedInvoiceDraft {
  const normalized = normalizeWhitespace(text);
  const direction = detectDirection(normalized);
  const detected_fields: string[] = [];

  const invoice_number = extractInvoiceNumber(normalized);
  if (invoice_number) detected_fields.push("invoice_number");

  const counterparty_abn = extractAbn(normalized);
  if (counterparty_abn) detected_fields.push("counterparty_abn");

  const counterparty_name = extractCounterparty(normalized, direction);
  if (counterparty_name) detected_fields.push("counterparty_name");

  const property_address = extractPropertyAddress(normalized);
  if (property_address) detected_fields.push("property_address");

  const issue_date = extractIssueDate(normalized);
  if (issue_date) detected_fields.push("issue_date");

  const due_date = extractDueDate(normalized);
  if (due_date) detected_fields.push("due_date");

  let terms_days: number | undefined;
  if (issue_date && due_date) {
    const d = daysBetween(issue_date, due_date);
    if (d != null && d >= 0) {
      terms_days = d;
      detected_fields.push("terms_days");
    }
  }
  const termsMatch = normalized.match(/(?:Net|Terms)\s*[:\s]*(\d+)\s*days?/i);
  if (termsMatch?.[1]) {
    terms_days = Number(termsMatch[1]);
    detected_fields.push("terms_days");
  }

  const gst_mode = detectGstMode(normalized, direction);
  detected_fields.push("gst_mode");

  const total = extractTotal(normalized);
  if (total != null) detected_fields.push("total");

  const lineDesc =
    extractLineDescription(normalized, property_address) ||
    (property_address ? `Marketing — ${property_address}` : "Invoice line item");
  if (total != null) {
    detected_fields.push("line_items");
  }

  const notes = extractNotes(normalized);
  if (notes) detected_fields.push("notes");

  return {
    direction,
    invoice_number,
    counterparty_name,
    counterparty_abn,
    property_address,
    issue_date,
    due_date,
    terms_days: terms_days ?? (direction === "outgoing" ? 30 : 7),
    gst_mode,
    notes,
    line_items:
      total != null
        ? [{ description: lineDesc, quantity: 1, unit_price: total, gst_rate: gst_mode === "none" ? 0 : 10 }]
        : undefined,
    detected_fields,
  };
}
