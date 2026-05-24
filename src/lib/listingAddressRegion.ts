/** Parse suburb/region from AU listing address strings for §9 Sales by Region. */

export function regionKeyFromParts(city: string | null | undefined, state: string | null | undefined): string {
  const suburb = (city ?? "").trim();
  const st = (state ?? "").trim().toUpperCase();
  if (!suburb && !st) return "Unknown";
  if (suburb && st) return `${suburb}, ${st}`;
  return suburb || st;
}

export function parseListingRegionFromAddress(address: string | null | undefined): string {
  const a = (address ?? "").trim();
  if (!a) return "Unknown";

  const inline = a.match(/\b([A-Za-z][A-Za-z\s'.-]+?)\s+(QLD|NSW|VIC|SA|WA|TAS|NT|ACT)\s+(\d{4})\b/i);
  if (inline) return `${inline[1].trim()}, ${inline[2].toUpperCase()}`;

  const parts = a.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const tail = parts[parts.length - 1];
    const statePost = tail.match(/\b(QLD|NSW|VIC|SA|WA|TAS|NT|ACT)\b/i);
    if (statePost) {
      const suburbPart = parts[parts.length - 2] ?? "";
      const suburb = suburbPart.replace(/\d{4}/g, "").trim();
      if (suburb) return `${suburb}, ${statePost[1].toUpperCase()}`;
    }
  }

  return parts[0] || "Unknown";
}

export function listingRegionKey(
  address: string,
  property?: { city?: string | null; suburb?: string | null; state?: string | null } | null,
): string {
  if (property) {
    const city = property.suburb ?? property.city;
    if (city?.trim() || property.state?.trim()) {
      return regionKeyFromParts(city, property.state);
    }
  }
  return parseListingRegionFromAddress(address);
}
