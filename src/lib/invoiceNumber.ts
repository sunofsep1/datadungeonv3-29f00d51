export function nextInvoiceNumber(existingNumbers: string[], prefix = "INV-"): string {
  let max = 0;
  const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d+)$`, "i");
  for (const raw of existingNumbers) {
    const m = raw.trim().match(re);
    if (m?.[1]) max = Math.max(max, Number.parseInt(m[1], 10));
  }
  const next = max + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}
