/** Merge SMS template placeholders for app UI preview and send-sms-broadcast parity. */

export type SmsMergeContext = {
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  /** Your name + agency (Settings → SMS signature). Merged as {{signature}} in templates. */
  signature?: string;
  custom1?: string;
  custom2?: string;
  custom3?: string;
  custom4?: string;
};

function resolvedNames(ctx: SmsMergeContext) {
  const first = (ctx.first_name ?? "").trim() || (ctx.name ?? "").split(/\s+/)[0] || "";
  const last = (ctx.last_name ?? "").trim();
  const full = (ctx.name ?? "").trim() || [first, last].filter(Boolean).join(" ");
  const firstOut = first || "there";
  const fullOut = full || firstOut;
  return { first: firstOut, last, full: fullOut };
}

/**
 * Supports {{first_name}}, {{last_name}}, {{name}}, {{custom1}}..4 and Mobile Message style {firstname}, {custom1}, etc.
 */
export function mergeSmsPlaceholders(template: string, ctx: SmsMergeContext): string {
  const { first, last, full } = resolvedNames(ctx);
  const c1 = ctx.custom1 ?? "";
  const c2 = ctx.custom2 ?? "";
  const c3 = ctx.custom3 ?? "";
  const c4 = ctx.custom4 ?? "";
  const sig = (ctx.signature ?? "").trim();

  let s = template;
  const pairs: [RegExp, string][] = [
    [/\{\{\s*first_name\s*\}\}/gi, first],
    [/\{\{\s*last_name\s*\}\}/gi, last],
    [/\{\{\s*name\s*\}\}/gi, full],
    [/\{\{\s*signature\s*\}\}/gi, sig],
    [/\{\{\s*custom1\s*\}\}/gi, c1],
    [/\{\{\s*custom2\s*\}\}/gi, c2],
    [/\{\{\s*custom3\s*\}\}/gi, c3],
    [/\{\{\s*custom4\s*\}\}/gi, c4],
    [/\{firstname\}/gi, first],
    [/\{lastname\}/gi, last],
    [/\{fullname\}/gi, full],
    [/\{custom1\}/gi, c1],
    [/\{custom2\}/gi, c2],
    [/\{custom3\}/gi, c3],
    [/\{custom4\}/gi, c4],
    [/\{signature\}/gi, sig],
  ];
  for (const [re, val] of pairs) {
    s = s.replace(re, val);
  }
  return s;
}

const OPT_OUT_RE = /(\breply\s+)?stop(\s+to\s+opt\s*out|\s+to\s+unsubscribe)?|opt\s*out/i;

export function messageHasOptOutInstruction(text: string): boolean {
  return OPT_OUT_RE.test(text);
}

/** Standard ACMA-friendly line; only call when commercial and missing. */
export function appendCommercialOptOut(text: string): string {
  const t = text.trim();
  if (!t) return t;
  if (messageHasOptOutInstruction(t)) return t;
  const joiner = /[.!?…]\s*$/.test(t) ? " " : ". ";
  return `${t.trimEnd()}${joiner}Reply STOP to opt out.`.trim();
}

export const SMS_CUSTOM_FIELD_HINTS = [
  { key: "custom1" as const, label: "Custom 1 — address / property", placeholder: "e.g. 14 Raby Esplanade" },
  { key: "custom2" as const, label: "Custom 2 — suburb / area", placeholder: "e.g. Raby Bay" },
  { key: "custom3" as const, label: "Custom 3 — price, date, or stat", placeholder: "e.g. $1,450,000 or Sat 10am" },
  { key: "custom4" as const, label: "Custom 4 — beds / summary", placeholder: "e.g. 3 bed 2 bath" },
];

export function templateUsesSignature(templateBody: string): boolean {
  return /\{\{\s*signature\s*\}\}|\{signature\}/i.test(templateBody);
}

export function isSignatureUnfilled(templateBody: string, signature: string | undefined): boolean {
  return templateUsesSignature(templateBody) && !(signature ?? "").trim();
}

export function listUnfilledCustomSlots(
  templateBody: string,
  ctx: Pick<SmsMergeContext, "custom1" | "custom2" | "custom3" | "custom4">,
): string[] {
  const missing: string[] = [];
  for (let i = 1; i <= 4; i++) {
    const key = `custom${i}` as const;
    const re = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}|\\{${key}\\}`, "i");
    if (re.test(templateBody) && !(ctx[key] ?? "").trim()) {
      missing.push(`Custom ${i}`);
    }
  }
  return missing;
}

/** Rough GSM-7 single-segment estimate (160 chars per segment for ASCII-heavy text). */
export function estimateSmsSegments(text: string): { length: number; segments: number } {
  const length = text.length;
  const segments = length === 0 ? 0 : length <= 160 ? 1 : Math.ceil(length / 153);
  return { length, segments };
}
