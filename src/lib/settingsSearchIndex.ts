import { SETTINGS_NAV } from "@/components/settings/settingsNav";

export type SettingsSearchEntry = {
  path: string;
  label: string;
  group: string;
  keywords: string[];
  /** Optional element id on the target page to scroll into view */
  fieldId?: string;
};

/** Searchable settings entries — nav sections plus individual fields. */
export const SETTINGS_SEARCH_INDEX: SettingsSearchEntry[] = [
  ...SETTINGS_NAV.flatMap((g) =>
    g.items.map((item) => ({
      path: item.path,
      label: item.label,
      group: g.group,
      keywords: [item.label, item.description ?? "", g.group].filter(Boolean),
    })),
  ),
  {
    path: "/settings/account",
    label: "Display name",
    group: "Personal",
    keywords: ["name", "profile", "agent"],
    fieldId: "display-name",
  },
  {
    path: "/settings/account",
    label: "Profile photo",
    group: "Personal",
    keywords: ["avatar", "photo", "picture", "image"],
    fieldId: "profile-photo",
  },
  {
    path: "/settings/account",
    label: "Phone number",
    group: "Personal",
    keywords: ["mobile", "contact", "phone"],
    fieldId: "phone",
  },
  {
    path: "/settings/account",
    label: "Agency / office",
    group: "Personal",
    keywords: ["agency", "office", "brand", "company"],
    fieldId: "agency",
  },
  {
    path: "/settings/account",
    label: "License number",
    group: "Personal",
    keywords: ["license", "reiq", "agent id", "queensland"],
    fieldId: "license",
  },
  {
    path: "/settings/account",
    label: "Default calendar view",
    group: "Personal",
    keywords: ["calendar", "day", "week", "month", "view"],
    fieldId: "calendar-view",
  },
  {
    path: "/settings/appearance",
    label: "Theme",
    group: "Personal",
    keywords: ["theme", "dark", "light", "color", "palette", "midday"],
    fieldId: "theme",
  },
  {
    path: "/settings/appearance",
    label: "Density",
    group: "Personal",
    keywords: ["density", "compact", "comfortable", "spacing"],
    fieldId: "density",
  },
  {
    path: "/settings/appearance",
    label: "Font size",
    group: "Personal",
    keywords: ["font", "text", "size", "large", "readable"],
    fieldId: "font-size",
  },
  {
    path: "/settings/experience",
    label: "Game mode",
    group: "Personal",
    keywords: ["game", "drako", "xp", "lair", "quests"],
    fieldId: "game-mode",
  },
  {
    path: "/settings/experience",
    label: "Drako voice",
    group: "Personal",
    keywords: ["drako", "audio", "voice", "sound"],
    fieldId: "drako-audio",
  },
  {
    path: "/settings/security",
    label: "Change password",
    group: "Personal",
    keywords: ["password", "credentials", "login"],
    fieldId: "new-password",
  },
  {
    path: "/settings/security",
    label: "Active sessions",
    group: "Personal",
    keywords: ["session", "devices", "sign out", "logout"],
    fieldId: "active-sessions",
  },
  {
    path: "/settings/security",
    label: "Two-factor authentication",
    group: "Personal",
    keywords: ["2fa", "mfa", "totp", "authenticator", "security"],
    fieldId: "two-factor",
  },
  {
    path: "/settings/business",
    label: "Commission rate",
    group: "Business",
    keywords: ["commission", "gci", "rate", "percent", "pipeline"],
    fieldId: "commission-rate",
  },
  {
    path: "/settings/business",
    label: "Follow-up days",
    group: "Business",
    keywords: ["follow up", "follow-up", "cadence", "stale", "touch"],
    fieldId: "follow-up-days",
  },
  {
    path: "/settings/business",
    label: "Appointment duration",
    group: "Business",
    keywords: ["appointment", "booking", "minutes", "duration", "calendar"],
    fieldId: "appointment-duration",
  },
  {
    path: "/settings/communications",
    label: "SMS signature",
    group: "Business",
    keywords: ["sms", "signature", "text", "mobile message"],
    fieldId: "sms-signature",
  },
  {
    path: "/settings/communications",
    label: "Email signature",
    group: "Business",
    keywords: ["email", "signature", "resend", "footer"],
    fieldId: "email-signature",
  },
  {
    path: "/settings/communications",
    label: "Email from name",
    group: "Business",
    keywords: ["email", "from", "sender", "display name"],
    fieldId: "email-from-name",
  },
  {
    path: "/settings/notifications",
    label: "Daily digest email",
    group: "Business",
    keywords: ["digest", "email", "summary", "daily", "weekly"],
    fieldId: "digest-email",
  },
  {
    path: "/settings/notifications",
    label: "Appointment reminders",
    group: "Business",
    keywords: ["appointment", "reminder", "sms", "email"],
    fieldId: "appointment-reminders",
  },
  {
    path: "/settings/integrations",
    label: "Google Calendar",
    group: "System",
    keywords: ["google", "calendar", "gcal", "sync", "oauth"],
  },
  {
    path: "/settings/integrations",
    label: "Resend email",
    group: "System",
    keywords: ["resend", "email", "api key"],
  },
  {
    path: "/settings/integrations",
    label: "SMS / Mobile Message",
    group: "System",
    keywords: ["sms", "mobile message", "twilio", "text"],
  },
  {
    path: "/settings/integrations",
    label: "Inbound lead webhook",
    group: "System",
    keywords: ["webhook", "lead", "inbound", "portal"],
  },
  {
    path: "/settings/automations",
    label: "Listing stage automation",
    group: "System",
    keywords: ["listing", "stage", "pipeline", "automation"],
  },
  {
    path: "/settings/automations",
    label: "CRM workflows",
    group: "System",
    keywords: ["workflow", "crm", "automation"],
  },
  {
    path: "/settings/data",
    label: "Import contacts CSV",
    group: "System",
    keywords: ["import", "csv", "contacts", "upload"],
  },
  {
    path: "/settings/data",
    label: "Export data",
    group: "System",
    keywords: ["export", "csv", "download", "backup"],
    fieldId: "export-data",
  },
  {
    path: "/settings/data",
    label: "Data health",
    group: "System",
    keywords: ["data health", "duplicates", "completeness", "quality"],
  },
];

export function filterSettingsSearch(query: string): SettingsSearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored = SETTINGS_SEARCH_INDEX.map((entry) => {
    const haystack = [entry.label, entry.group, ...entry.keywords].join(" ").toLowerCase();
    const labelMatch = entry.label.toLowerCase().includes(q);
    const keywordMatch = entry.keywords.some((k) => k.toLowerCase().includes(q));
    const pathMatch = entry.path.toLowerCase().includes(q);
    const groupMatch = entry.group.toLowerCase().includes(q);
    const fullMatch = haystack.includes(q);
    if (!labelMatch && !keywordMatch && !pathMatch && !groupMatch && !fullMatch) return null;
    const score =
      (entry.label.toLowerCase() === q ? 100 : 0) +
      (entry.label.toLowerCase().startsWith(q) ? 50 : 0) +
      (labelMatch ? 30 : 0) +
      (keywordMatch ? 20 : 0) +
      (groupMatch ? 10 : 0);
    return { entry, score };
  }).filter(Boolean) as { entry: SettingsSearchEntry; score: number }[];

  const seen = new Set<string>();
  return scored
    .sort((a, b) => b.score - a.score)
    .map(({ entry }) => entry)
    .filter((entry) => {
      const key = `${entry.path}:${entry.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

export function filterSettingsNavPaths(query: string): Set<string> | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const matches = filterSettingsSearch(q);
  return new Set(matches.map((m) => m.path));
}
