import { extractTextFromPdfFile } from "@/lib/extractPdfText";
import { parseInvoiceFromText, type ParsedInvoiceDraft } from "@/lib/parseInvoiceText";

export type { ParsedInvoiceDraft, ParsedInvoiceLineItem } from "@/lib/parseInvoiceText";
export { parseInvoiceFromText } from "@/lib/parseInvoiceText";

export async function parseInvoicePdfFile(file: File): Promise<ParsedInvoiceDraft> {
  const text = await extractTextFromPdfFile(file);
  if (!text || text.length < 20) {
    throw new Error("Could not read text from this PDF. Try a text-based invoice (not a scanned image).");
  }
  return parseInvoiceFromText(text);
}
