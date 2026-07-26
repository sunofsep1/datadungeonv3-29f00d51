/**
 * Every appointment in this CRM is a Redlands appointment. Queensland does not
 * observe daylight saving, so Brisbane is a constant UTC+10:00 all year — which
 * means we can pin times with a fixed offset and never think about DST.
 *
 * Do NOT swap this for the device's local timezone. Entering Monday's diary from
 * a hotel in Sydney in January would otherwise silently shift every booking by
 * an hour.
 */
export const BRISBANE_UTC_OFFSET = "+10:00";
export const BRISBANE_TZ = "Australia/Brisbane";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

/**
 * Combine a `yyyy-MM-dd` date and an `HH:mm` time into an offset-bearing ISO
 * string anchored to Brisbane.
 *
 *   toBrisbaneIso("2026-07-11", "13:00") -> "2026-07-11T13:00:00+10:00"
 *
 * This is the ONLY way an appointment time should be built for storage. Passing
 * a bare `2026-07-11T13:00:00` to a Postgres `timestamptz` column makes the
 * server assume UTC, which stored 1pm Brisbane appointments as 11pm.
 */
export function toBrisbaneIso(date: string, time: string): string {
  const d = (date ?? "").trim();
  const t = (time ?? "").trim();
  if (!DATE_RE.test(d)) throw new Error(`Invalid date "${date}", expected yyyy-MM-dd`);
  if (!TIME_RE.test(t)) throw new Error(`Invalid time "${time}", expected HH:mm`);
  const withSeconds = t.length === 5 ? `${t}:00` : t;
  return `${d}T${withSeconds}${BRISBANE_UTC_OFFSET}`;
}

/**
 * An all-day entry, anchored to midnight Brisbane rather than midnight UTC
 * (which would land the entry on the previous day at 10am local).
 */
export function toBrisbaneAllDayIso(date: string): string {
  return toBrisbaneIso(date, "00:00");
}

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
