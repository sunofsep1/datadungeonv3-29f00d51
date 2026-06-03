/**
 * Shared PDF.js text extraction for browser uploads.
 */
import * as pdfjsLib from "pdfjs-dist";

if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${(pdfjsLib as { version?: string }).version || "4.0.379"}/build/pdf.worker.min.mjs`;
}

export async function extractTextFromPdfFile(file: File): Promise<string> {
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
  return fullText.replace(/\s+/g, " ").trim();
}
