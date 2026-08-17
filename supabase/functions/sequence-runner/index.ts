import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  appendCommercialOptOutIfMissing,
  mobileMessageCredsFromEnv,
  postMobileMessageBatch,
  toE164Australia,
} from "../_shared/smsCore.ts";
import {
  applyMerge,
  buildMergeContext,
  findUnresolvedTokens,
  type MergeContext,
} from "../_shared/mergeCore.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "onboarding@resend.dev";

const AGENT_EMAIL = Deno.env.get("AGENT_EMAIL") || "greg.leigh@qldsir.com";
const AGENT_NAME = Deno.env.get("AGENT_NAME") || "Greg Leigh";
const AGENT_PHONE = Deno.env.get("AGENT_PHONE") || "0466 805 992";

const REPLY_TO_EMAIL = Deno.env.get("REPLY_TO_EMAIL") || "replies@venuachiax.resend.app";

const CONTACT_SELECT =
  `id, name, first_name, last_name, email, mobile, phone, suburb, city, state, postcode, address, address_line1, sms_opt_out, email_opt_out, do_not_contact, dnc_sms, dnc_email, contact_channels ( channel_type, value, is_primary )`;

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function brandEmail(innerHtml: string): string {
  const looksComplete = /<\s*(!doctype|html)\b/i.test(innerHtml);
  if (looksComplete) return innerHtml;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f3efe7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3efe7" style="background-color:#f3efe7;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e8e1d4;">
  <tr><td bgcolor="#0e2140" align="center" style="background-color:#0e2140;padding:36px 40px;text-align:center;">
    <div style="font-family:Georgia,'Times New Roman',Times,serif;font-weight:600;font-size:28px;line-height:1.1;letter-spacing:.18em;color:#ffffff;">GREG&nbsp;LEIGH</div>
    <div style="margin-top:6px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:.34em;text-transform:uppercase;color:#c6b58a;">Redlands Coast Real Estate</div>
  </td></tr>
  <tr><td bgcolor="#b08d3f" height="3" style="background-color:#b08d3f;height:3px;line-height:3px;font-size:0;">&nbsp;</td></tr>
  <tr><td style="padding:44px 44px 8px;font-family:Georgia,'Times New Roman',Times,serif;font-size:16px;line-height:26px;color:#20242e;">
    ${innerHtml}
  </td></tr>
  <tr><td style="padding:8px 44px 40px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td bgcolor="#e8e1d4" height="1" style="background-color:#e8e1d4;height:1px;line-height:1px;font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding-top:22px;">
        <p style="margin:0 0 12px;font-family:Georgia,'Times New Roman',Times,serif;font-size:15px;line-height:24px;color:#20242e;">Kind regards,</p>
        <p style="margin:0 0 4px;font-family:Georgia,'Times New Roman',Times,serif;font-size:21px;line-height:26px;color:#0e2140;">${AGENT_NAME}</p>
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:20px;color:#6b6b6b;">Senior Sales Executive<br>Queensland Sotheby's International Realty<br>${AGENT_PHONE}<br><a href="https://www.gregleighproperty.com.au" style="color:#b08d3f;text-decoration:none;">www.gregleighproperty.com.au</a></p>
      </td></tr>
    </table>
  </td></tr>
  <tr><td bgcolor="#f3efe7" align="center" style="background-color:#f3efe7;padding:20px 40px;border-top:1px solid #e8e1d4;">
    <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;color:#8a8a8a;">Queensland Sotheby's International Realty &nbsp;&middot;&nbsp; Redlands Coast<br>${AGENT_NAME} &nbsp;&middot;&nbsp; ${AGENT_PHONE} &nbsp;&middot;&nbsp; ${AGENT_EMAIL}<br>Each office is independently owned and operated.</p>
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;color:#8a8a8a;">Don't want these updates? <a href="mailto:${AGENT_EMAIL}?subject=Unsubscribe" style="color:#8a8a8a;">Unsubscribe here</a> and I'll take you off the list.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function getContactEmail(contact: {
  email?: string | null;
  contact_channels?: Array<{ channel_type: string; value?: string | null; is_primary?: boolean }>;
} | null): string | null {
  if (!contact) return null;
  const channels = contact.contact_channels ?? [];
  const primary = channels.find((c) => c.channel_type === "email" && c.is_primary);
  if (primary?.value) return String(primary.value);
  const anyEmail = channels.find((c) => c.channel_type === "email" && c.value);
  if (anyEmail?.value) return String(anyEmail.value);
  return contact.email ?? null;
}

function getContactPhone(contact: {
  mobile?: string | null;
  phone?: string | null;
  contact_channels?: Array<{ channel_type: string; value?: string | null; is_primary?: boolean | null }>;
} | null): string | null {
  if (!contact) return null;
  const channels = contact.contact_channels ?? [];
  const primary = channels.find((c) => c.channel_type === "phone" && c.is_primary && c.value);
  if (primary?.value) return String(primary.value);
  const anyP = channels.find((c) => c.channel_type === "phone" && c.value);
  if (anyP?.value) return String(anyP.value);
  return contact.mobile ?? contact.phone ?? null;
}

function mergeNurtureSmsBody(
  template: string,
  contact: { first_name?: string | null; last_name?: string | null; name?: string | null },
): string {
  const first = (contact?.first_name ?? "").trim() || (contact?.name ?? "").split(/\s+/)[0] || "";
  const last = (contact?.last_name ?? "").trim();
  const name = (contact?.name ?? "").trim() || [first, last].filter(Boolean).join(" ");
  return template
    .replace(/\{\{\s*first_name\s*\}\}/gi, first)
    .replace(/\{\{\s*last_name\s*\}\}/gi, last)
    .replace(/\{\{\s*name\s*\}\}/gi, name);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing Supabase env" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date().toISOString();

    const { data: enrollments, error: enrErr } = await supabase
      .from("nurture_sequence_enrollments")
      .select("id, contact_id, sequence_id, user_id, current_step_index, started_at, next_step_at")
      .is("completed_at", null)
      .not("next_step_at", "is", null)
      .lte("next_step_at", now)
      .eq("pause_followup_cadence", false);

    if (enrErr) {
      return new Response(JSON.stringify({ error: enrErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { enrollment_id: string; action: string; detail?: string }[] = [];

    async function mergeContextFor(contact: Record<string, unknown> | null, contactId: string): Promise<MergeContext> {
      let listingAddress: string | null = null;
      const { data: listing } = await supabase
        .from("listings")
        .select("address, created_at")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (listing?.address) listingAddress = String(listing.address);
      return buildMergeContext(contact as Parameters<typeof buildMergeContext>[0], { listingAddress });
    }

    for (const enr of enrollments ?? []) {
      const enrollment = enr as {
        id: string;
        contact_id: string;
        sequence_id: string;
        user_id: string;
        current_step_index: number;
        started_at: string;
      };

      const { data: steps, error: stErr } = await supabase
        .from("nurture_sequence_steps")
        .select("*")
        .eq("sequence_id", enrollment.sequence_id)
        .order("sort_order", { ascending: true });

      if (stErr || !steps?.length) {
        results.push({ enrollment_id: enrollment.id, action: "skip", detail: stErr?.message ?? "no steps" });
        continue;
      }

      const idx = enrollment.current_step_index;
      const step = steps[idx] as {
        id: string;
        offset_days: number;
        step_type: string;
        title: string;
        body: string | null;
        email_subject: string | null;
        email_html: string | null;
      };

      if (!step) {
        await supabase
          .from("nurture_sequence_enrollments")
          .update({ completed_at: new Date().toISOString(), next_step_at: null })
          .eq("id", enrollment.id);
        results.push({ enrollment_id: enrollment.id, action: "completed", detail: "no step at index" });
        continue;
      }

      const { data: existingRun, error: runLookupErr } = await supabase
        .from("nurture_sequence_step_runs")
        .select("id, status, error, task_id")
        .eq("enrollment_id", enrollment.id)
        .eq("step_index", idx)
        .maybeSingle();

      if (runLookupErr) {
        results.push({ enrollment_id: enrollment.id, action: "step_run_lookup_error", detail: runLookupErr.message });
        continue;
      }

      if (existingRun) {
        if (existingRun.status === "pending") {
          if ((step.step_type === "email" || step.step_type === "sms") && !existingRun.error) {
            const { data: existingNotif } = await supabase
              .from("notifications")
              .select("id")
              .eq("user_id", enrollment.user_id)
              .eq("kind", "nurture_step_due")
              .eq("entity_type", "nurture_sequence_step_runs")
              .eq("entity_id", existingRun.id)
              .maybeSingle();

            if (!existingNotif) {
              await supabase.from("notifications").insert({
                user_id: enrollment.user_id,
                kind: "nurture_step_due",
                title: step.title,
                body: "Sequence step is due now.",
                entity_type: "nurture_sequence_step_runs",
                entity_id: existingRun.id,
                read_at: null,
              });
            }

            const { error: rpcErr } = await supabase.rpc("complete_nurture_step_and_advance", {
              p_enrollment_id: enrollment.id,
              p_step_run_id: existingRun.id,
              p_outcome: "completed",
            });

            if (rpcErr) {
              results.push({ enrollment_id: enrollment.id, action: "rpc_error_after_pending_run", detail: rpcErr.message });
              continue;
            }

            results.push({ enrollment_id: enrollment.id, action: "advanced_after_pending_run" });
            continue;
          }

          const { data: existingNotif } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", enrollment.user_id)
            .eq("kind", "nurture_step_due")
            .eq("entity_type", "nurture_sequence_step_runs")
            .eq("entity_id", existingRun.id)
            .maybeSingle();

          if (!existingNotif) {
            await supabase.from("notifications").insert({
              user_id: enrollment.user_id,
              kind: "nurture_step_due",
              title: step.title,
              body: "Sequence step is due now.",
              entity_type: "nurture_sequence_step_runs",
              entity_id: existingRun.id,
              read_at: null,
            });
          }

          results.push({ enrollment_id: enrollment.id, action: existingNotif ? "already_notified" : "notification_created_for_pending_run" });
          continue;
        }

        results.push({ enrollment_id: enrollment.id, action: `already_${existingRun.status}` });
        continue;
      }

      const startedAt = new Date(enrollment.started_at);
      const dueAt = addDays(startedAt, step.offset_days);

      const { data: contact } = await supabase
        .from("contacts")
        .select(CONTACT_SELECT)
        .eq("id", enrollment.contact_id)
        .single();

      if (step.step_type === "task" || step.step_type === "prompt") {
        const { data: taskRow, error: taskErr } = await supabase
          .from("contact_tasks")
          .insert({
            contact_id: enrollment.contact_id,
            user_id: enrollment.user_id,
            title: step.title,
            notes: step.body,
            due_at: dueAt.toISOString(),
            sequence_enrollment_id: enrollment.id,
          })
          .select("id")
          .single();
        if (taskErr) {
          results.push({ enrollment_id: enrollment.id, action: "task_error", detail: taskErr.message });
          continue;
        }
        const { data: runRow, error: runErr } = await supabase
          .from("nurture_sequence_step_runs")
          .insert({
            enrollment_id: enrollment.id,
            step_index: idx,
            step_id: step.id,
            status: "pending",
            task_id: taskRow?.id ?? null,
            activated_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (runErr) {
          results.push({ enrollment_id: enrollment.id, action: "step_run_error", detail: runErr.message });
          continue;
        }
        const createdRunId = runRow?.id as string | undefined;
        await supabase.from("notifications").insert({
          user_id: enrollment.user_id,
          kind: "nurture_step_due",
          title: step.title,
          body: "Sequence step is due now.",
          entity_type: "nurture_sequence_step_runs",
          entity_id: createdRunId ?? null,
          read_at: null,
        });
        results.push({ enrollment_id: enrollment.id, action: "task_created" });
      } else if (step.step_type === "email") {
        const cE = contact as {
          email_opt_out?: boolean | null;
          dnc_email?: boolean | null;
          do_not_contact?: boolean | null;
        } | null;
        const emailBlocked = cE?.email_opt_out === true || cE?.dnc_email === true || cE?.do_not_contact === true;

        const to = emailBlocked
          ? null
          : getContactEmail(contact as {
              email?: string | null;
              contact_channels?: Array<{ channel_type: string; value?: string | null; is_primary?: boolean }>;
            } | null);

        const ctx = await mergeContextFor(contact as Record<string, unknown> | null, enrollment.contact_id);
        const rawSubject = step.email_subject || step.title;
        const rawBody = step.email_html || `<p>${(step.body || "").replace(/\n/g, "<br/>")}</p>`;
        const mergedSubject = applyMerge(rawSubject, ctx);
        const mergedBody = applyMerge(rawBody, ctx);
        const unresolved = findUnresolvedTokens(mergedSubject, mergedBody);

        if (!to || !RESEND_API_KEY || unresolved.length > 0) {
          const reason = emailBlocked
            ? " (contact opted out of email)"
            : !to
            ? " (missing contact email)"
            : unresolved.length > 0
            ? ` (unresolved merge fields: ${unresolved.join(", ")} - fill these in and send manually)`
            : "";
          const { data: taskRow, error: taskErr } = await supabase
            .from("contact_tasks")
            .insert({
              contact_id: enrollment.contact_id,
              user_id: enrollment.user_id,
              title: step.title,
              notes: (step.body || "Email step requires manual action") + reason +
                (unresolved.length > 0 ? `\n\n--- DRAFT (subject) ---\n${mergedSubject}` : ""),
              due_at: dueAt.toISOString(),
              sequence_enrollment_id: enrollment.id,
            })
            .select("id")
            .single();
          if (taskErr) {
            results.push({ enrollment_id: enrollment.id, action: "email_fallback_task_error", detail: taskErr.message });
            continue;
          }
          const { data: runRow, error: runErr } = await supabase
            .from("nurture_sequence_step_runs")
            .insert({
              enrollment_id: enrollment.id,
              step_index: idx,
              step_id: step.id,
              status: "pending",
              task_id: taskRow?.id ?? null,
              activated_at: new Date().toISOString(),
              error: emailBlocked
                ? "contact_email_opt_out"
                : !to
                ? "missing_contact_email"
                : unresolved.length > 0
                ? "unresolved_merge_tokens"
                : "missing_resend_api_key",
            })
            .select("id")
            .single();
          if (runErr) {
            results.push({ enrollment_id: enrollment.id, action: "email_fallback_run_error", detail: runErr.message });
            continue;
          }
          const createdRunId = runRow?.id as string | undefined;
          await supabase.from("notifications").insert({
            user_id: enrollment.user_id,
            kind: "nurture_step_due",
            title: step.title,
            body: emailBlocked
              ? "Email step is due, but the contact has opted out of email."
              : !to
              ? "Email step is due, but contact has no email."
              : unresolved.length > 0
              ? `Email step held back - unresolved merge fields: ${unresolved.join(", ")}.`
              : "Email step is due, but email delivery is not configured.",
            entity_type: "nurture_sequence_step_runs",
            entity_id: createdRunId ?? null,
            read_at: null,
          });
          results.push({
            enrollment_id: enrollment.id,
            action: unresolved.length > 0 ? "email_held_unresolved_tokens" : "email_fallback_task_created",
            detail: unresolved.length > 0 ? unresolved.join(", ") : undefined,
          });
          continue;
        }

        const html = brandEmail(mergedBody);
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: EMAIL_FROM,
            to: [to],
            bcc: [AGENT_EMAIL],
            reply_to: REPLY_TO_EMAIL,
            subject: mergedSubject,
            html,
            headers: {
              "List-Unsubscribe": `<mailto:${AGENT_EMAIL}?subject=Unsubscribe>`,
            },
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          results.push({ enrollment_id: enrollment.id, action: "email_failed", detail: err?.message });
          continue;
        }

        const { data: runRow, error: runErr } = await supabase
          .from("nurture_sequence_step_runs")
          .insert({
            enrollment_id: enrollment.id,
            step_index: idx,
            step_id: step.id,
            status: "pending",
            activated_at: new Date().toISOString(),
            error: null,
          })
          .select("id")
          .single();

        if (runErr) {
          results.push({ enrollment_id: enrollment.id, action: "email_run_error", detail: runErr.message });
          continue;
        }

        const createdRunId = runRow?.id as string | undefined;
        await supabase.from("notifications").insert({
          user_id: enrollment.user_id,
          kind: "nurture_step_due",
          title: step.title,
          body: "Sequence email step is due now.",
          entity_type: "nurture_sequence_step_runs",
          entity_id: createdRunId ?? null,
          read_at: null,
        });

        const { error: rpcErr } = await supabase.rpc("complete_nurture_step_and_advance", {
          p_enrollment_id: enrollment.id,
          p_step_run_id: createdRunId,
          p_outcome: "completed",
        });

        if (rpcErr) {
          results.push({ enrollment_id: enrollment.id, action: "email_rpc_error_after_send", detail: rpcErr.message });
          continue;
        }

        results.push({ enrollment_id: enrollment.id, action: "email_sent_and_advanced" });
      } else if (step.step_type === "sms") {
        const mm = mobileMessageCredsFromEnv();
        const c = contact as {
          sms_opt_out?: boolean | null;
          dnc_sms?: boolean | null;
          do_not_contact?: boolean | null;
          first_name?: string | null;
          last_name?: string | null;
          name?: string | null;
        } | null;

        const smsBlocked = c?.sms_opt_out === true || c?.dnc_sms === true || c?.do_not_contact === true;

        const msgTemplate = (step.body || step.title || "").trim() || "Message from your agent.";
        const smsCtx = await mergeContextFor(contact as Record<string, unknown> | null, enrollment.contact_id);
        const merged = appendCommercialOptOutIfMissing(
          applyMerge(mergeNurtureSmsBody(msgTemplate, c ?? {}), smsCtx),
        );
        const smsUnresolved = findUnresolvedTokens(merged);

        if (!mm || smsBlocked || smsUnresolved.length > 0) {
          const { data: taskRow, error: taskErr } = await supabase
            .from("contact_tasks")
            .insert({
              contact_id: enrollment.contact_id,
              user_id: enrollment.user_id,
              title: step.title,
              notes:
                (step.body || "SMS step requires manual action") +
                (!mm
                  ? " (Mobile Message not configured on sequence-runner)"
                  : smsBlocked
                  ? " (contact opted out of SMS)"
                  : ` (unresolved merge fields: ${smsUnresolved.join(", ")} - fill these in and send manually)`),
              due_at: dueAt.toISOString(),
              sequence_enrollment_id: enrollment.id,
            })
            .select("id")
            .single();
          if (taskErr) {
            results.push({ enrollment_id: enrollment.id, action: "sms_fallback_task_error", detail: taskErr.message });
            continue;
          }
          const { data: runRow, error: runErr } = await supabase
            .from("nurture_sequence_step_runs")
            .insert({
              enrollment_id: enrollment.id,
              step_index: idx,
              step_id: step.id,
              status: "pending",
              task_id: taskRow?.id ?? null,
              activated_at: new Date().toISOString(),
              error: !mm
                ? "missing_mobile_message_config"
                : smsBlocked
                ? "contact_sms_opt_out"
                : "unresolved_merge_tokens",
            })
            .select("id")
            .single();
          if (runErr) {
            results.push({ enrollment_id: enrollment.id, action: "sms_fallback_run_error", detail: runErr.message });
            continue;
          }
          const createdRunId = runRow?.id as string | undefined;
          await supabase.from("notifications").insert({
            user_id: enrollment.user_id,
            kind: "nurture_step_due",
            title: step.title,
            body: !mm
              ? "SMS step is due, but Mobile Message is not configured on the sequence-runner function."
              : smsBlocked
              ? "SMS step is due, but contact opted out of SMS."
              : `SMS step held back - unresolved merge fields: ${smsUnresolved.join(", ")}.`,
            entity_type: "nurture_sequence_step_runs",
            entity_id: createdRunId ?? null,
            read_at: null,
          });
          results.push({
            enrollment_id: enrollment.id,
            action: smsUnresolved.length > 0 ? "sms_held_unresolved_tokens" : "sms_fallback_task_created",
          });
          continue;
        }

        const rawPhone = getContactPhone(contact as Parameters<typeof getContactPhone>[0]);
        if (!rawPhone?.trim()) {
          const { data: taskRow, error: taskErr } = await supabase
            .from("contact_tasks")
            .insert({
              contact_id: enrollment.contact_id,
              user_id: enrollment.user_id,
              title: step.title,
              notes: (step.body || "SMS step") + " (missing contact phone)",
              due_at: dueAt.toISOString(),
              sequence_enrollment_id: enrollment.id,
            })
            .select("id")
            .single();
          if (taskErr) {
            results.push({ enrollment_id: enrollment.id, action: "sms_fallback_task_error", detail: taskErr.message });
            continue;
          }
          const { data: runRow, error: runErr } = await supabase
            .from("nurture_sequence_step_runs")
            .insert({
              enrollment_id: enrollment.id,
              step_index: idx,
              step_id: step.id,
              status: "pending",
              task_id: taskRow?.id ?? null,
              activated_at: new Date().toISOString(),
              error: "missing_contact_phone",
            })
            .select("id")
            .single();
          if (runErr) {
            results.push({ enrollment_id: enrollment.id, action: "sms_fallback_run_error", detail: runErr.message });
            continue;
          }
          const createdRunId = runRow?.id as string | undefined;
          await supabase.from("notifications").insert({
            user_id: enrollment.user_id,
            kind: "nurture_step_due",
            title: step.title,
            body: "SMS step is due, but contact has no phone number.",
            entity_type: "nurture_sequence_step_runs",
            entity_id: createdRunId ?? null,
            read_at: null,
          });
          results.push({ enrollment_id: enrollment.id, action: "sms_fallback_task_created" });
          continue;
        }

        let to = rawPhone.trim().replace(/\s/g, "");
        if (/^0?4\d{8}$/.test(to.replace(/\D/g, "")) || /^61\d{9}$/.test(to.replace(/\D/g, ""))) {
          to = toE164Australia(to);
        }

        const batch = await postMobileMessageBatch(mm, [{ to, message: merged }]);
        if (!batch.ok) {
          const detail = (batch.data?.error as string) || (batch.data?.message as string) || `HTTP ${batch.status}`;
          results.push({ enrollment_id: enrollment.id, action: "sms_failed", detail });
          continue;
        }

        const first = (batch.data?.results as Array<{ message_id?: string }> | undefined)?.[0];
        await supabase.from("sms_outbound").insert({
          user_id: enrollment.user_id,
          contact_id: enrollment.contact_id,
          to_phone: to,
          body_preview: merged.length > 200 ? `${merged.slice(0, 200)}...` : merged,
          provider: "mobile_message",
          provider_message_id: first?.message_id ?? null,
          status: "sent",
          error: null,
        });

        const { data: runRow, error: runErr } = await supabase
          .from("nurture_sequence_step_runs")
          .insert({
            enrollment_id: enrollment.id,
            step_index: idx,
            step_id: step.id,
            status: "pending",
            activated_at: new Date().toISOString(),
            error: null,
          })
          .select("id")
          .single();

        if (runErr) {
          results.push({ enrollment_id: enrollment.id, action: "sms_run_error", detail: runErr.message });
          continue;
        }

        const createdRunId = runRow?.id as string | undefined;
        await supabase.from("notifications").insert({
          user_id: enrollment.user_id,
          kind: "nurture_step_due",
          title: step.title,
          body: "Sequence SMS step is due now.",
          entity_type: "nurture_sequence_step_runs",
          entity_id: createdRunId ?? null,
          read_at: null,
        });

        const { error: rpcErrSms2 } = await supabase.rpc("complete_nurture_step_and_advance", {
          p_enrollment_id: enrollment.id,
          p_step_run_id: createdRunId,
          p_outcome: "completed",
        });

        if (rpcErrSms2) {
          results.push({ enrollment_id: enrollment.id, action: "sms_rpc_error_after_send", detail: rpcErrSms2.message });
          continue;
        }

        results.push({ enrollment_id: enrollment.id, action: "sms_sent_and_advanced" });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
