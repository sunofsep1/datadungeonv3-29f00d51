/**
 * Shared bulk SMS send (Mobile Message) + sms_outbound logging.
 * Used by send-sms-broadcast and process-scheduled-sms.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  appendCommercialOptOutIfMissing,
  digitsKey,
  mergeSmsTemplateForRecipient,
  mobileMessageCredsFromEnv,
  postMobileMessageBatch,
  toE164Australia,
  type MobileMessageCreds,
  type SmsMergeFields,
} from "./smsCore.ts";

export const SMS_BROADCAST_MAX_RECIPIENTS = 2000;
const MM_BATCH = 100;

export type RecipientRow = {
  id: string;
  sms_opt_out: boolean | null;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  contact_channels: { channel_type: string; value: string | null; is_primary: boolean | null }[];
};

function primaryPhone(channels: RecipientRow["contact_channels"]): string | null {
  const list = channels ?? [];
  const primary = list.find((c) => c.channel_type === "phone" && c.is_primary && c.value);
  if (primary?.value) return primary.value;
  const anyP = list.find((c) => c.channel_type === "phone" && c.value);
  return anyP?.value ?? null;
}

function previewBody(text: string, max = 200): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

export type BroadcastRunResult = {
  batch_id: string;
  sent: number;
  skipped: { contact_id: string; reason: string }[];
  failures: { to: string; contact_id: string; error: string }[];
  total_requested: number;
};

/** When creds null, reads from env (same as send-sms-broadcast). */
export async function runSmsBroadcast(
  svc: SupabaseClient,
  userId: string,
  contactIds: string[],
  message: string,
  mergeFields: SmsMergeFields,
  appendOptOut: boolean,
  smsSignatureFromDb: string,
  credsOverride: MobileMessageCreds | null = null,
): Promise<BroadcastRunResult> {
  const mmCreds = credsOverride ?? mobileMessageCredsFromEnv();
  if (!mmCreds) {
    throw new Error(
      "Bulk SMS requires Mobile Message. Set MOBILE_MESSAGE_API_USER, MOBILE_MESSAGE_API_PASSWORD, MOBILE_MESSAGE_SENDER.",
    );
  }

  const uniqueIds = [...new Set(contactIds.filter((id) => typeof id === "string" && id.length > 0))];
  if (uniqueIds.length === 0) {
    throw new Error("No valid contact_ids");
  }
  if (uniqueIds.length > SMS_BROADCAST_MAX_RECIPIENTS) {
    throw new Error(`Maximum ${SMS_BROADCAST_MAX_RECIPIENTS} contacts per request`);
  }

  const { data: contacts, error: cErr } = await svc
    .from("contacts")
    .select(
      "id, sms_opt_out, first_name, last_name, name, user_id, owner_id, contact_channels ( channel_type, value, is_primary )",
    )
    .in("id", uniqueIds);

  if (cErr) {
    throw new Error(cErr.message);
  }

  const allowed = (contacts ?? []).filter((c) => {
    const r = c as RecipientRow & { user_id: string | null; owner_id: string | null };
    return r.user_id === userId || r.owner_id === userId;
  }) as RecipientRow[];

  const batchId = crypto.randomUUID();
  const messages: { to: string; message: string; contact_id: string }[] = [];
  const skipped: { contact_id: string; reason: string }[] = [];

  for (const c of allowed) {
    if (c.sms_opt_out === true) {
      skipped.push({ contact_id: c.id, reason: "sms_opt_out" });
      continue;
    }
    const rawPhone = primaryPhone(c.contact_channels);
    if (!rawPhone?.trim()) {
      skipped.push({ contact_id: c.id, reason: "no_phone" });
      continue;
    }
    let to = rawPhone.trim().replace(/\s/g, "");
    if (/^0?4\d{8}$/.test(to.replace(/\D/g, "")) || /^61\d{9}$/.test(to.replace(/\D/g, ""))) {
      to = toE164Australia(to);
    }
    if (digitsKey(to).length < 8) {
      skipped.push({ contact_id: c.id, reason: "invalid_phone" });
      continue;
    }
    let text = mergeSmsTemplateForRecipient(message, c, mergeFields, smsSignatureFromDb);
    if (appendOptOut) {
      text = appendCommercialOptOutIfMissing(text);
    }
    if (!text.trim()) {
      skipped.push({ contact_id: c.id, reason: "empty_message" });
      continue;
    }
    messages.push({ to, message: text.trim(), contact_id: c.id });
  }

  const notFound = uniqueIds.filter((id) => !allowed.some((c) => c.id === id));
  for (const id of notFound) {
    skipped.push({ contact_id: id, reason: "not_found_or_denied" });
  }

  let sent = 0;
  const failures: { to: string; contact_id: string; error: string }[] = [];

  for (let i = 0; i < messages.length; i += MM_BATCH) {
    const chunk = messages.slice(i, i + MM_BATCH);
    const batch = await postMobileMessageBatch(
      mmCreds,
      chunk.map((m) => ({ to: m.to, message: m.message })),
    );
    const results = (batch.data?.results as Array<{ message_id?: string; status?: string; error?: string }> | undefined) ??
      [];

    if (!batch.ok) {
      const err =
        (batch.data?.error as string) || (batch.data?.message as string) || `HTTP ${batch.status}`;
      for (const m of chunk) {
        failures.push({ to: m.to, contact_id: m.contact_id, error: err });
        await svc.from("sms_outbound").insert({
          user_id: userId,
          contact_id: m.contact_id,
          to_phone: m.to,
          body_preview: previewBody(m.message),
          provider: "mobile_message",
          provider_message_id: null,
          status: "failed",
          error: err.slice(0, 500),
          batch_id: batchId,
        });
      }
      continue;
    }

    for (let j = 0; j < chunk.length; j++) {
      const m = chunk[j];
      const r = results[j];
      const mid = r?.message_id ?? r?.status ?? null;
      const oneErr = r?.error as string | undefined;
      if (oneErr) {
        failures.push({ to: m.to, contact_id: m.contact_id, error: oneErr });
        await svc.from("sms_outbound").insert({
          user_id: userId,
          contact_id: m.contact_id,
          to_phone: m.to,
          body_preview: previewBody(m.message),
          provider: "mobile_message",
          provider_message_id: null,
          status: "failed",
          error: oneErr.slice(0, 500),
          batch_id: batchId,
        });
      } else {
        sent++;
        await svc.from("sms_outbound").insert({
          user_id: userId,
          contact_id: m.contact_id,
          to_phone: m.to,
          body_preview: previewBody(m.message),
          provider: "mobile_message",
          provider_message_id: typeof mid === "string" ? mid : null,
          status: "sent",
          error: null,
          batch_id: batchId,
        });
      }
    }
  }

  return {
    batch_id: batchId,
    sent,
    skipped,
    failures,
    total_requested: uniqueIds.length,
  };
}
