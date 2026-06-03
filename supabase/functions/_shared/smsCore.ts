/** Shared SMS helpers for Edge Functions (Mobile Message AU + Twilio). */

export function toE164Australia(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("4")) {
    return `+61${digits}`;
  }
  if (digits.length === 10 && digits.startsWith("04")) {
    return `+61${digits.slice(1)}`;
  }
  if (digits.length === 11 && digits.startsWith("61")) {
    return `+${digits}`;
  }
  return raw.startsWith("+") ? raw : `+${digits}`;
}

export function digitsKey(phone: string): string {
  return phone.replace(/\D/g, "");
}

export type MobileMessageCreds = {
  apiUser: string;
  apiPassword: string;
  sender: string;
};

export type MMMessage = { to: string; message: string };

export async function postMobileMessageBatch(
  creds: MobileMessageCreds,
  messages: MMMessage[],
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const auth = btoa(`${creds.apiUser}:${creds.apiPassword}`);
  const res = await fetch("https://api.mobilemessage.com.au/v1/messages", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: messages.map((m) => ({
        to: m.to,
        message: m.message,
        sender: creds.sender,
      })),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
}

export function mobileMessageCredsFromEnv(): MobileMessageCreds | null {
  const apiUser = Deno.env.get("MOBILE_MESSAGE_API_USER");
  const apiPassword = Deno.env.get("MOBILE_MESSAGE_API_PASSWORD");
  const sender = Deno.env.get("MOBILE_MESSAGE_SENDER");
  if (!apiUser || !apiPassword || !sender) return null;
  return { apiUser, apiPassword, sender };
}

export type SmsMergeFields = {
  custom1?: string;
  custom2?: string;
  custom3?: string;
  custom4?: string;
};

type NameRow = {
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
};

/** Merge {{first_name}} / {{signature}} / {{custom1}} and Mobile Message-style tokens. */
export function mergeSmsTemplateForRecipient(
  template: string,
  row: NameRow,
  mergeFields: SmsMergeFields,
  smsSignature: string,
): string {
  const firstRaw = (row.first_name ?? "").trim();
  const fromName = (row.name ?? "").split(/\s+/).filter(Boolean)[0] ?? "";
  const first = firstRaw || fromName || "there";
  const last = (row.last_name ?? "").trim();
  const fullName = (row.name ?? "").trim() || [first, last].filter(Boolean).join(" ");
  const c1 = (mergeFields.custom1 ?? "").trim();
  const c2 = (mergeFields.custom2 ?? "").trim();
  const c3 = (mergeFields.custom3 ?? "").trim();
  const c4 = (mergeFields.custom4 ?? "").trim();
  const sig = (smsSignature ?? "").trim();

  let s = template;
  const pairs: [RegExp, string][] = [
    [/\{\{\s*first_name\s*\}\}/gi, first],
    [/\{\{\s*last_name\s*\}\}/gi, last],
    [/\{\{\s*name\s*\}\}/gi, fullName],
    [/\{\{\s*signature\s*\}\}/gi, sig],
    [/\{\{\s*custom1\s*\}\}/gi, c1],
    [/\{\{\s*custom2\s*\}\}/gi, c2],
    [/\{\{\s*custom3\s*\}\}/gi, c3],
    [/\{\{\s*custom4\s*\}\}/gi, c4],
    [/\{firstname\}/gi, first],
    [/\{lastname\}/gi, last],
    [/\{fullname\}/gi, fullName],
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

export function appendCommercialOptOutIfMissing(text: string): string {
  const t = text.trim();
  if (!t) return t;
  if (OPT_OUT_RE.test(t)) return t;
  const joiner = /[.!?…]\s*$/.test(t) ? " " : ". ";
  return `${t.trimEnd()}${joiner}Reply STOP to opt out.`.trim();
}
