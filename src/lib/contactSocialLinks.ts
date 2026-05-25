export type SocialPlatform = "linkedin" | "twitter" | "instagram" | "facebook" | "website";

export function normalizeWebsiteUrl(raw: string | null | undefined): string | null {
  const v = raw?.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

export function twitterProfileUrl(handle: string | null | undefined): string | null {
  const v = handle?.trim().replace(/^@/, "");
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://x.com/${encodeURIComponent(v)}`;
}

export function instagramProfileUrl(raw: string | null | undefined): string | null {
  const v = raw?.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, "");
  return `https://instagram.com/${encodeURIComponent(handle)}`;
}

export function facebookProfileUrl(raw: string | null | undefined): string | null {
  const v = raw?.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://facebook.com/${encodeURIComponent(v.replace(/^@/, ""))}`;
}

export function linkedinProfileUrl(raw: string | null | undefined): string | null {
  const v = raw?.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://linkedin.com/in/${encodeURIComponent(v.replace(/^@/, ""))}`;
}

export function socialLinkLabel(platform: SocialPlatform, raw: string | null | undefined): string | null {
  const v = raw?.trim();
  if (!v) return null;
  if (platform === "twitter") return v.startsWith("@") ? v : `@${v.replace(/^@/, "")}`;
  if (platform === "website") return v.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  return v.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}
