/**
 * Shared PDF.js text extraction for browser uploads.
 */
import * as pdfjsLib from "pdfjs-dist";

// Serve the worker from the same origin (Vite bundles it locally) instead of
// fetching from unpkg.com on every parse — eliminates the CDN round-trip.
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).href;
}

/** Extract PDF text with page-break newlines, no whitespace normalization. */
async function extractPdfPages(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const typedArray = new Uint8Array(buffer);
  const pdf = await pdfjsLib.getDocument(typedArray).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
      .join(" ");
    fullText += `${pageText}\n`;
  }
  return fullText;
}

/** Extract and normalize PDF text (collapses whitespace). For most parsers. */
export async function extractTextFromPdfFile(file: File): Promise<string> {
  return (await extractPdfPages(file)).replace(/\s+/g, " ").trim();
}

/**
 * Extract PDF text preserving page-break newlines, without whitespace normalization.
 * Use when the calling parser relies on newlines for line-by-line matching.
 */
export async function extractRawTextFromPdfFile(file: File): Promise<string> {
  return extractPdfPages(file);
}
