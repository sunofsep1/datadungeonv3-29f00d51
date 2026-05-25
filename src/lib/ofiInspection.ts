/** Open-for-inspection helpers (Reapit-style OFI module). */

export const OFI_OPEN_TYPES = [
  { value: "advertised", label: "As advertised" },
  { value: "by_appointment", label: "By appointment" },
] as const;

export type OfiOpenType = (typeof OFI_OPEN_TYPES)[number]["value"];

export const DEFAULT_OFI_DURATION_MINUTES = 30;

export function addMinutesToIso(isoStart: string, minutes: number): string {
  const d = new Date(isoStart);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid start time");
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

export function buildOfiCheckInPath(token: string): string {
  return `/ofi/check-in/${encodeURIComponent(token)}`;
}

export function buildOfiCheckInUrl(token: string, origin = typeof window !== "undefined" ? window.location.origin : ""): string {
  return `${origin.replace(/\/$/, "")}${buildOfiCheckInPath(token)}`;
}

export function buildOfiBrochurePrintPath(token: string): string {
  return `/ofi/brochure/${encodeURIComponent(token)}/print`;
}

export function buildOfiBrochurePrintUrl(
  token: string,
  origin = typeof window !== "undefined" ? window.location.origin : "",
): string {
  return `${origin.replace(/\/$/, "")}${buildOfiBrochurePrintPath(token)}`;
}

/** Third-party QR image (no extra npm dep). */
export function ofiQrImageUrl(checkInUrl: string, size = 240): string {
  const q = encodeURIComponent(checkInUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${q}`;
}

export function partitionInspections<T extends { starts_at: string }>(
  rows: T[],
  now = new Date(),
): { upcoming: T[]; past: T[] } {
  const t = now.getTime();
  const upcoming: T[] = [];
  const past: T[] = [];
  for (const row of rows) {
    const start = new Date(row.starts_at).getTime();
    if (Number.isNaN(start)) continue;
    if (start >= t) upcoming.push(row);
    else past.push(row);
  }
  upcoming.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  past.sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
  return { upcoming, past };
}
