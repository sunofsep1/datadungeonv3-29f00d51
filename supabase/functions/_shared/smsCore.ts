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
