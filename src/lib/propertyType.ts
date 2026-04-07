export const PROPERTY_TYPE_VALUES = ["house", "apartment", "townhouse", "land"] as const;

export function normalizePropertyType(s: string | undefined | null): string {
  if (s == null || typeof s !== "string") return "house";
  const lower = s.toLowerCase().trim();
  if (/house|freehold/i.test(lower)) return "house";
  if (/apartment|unit|flat/i.test(lower)) return "apartment";
  if (/townhouse|town house/i.test(lower)) return "townhouse";
  if (/land|vacant/i.test(lower)) return "land";
  return "house";
}
