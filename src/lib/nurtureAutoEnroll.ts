import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  autoEnrollPrecheckSkipReason,
  candidateSequenceNamesForClassification,
  type ClassificationForSequence,
} from "@/lib/leadCategoryDerivation";
import { logContactActivity } from "@/lib/contactActivityLog";

type DDClient = SupabaseClient<Database>;

/** Call sites pass Supabase row fields (`journey_stage`, …); mapping uses camelCase. */
export type AutoEnrollClassificationInput = ClassificationForSequence & {
  journey_stage?: string | null;
  role_category?: string | null;
  lead_temperature?: string | null;
  do_not_contact?: boolean | null;
};

function normalizeClassificationForAutoEnroll(input: AutoEnrollClassificationInput): ClassificationForSequence {
  return {
    journeyStage: input.journeyStage ?? input.journey_stage ?? null,
    roleCategory: input.roleCategory ?? input.role_category ?? null,
    leadTemperature: input.leadTemperature ?? input.lead_temperature ?? null,
    doNotContact: input.doNotContact ?? input.do_not_contact ?? null,
  };
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function normalizeSeqName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Pick first nurture sequence whose `name` matches a candidate (exact, then normalised).
 */
export function resolveSequenceIdFromNames(
  sequences: { id: string; name: string }[],
  candidateNames: string[]
): { id: string; name: string } | null {
  const rows = sequences.filter((s) => s.name?.trim());
  for (const cand of candidateNames) {
    const c = cand.trim();
    if (!c) continue;
    const exact = rows.find((r) => r.name.trim() === c);
    if (exact) return { id: exact.id, name: exact.name };
    const cn = normalizeSeqName(c);
    const loose = rows.find((r) => normalizeSeqName(r.name) === cn);
    if (loose) return { id: loose.id, name: loose.name };
  }
  return null;
}

export async function completeActiveNurtureEnrollmentsForContact(
  client: DDClient,
  userId: string,
  contactId: string
): Promise<void> {
  const { data: rows } = await client
    .from("nurture_sequence_enrollments")
    .select("id")
    .eq("contact_id", contactId)
    .eq("user_id", userId)
    .is("completed_at", null);
  const ids = (rows ?? []).map((r) => r.id);
  if (ids.length === 0) return;
  const now = new Date().toISOString();
  await client
    .from("nurture_sequence_enrollments")
    .update({ completed_at: now, next_step_at: null })
    .in("id", ids);
}

export async function insertNurtureEnrollmentRow(
  client: DDClient,
  userId: string,
  contactId: string,
  sequenceId: string,
  pauseFollowup = false
): Promise<void> {
  const { data: steps, error: se } = await client
    .from("nurture_sequence_steps")
    .select("offset_days, sort_order")
    .eq("sequence_id", sequenceId)
    .order("sort_order", { ascending: true });
  if (se) throw se;
  const list = (steps ?? []) as { offset_days: number | null }[];
  if (list.length === 0) throw new Error("Sequence has no steps");
  const started = new Date();
  const firstOffset = list[0]?.offset_days ?? 0;
  const nextAt = addDays(started, firstOffset);
  const { error } = await client.from("nurture_sequence_enrollments").insert({
    contact_id: contactId,
    sequence_id: sequenceId,
    user_id: userId,
    current_step_index: 0,
    started_at: started.toISOString(),
    next_step_at: nextAt.toISOString(),
    pause_followup_cadence: pauseFollowup,
  });
  if (error) throw error;
}

export type AutoEnrollResult =
  | { ok: true; sequenceName: string; sequenceId: string }
  | {
      ok: false;
      reason:
        | "skipped_do_not_contact"
        | "skipped_lead_archived"
        | "skipped_referral_partner"
        | "no_candidates"
        | "no_matching_sequence"
        | "already_enrolled";
      candidates?: string[];
    };

/**
 * If classification maps to a starter-pack sequence name, enroll this contact (replacing other active nurture enrollments).
 */
export async function tryAutoEnrollNurtureForContact(
  client: DDClient,
  userId: string,
  contactId: string,
  classification: AutoEnrollClassificationInput
): Promise<AutoEnrollResult> {
  const c = normalizeClassificationForAutoEnroll(classification);
  const pre = autoEnrollPrecheckSkipReason(c);
  if (pre === "do_not_contact") return { ok: false, reason: "skipped_do_not_contact" };
  if (pre === "lead_archived") return { ok: false, reason: "skipped_lead_archived" };
  if (pre === "referral_partner") return { ok: false, reason: "skipped_referral_partner" };

  const candidates = candidateSequenceNamesForClassification(c);
  if (candidates.length === 0) return { ok: false, reason: "no_candidates", candidates: [] };

  const { data: seqRows, error: sqErr } = await client
    .from("nurture_sequences")
    .select("id, name, is_active")
    .eq("user_id", userId);
  if (sqErr) throw sqErr;

  const seqIds = (seqRows ?? []).map((s) => s.id);
  let withSteps = new Set<string>();
  if (seqIds.length > 0) {
    const { data: stepCounts, error: stErr } = await client
      .from("nurture_sequence_steps")
      .select("sequence_id")
      .in("sequence_id", seqIds);
    if (stErr) throw stErr;
    withSteps = new Set((stepCounts ?? []).map((r) => r.sequence_id));
  }
  const activeWithSteps = (seqRows ?? []).filter(
    (s) => s.is_active !== false && withSteps.has(s.id)
  ) as { id: string; name: string }[];

  const target = resolveSequenceIdFromNames(activeWithSteps, candidates);
  if (!target) return { ok: false, reason: "no_matching_sequence", candidates };

  const { data: openEnroll } = await client
    .from("nurture_sequence_enrollments")
    .select("id, sequence_id")
    .eq("contact_id", contactId)
    .eq("user_id", userId)
    .is("completed_at", null);

  if ((openEnroll ?? []).some((e) => e.sequence_id === target.id)) {
    return { ok: false, reason: "already_enrolled" };
  }

  await completeActiveNurtureEnrollmentsForContact(client, userId, contactId);
  await insertNurtureEnrollmentRow(client, userId, contactId, target.id, false);

  await logContactActivity({
    contactId,
    subject: "Nurture sequence auto-assigned",
    body: `Sequence: ${target.name} (from classification)`,
  });

  return { ok: true, sequenceName: target.name, sequenceId: target.id };
}
