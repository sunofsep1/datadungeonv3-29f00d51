/** Add minutes to an HH:mm time string (wraps at midnight). */
export function endTimeFromStart(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return startTime;
  const total = h * 60 + m + durationMinutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

/** Append a plain-text email signature block to HTML body content. */
export function appendEmailSignatureHtml(htmlBody: string, signature: string | null | undefined): string {
  const body = htmlBody.trim();
  const sig = signature?.trim();
  if (!sig) return body || "<p></p>";
  const sigHtml = sig.replace(/\n/g, "<br>");
  if (!body) return sigHtml;
  return `${body}<br><br>${sigHtml}`;
}
