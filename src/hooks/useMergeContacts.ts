import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Contact } from "@/hooks/useContacts";
import {
  buildMergedContactUpdate,
  contactsShareSameDisplayName,
  getMergeEmailPhoneExtras,
} from "@/lib/mergeContactFields";
import { logContactActivity, invalidateContactInteractions } from "@/lib/contactActivityLog";
import { invalidateContactScoreQueries } from "@/lib/contactScoreQuery";

type Supabase = typeof supabase;

function normMergeEmail(v: string) {
  return v.trim().toLowerCase();
}

function normMergePhone(v: string) {
  return v.replace(/\s+/g, "");
}

function guessMergePhoneChannelType(value: string): "phone" | "mobile" {
  const d = normMergePhone(value).replace(/^\+61/, "0");
  if (/^04\d{8,9}$/.test(d)) return "mobile";
  return "phone";
}

/** Persist extra legacy emails/numbers as `contact_channels` so they show on the contact card. */
async function upsertMergeExtraChannels(
  client: Supabase,
  primaryId: string,
  emailExtras: string[],
  phoneExtras: string[],
): Promise<void> {
  try {
    const { data: existing, error: selErr } = await (client as any)
      .from("contact_channels")
      .select("channel_type, value")
      .eq("contact_id", primaryId);
    if (selErr) {
      if (String(selErr.message ?? "").includes("does not exist")) return;
      throw selErr;
    }
    const seenE = new Set<string>();
    const seenP = new Set<string>();
    for (const r of existing ?? []) {
      if (r.channel_type === "email" && r.value) seenE.add(normMergeEmail(String(r.value)));
      if (["phone", "mobile", "other"].includes(r.channel_type) && r.value) {
        seenP.add(normMergePhone(String(r.value)));
      }
    }
    const { data: row } = await client.from("contacts").select("email, phone, mobile").eq("id", primaryId).maybeSingle();
    const crow = row as { email?: string | null; phone?: string | null; mobile?: string | null } | null;
    if (crow?.email) seenE.add(normMergeEmail(crow.email));
    if (crow?.phone) seenP.add(normMergePhone(crow.phone));
    if (crow?.mobile) seenP.add(normMergePhone(crow.mobile));

    for (const em of emailExtras) {
      const v = em.trim();
      if (!v) continue;
      if (seenE.has(normMergeEmail(v))) continue;
      seenE.add(normMergeEmail(v));
      const { error } = await (client as any).from("contact_channels").insert({
        contact_id: primaryId,
        channel_type: "email",
        value: v,
        is_primary: false,
      });
      if (error) console.warn("merge: contact_channels email extra", error.message);
    }
    for (const ph of phoneExtras) {
      const v = ph.trim();
      if (!v) continue;
      if (seenP.has(normMergePhone(v))) continue;
      seenP.add(normMergePhone(v));
      const channel_type = guessMergePhoneChannelType(v);
      const { error } = await (client as any).from("contact_channels").insert({
        contact_id: primaryId,
        channel_type,
        value: v,
        is_primary: false,
      });
      if (error) console.warn("merge: contact_channels phone extra", error.message);
    }
  } catch (e) {
    console.warn("merge: upsertMergeExtraChannels", e);
  }
}

async function safeUpdateContactId(
  client: Supabase,
  table: string,
  fromContactId: string,
  toContactId: string
): Promise<void> {
  try {
    const { error } = await (client as any).from(table).update({ contact_id: toContactId }).eq("contact_id", fromContactId);
    if (error && !String(error.message ?? "").includes("does not exist")) {
      console.warn(`merge: skip ${table}`, error.message);
    }
  } catch (e) {
    console.warn(`merge: skip ${table}`, e);
  }
}

async function mergePropertyLinks(client: Supabase, primaryId: string, secondaryId: string): Promise<void> {
  try {
    const { data: primRows } = await (client as any)
      .from("contact_property_links")
      .select("property_id")
      .eq("contact_id", primaryId);
    const primaryProps = new Set((primRows ?? []).map((r: { property_id: string }) => r.property_id));
    const { data: secLinks } = await (client as any)
      .from("contact_property_links")
      .select("id, property_id")
      .eq("contact_id", secondaryId);
    for (const l of secLinks ?? []) {
      if (primaryProps.has(l.property_id)) {
        await (client as any).from("contact_property_links").delete().eq("id", l.id);
      } else {
        await (client as any).from("contact_property_links").update({ contact_id: primaryId }).eq("id", l.id);
        primaryProps.add(l.property_id);
      }
    }
  } catch (e) {
    console.warn("merge: contact_property_links", e);
  }
}

async function mergeContactTags(client: Supabase, primaryId: string, secondaryId: string): Promise<void> {
  try {
    const { data: rows } = await client.from("contact_tags").select("tag_id").eq("contact_id", secondaryId);
    for (const row of rows ?? []) {
      const { data: clash } = await client
        .from("contact_tags")
        .select("tag_id")
        .eq("contact_id", primaryId)
        .eq("tag_id", row.tag_id)
        .maybeSingle();
      if (clash) {
        await client.from("contact_tags").delete().eq("contact_id", secondaryId).eq("tag_id", row.tag_id);
      } else {
        await client
          .from("contact_tags")
          .update({ contact_id: primaryId })
          .eq("contact_id", secondaryId)
          .eq("tag_id", row.tag_id);
      }
    }
  } catch (e) {
    console.warn("merge: contact_tags", e);
  }
}

async function mergeContactChannels(client: Supabase, primaryId: string, secondaryId: string): Promise<void> {
  try {
    const { data: secs } = await client.from("contact_channels").select("id, channel_type, value").eq("contact_id", secondaryId);
    for (const ch of secs ?? []) {
      const { data: clash } = await client
        .from("contact_channels")
        .select("id")
        .eq("contact_id", primaryId)
        .eq("channel_type", ch.channel_type)
        .eq("value", ch.value)
        .maybeSingle();
      if (clash) await client.from("contact_channels").delete().eq("id", ch.id);
      else await client.from("contact_channels").update({ contact_id: primaryId }).eq("id", ch.id);
    }
  } catch (e) {
    console.warn("merge: contact_channels", e);
  }
}

async function mergeContactAddresses(client: Supabase, primaryId: string, secondaryId: string): Promise<void> {
  try {
    const { error } = await (client as any)
      .from("contact_addresses")
      .update({ contact_id: primaryId, is_primary: false })
      .eq("contact_id", secondaryId);
    if (error) console.warn("merge: contact_addresses", error.message);
  } catch (e) {
    console.warn("merge: contact_addresses", e);
  }
}

async function mergeNurtureEnrollments(client: Supabase, primaryId: string, secondaryId: string): Promise<void> {
  try {
    const { data: secs } = await (client as any)
      .from("nurture_sequence_enrollments")
      .select("id, sequence_id, completed_at")
      .eq("contact_id", secondaryId);
    for (const e of secs ?? []) {
      const { data: clash } = await (client as any)
        .from("nurture_sequence_enrollments")
        .select("id")
        .eq("contact_id", primaryId)
        .eq("sequence_id", e.sequence_id)
        .is("completed_at", null)
        .maybeSingle();
      if (clash && !e.completed_at) {
        await (client as any).from("nurture_sequence_enrollments").delete().eq("id", e.id);
      } else {
        const { error } = await (client as any)
          .from("nurture_sequence_enrollments")
          .update({ contact_id: primaryId })
          .eq("id", e.id);
        if (error) {
          await (client as any).from("nurture_sequence_enrollments").delete().eq("id", e.id);
        }
      }
    }
  } catch (e) {
    console.warn("merge: nurture_sequence_enrollments", e);
  }
}

/** UNIQUE (listing_id, contact_id, role) */
async function mergeListingContactLinks(client: Supabase, primaryId: string, secondaryId: string): Promise<void> {
  try {
    const { data: secs } = await (client as any)
      .from("listing_contact_links")
      .select("id, listing_id, role")
      .eq("contact_id", secondaryId);
    for (const row of secs ?? []) {
      const { data: clash } = await (client as any)
        .from("listing_contact_links")
        .select("id")
        .eq("contact_id", primaryId)
        .eq("listing_id", row.listing_id)
        .eq("role", row.role)
        .maybeSingle();
      if (clash) await (client as any).from("listing_contact_links").delete().eq("id", row.id);
      else await (client as any).from("listing_contact_links").update({ contact_id: primaryId }).eq("id", row.id);
    }
  } catch (e) {
    console.warn("merge: listing_contact_links", e);
  }
}

/** PRIMARY KEY (list_id, contact_id) */
async function mergeSmsContactListMembers(client: Supabase, primaryId: string, secondaryId: string): Promise<void> {
  try {
    const { data: secs } = await (client as any)
      .from("sms_contact_list_members")
      .select("list_id")
      .eq("contact_id", secondaryId);
    for (const row of secs ?? []) {
      const { data: clash } = await (client as any)
        .from("sms_contact_list_members")
        .select("list_id")
        .eq("contact_id", primaryId)
        .eq("list_id", row.list_id)
        .maybeSingle();
      if (clash) {
        await (client as any)
          .from("sms_contact_list_members")
          .delete()
          .eq("list_id", row.list_id)
          .eq("contact_id", secondaryId);
      } else {
        await (client as any)
          .from("sms_contact_list_members")
          .update({ contact_id: primaryId })
          .eq("list_id", row.list_id)
          .eq("contact_id", secondaryId);
      }
    }
  } catch (e) {
    console.warn("merge: sms_contact_list_members", e);
  }
}

/** PRIMARY KEY (broadcast_id, contact_id) */
async function mergeSmsScheduledBroadcastRecipients(client: Supabase, primaryId: string, secondaryId: string): Promise<void> {
  try {
    const { data: secs } = await (client as any)
      .from("sms_scheduled_broadcast_recipients")
      .select("broadcast_id")
      .eq("contact_id", secondaryId);
    for (const row of secs ?? []) {
      const { data: clash } = await (client as any)
        .from("sms_scheduled_broadcast_recipients")
        .select("broadcast_id")
        .eq("contact_id", primaryId)
        .eq("broadcast_id", row.broadcast_id)
        .maybeSingle();
      if (clash) {
        await (client as any)
          .from("sms_scheduled_broadcast_recipients")
          .delete()
          .eq("broadcast_id", row.broadcast_id)
          .eq("contact_id", secondaryId);
      } else {
        await (client as any)
          .from("sms_scheduled_broadcast_recipients")
          .update({ contact_id: primaryId })
          .eq("broadcast_id", row.broadcast_id)
          .eq("contact_id", secondaryId);
      }
    }
  } catch (e) {
    console.warn("merge: sms_scheduled_broadcast_recipients", e);
  }
}

/** UNIQUE (user_id, contact_id, year) */
async function mergeAnnualReviews(client: Supabase, primaryId: string, secondaryId: string): Promise<void> {
  try {
    const { data: secs } = await (client as any)
      .from("annual_reviews")
      .select("id, user_id, year")
      .eq("contact_id", secondaryId);
    for (const row of secs ?? []) {
      const { data: clash } = await (client as any)
        .from("annual_reviews")
        .select("id")
        .eq("contact_id", primaryId)
        .eq("user_id", row.user_id)
        .eq("year", row.year)
        .maybeSingle();
      if (clash) await (client as any).from("annual_reviews").delete().eq("id", row.id);
      else await (client as any).from("annual_reviews").update({ contact_id: primaryId }).eq("id", row.id);
    }
  } catch (e) {
    console.warn("merge: annual_reviews", e);
  }
}

/** UNIQUE (event_id, contact_id) */
async function mergeEventInvites(client: Supabase, primaryId: string, secondaryId: string): Promise<void> {
  try {
    const { data: secs } = await (client as any).from("event_invites").select("id, event_id").eq("contact_id", secondaryId);
    for (const row of secs ?? []) {
      const { data: clash } = await (client as any)
        .from("event_invites")
        .select("id")
        .eq("contact_id", primaryId)
        .eq("event_id", row.event_id)
        .maybeSingle();
      if (clash) await (client as any).from("event_invites").delete().eq("id", row.id);
      else await (client as any).from("event_invites").update({ contact_id: primaryId }).eq("id", row.id);
    }
  } catch (e) {
    console.warn("merge: event_invites", e);
  }
}

async function deleteSecondaryContactScores(client: Supabase, secondaryIds: string[]): Promise<void> {
  try {
    await (client as any).from("contact_scores").delete().in("contact_id", secondaryIds);
  } catch {
    /* optional table */
  }
}

async function repointForeignKeys(client: Supabase, primaryId: string, secondaryId: string): Promise<void> {
  await mergePropertyLinks(client, primaryId, secondaryId);
  await mergeContactTags(client, primaryId, secondaryId);
  await mergeContactChannels(client, primaryId, secondaryId);
  await mergeContactAddresses(client, primaryId, secondaryId);
  await mergeNurtureEnrollments(client, primaryId, secondaryId);
  await mergeListingContactLinks(client, primaryId, secondaryId);
  await mergeSmsContactListMembers(client, primaryId, secondaryId);
  await mergeSmsScheduledBroadcastRecipients(client, primaryId, secondaryId);
  await mergeAnnualReviews(client, primaryId, secondaryId);
  await mergeEventInvites(client, primaryId, secondaryId);

  const simpleTables = [
    "contact_tasks",
    "contact_documents",
    "interactions",
    "activities",
    "activity_log",
    "appointments",
    "touches",
    "leads",
    "deal_contacts",
    "list_memberships",
    "sequence_enrollments",
    "tasks",
    "contact_companies",
    "crm_workflow_enrollments",
    "calls",
    "sms_outbound",
    "listings",
  ] as const;
  for (const t of simpleTables) {
    await safeUpdateContactId(client, t, secondaryId, primaryId);
  }

  try {
    await (client as any).from("deals").update({ primary_contact_id: primaryId }).eq("primary_contact_id", secondaryId);
  } catch {
    /* */
  }
  try {
    await (client as any).from("properties").update({ owner_contact_id: primaryId }).eq("owner_contact_id", secondaryId);
  } catch {
    /* */
  }
}

export type MergeContactsInput = {
  primaryContactId: string;
  /** All contacts to merge into primary (includes primary id or not — we derive secondaries from this list). */
  contacts: Contact[];
};

export function useMergeContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ primaryContactId, contacts }: MergeContactsInput) => {
      const ids = [...new Set(contacts.map((c) => c.id))];
      if (ids.length < 2) throw new Error("Select at least two contacts to merge.");
      if (!ids.includes(primaryContactId)) throw new Error("Primary contact must be one of the selected contacts.");

      const primary = contacts.find((c) => c.id === primaryContactId);
      if (!primary) throw new Error("Primary contact not found.");

      const secondaries = contacts.filter((c) => c.id !== primaryContactId);
      const secondaryIds = secondaries.map((c) => c.id);

      const userIds = new Set(contacts.map((c) => c.user_id).filter(Boolean));
      if (userIds.size > 1) {
        throw new Error("Selected contacts belong to different users; merge is not allowed.");
      }

      for (const sid of secondaryIds) {
        await repointForeignKeys(supabase, primaryContactId, sid);
      }

      await deleteSecondaryContactScores(supabase, secondaryIds);

      const mergedPayload = buildMergedContactUpdate(primary, secondaries);
      const { error: upErr } = await supabase.from("contacts").update(mergedPayload).eq("id", primaryContactId);
      if (upErr) throw upErr;

      const { emailExtras, phoneExtras } = getMergeEmailPhoneExtras(primary, secondaries);
      await upsertMergeExtraChannels(supabase, primaryContactId, emailExtras, phoneExtras);

      const { error: delErr } = await supabase.from("contacts").delete().in("id", secondaryIds);
      if (delErr) throw delErr;

      const mergedNames = contacts.map((c) => c.name ?? "").filter(Boolean).join(" · ");
      await logContactActivity({
        contactId: primaryContactId,
        subject: "Contacts merged",
        body: `Merged ${secondaryIds.length} duplicate(s) into this card. ${mergedNames ? `Sources: ${mergedNames}` : ""}`.trim(),
      });

      return { primaryContactId, removedIds: secondaryIds };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact", data.primaryContactId] });
      queryClient.invalidateQueries({ queryKey: ["contact_channels", data.primaryContactId] });
      invalidateContactInteractions(queryClient, data.primaryContactId);
      invalidateContactScoreQueries(queryClient);
    },
  });
}

export { contactsShareSameDisplayName };
