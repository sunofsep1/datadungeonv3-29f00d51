import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  digitsKey,
  mobileMessageCredsFromEnv,
  postMobileMessageBatch,
  toE164Australia,
} from "../_shared/smsCore.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EnrollmentRow = {
  id: string;
  workflow_id: string;
  user_id: string;
  contact_id: string | null;
  listing_id: string | null;
  current_step_order: number;
  status: string;
  next_action_at: string;
};

type StepRow = {
  step_order: number;
  action_type: string;
  action_config: Record<string, unknown>;
  delay_minutes: number;
  branch_condition?: Record<string, unknown> | null;
  next_step_order_if_true?: number | null;
  next_step_order_if_false?: number | null;
};

function addMinutes(iso: string, minutes: number): string {
  const d = new Date(iso);
  d.setUTCMinutes(d.getUTCMinutes() + Math.min(525600, Math.max(0, Math.floor(minutes))));
  return d.toISOString();
}

function sanitizeEmailHtml(h: string): string {
  return h
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\bon\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\bon\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript\s*:/gi, "");
}

function getContactPhone(contact: {
  contact_channels?: Array<{ channel_type: string; value?: string | null; is_primary?: boolean | null }>;
  mobile?: string | null;
  phone?: string | null;
} | null): string | null {
  if (!contact) return null;
  const channels = contact.contact_channels ?? [];
  const primary = channels.find((c) => c.channel_type === "phone" && c.is_primary && c.value);
  if (primary?.value) return String(primary.value);
  const anyP = channels.find((c) => c.channel_type === "phone" && c.value);
  if (anyP?.value) return String(anyP.value);
  return contact.mobile ?? contact.phone ?? null;
}

function getContactEmail(contact: {
  email?: string | null;
  contact_channels?: Array<{ channel_type: string; value?: string | null; is_primary?: boolean | null }>;
} | null): string | null {
  if (!contact) return null;
  const channels = contact.contact_channels ?? [];
  const primary = channels.find((c) => c.channel_type === "email" && c.is_primary);
  if (primary?.value) return String(primary.value);
  const anyE = channels.find((c) => c.channel_type === "email" && c.value);
  if (anyE?.value) return String(anyE.value);
  return contact.email ?? null;
}

async function evalBranch(
  supabase: ReturnType<typeof createClient>,
  enrollment: EnrollmentRow,
  condition: Record<string, unknown> | null | undefined,
): Promise<boolean> {
  const c = condition ?? {};
  const kind = String(c.kind ?? "");

  if (kind === "always_true") return true;

  if (kind === "score_gte" && enrollment.contact_id) {
    const min = Number(c.value) || 0;
    const { data: cs } = await supabase
      .from("contact_scores")
      .select("total_score")
      .eq("contact_id", enrollment.contact_id)
      .maybeSingle();
    return (typeof cs?.total_score === "number" ? cs.total_score : 0) >= min;
  }

  if (kind === "contact_field" && enrollment.contact_id) {
    const field = String(c.field ?? "contact_category");
    const expected = c.equals != null ? String(c.equals) : "";
    if (!field || !expected) return false;
    const allowed = new Set(["contact_category", "status", "source", "lifecycle_stage"]);
    if (!allowed.has(field)) return false;
    const { data: row } = await supabase.from("contacts").select(field).eq("id", enrollment.contact_id).maybeSingle();
    if (!row || !(field in row)) return false;
    return String((row as Record<string, unknown>)[field] ?? "") === expected;
  }

  if (kind === "listing_field" && enrollment.listing_id) {
    const field = String(c.field ?? "pipeline_stage");
    const expected = c.equals != null ? String(c.equals) : "";
    if (!field || !expected) return false;
    const allowed = new Set(["pipeline_stage", "lifecycle_stage", "journey_stage"]);
    if (!allowed.has(field)) return false;
    const { data: row } = await supabase.from("listings").select(field).eq("id", enrollment.listing_id).maybeSingle();
    if (!row || !(field in row)) return false;
    return String((row as Record<string, unknown>)[field] ?? "") === expected;
  }

  if (kind === "listing_has_contact" && enrollment.listing_id) {
    const { data: row } = await supabase.from("listings").select("contact_id").eq("id", enrollment.listing_id).maybeSingle();
    return Boolean(row?.contact_id);
  }

  return false;
}

async function executeStep(
  supabase: ReturnType<typeof createClient>,
  enrollment: EnrollmentRow,
  step: StepRow,
): Promise<{ ok: boolean; error?: string }> {
  const cfg = step.action_config ?? {};
  const uid = enrollment.user_id;

  try {
    switch (step.action_type) {
      case "noop":
      case "wait_delay":
      case "if_branch":
        return { ok: true };

      case "create_task": {
        const title = String(cfg.title ?? "Workflow task");
        const notes = cfg.notes != null ? String(cfg.notes) : null;
        const dueDays = Number(cfg.due_days) || 0;
        const due = new Date();
        due.setUTCDate(due.getUTCDate() + dueDays);
        if (enrollment.contact_id) {
          const { error } = await supabase.from("contact_tasks").insert({
            contact_id: enrollment.contact_id,
            user_id: uid,
            title,
            notes,
            due_at: dueDays > 0 ? due.toISOString() : null,
          });
          if (error) return { ok: false, error: error.message };
        } else if (enrollment.listing_id) {
          const { data: maxRow } = await supabase
            .from("listing_tasks")
            .select("sort_order")
            .eq("listing_id", enrollment.listing_id)
            .order("sort_order", { ascending: false })
            .limit(1)
            .maybeSingle();
          const nextSort = (typeof maxRow?.sort_order === "number" ? maxRow.sort_order : -1) + 1;
          const { error } = await supabase.from("listing_tasks").insert({
            listing_id: enrollment.listing_id,
            user_id: uid,
            title,
            due_at: dueDays > 0 ? due.toISOString() : null,
            sort_order: nextSort,
          });
          if (error) return { ok: false, error: error.message };
        }
        return { ok: true };
      }

      case "notify_user": {
        const { error } = await supabase.from("notifications").insert({
          user_id: uid,
          kind: "workflow",
          title: String(cfg.title ?? "Workflow"),
          body: cfg.body != null ? String(cfg.body) : null,
          priority: String(cfg.priority ?? "info"),
          action_url: cfg.action_url != null ? String(cfg.action_url) : null,
          action_label: cfg.action_label != null ? String(cfg.action_label) : null,
          related_contact_id: enrollment.contact_id,
          related_listing_id: enrollment.listing_id,
          entity_type: "workflow_enrollment",
          entity_id: enrollment.id,
        });
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      }

      case "update_contact": {
        if (!enrollment.contact_id) return { ok: true };
        const fields = cfg.fields;
        if (!fields || typeof fields !== "object" || Array.isArray(fields)) return { ok: true };
        const allowed = ["notes", "status", "source", "next_follow_up_at"] as const;
        const patch: Record<string, unknown> = {};
        for (const k of allowed) {
          if (k in (fields as object)) patch[k] = (fields as Record<string, unknown>)[k];
        }
        if (Object.keys(patch).length === 0) return { ok: true };
        const { error } = await supabase.from("contacts").update(patch).eq("id", enrollment.contact_id);
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      }

      case "add_to_sequence": {
        if (!enrollment.contact_id) return { ok: false, error: "add_to_sequence requires contact_id" };
        const sequenceId = cfg.sequence_id != null ? String(cfg.sequence_id) : "";
        if (!sequenceId) return { ok: false, error: "add_to_sequence missing sequence_id" };
        const { error } = await supabase.from("nurture_sequence_enrollments").insert({
          contact_id: enrollment.contact_id,
          sequence_id: sequenceId,
          user_id: uid,
          current_step_index: 0,
          started_at: new Date().toISOString(),
        });
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      }

      case "send_sms": {
        const executeSend = cfg.execute_send === true;
        const mmCreds = mobileMessageCredsFromEnv();
        const message = cfg.body != null ? String(cfg.body) : "";

        if (executeSend && enrollment.contact_id && mmCreds && message.trim()) {
          const { data: contact } = await supabase
            .from("contacts")
            .select("id, sms_opt_out, mobile, phone, contact_channels ( channel_type, value, is_primary )")
            .eq("id", enrollment.contact_id)
            .maybeSingle();

          if (contact && contact.sms_opt_out !== true) {
            const raw = getContactPhone(contact);
            if (raw?.trim()) {
              let to = raw.trim().replace(/\s/g, "");
              if (/^0?4\d{8}$/.test(to.replace(/\D/g, "")) || /^61\d{9}$/.test(to.replace(/\D/g, ""))) {
                to = toE164Australia(to);
              }
              if (digitsKey(to).length >= 8) {
                const batch = await postMobileMessageBatch(mmCreds, [{ to, message: message.trim() }]);
                if (batch.ok) {
                  const first = (batch.data?.results as Array<{ message_id?: string }> | undefined)?.[0];
                  await supabase.from("sms_outbound").insert({
                    user_id: uid,
                    contact_id: enrollment.contact_id,
                    to_phone: to,
                    body_preview: message.length > 200 ? `${message.slice(0, 200)}…` : message,
                    provider: "mobile_message",
                    provider_message_id: first?.message_id ?? null,
                    status: "sent",
                    error: null,
                  });
                  return { ok: true };
                }
              }
            }
          }
        }

        const { error } = await supabase.from("notifications").insert({
          user_id: uid,
          kind: "workflow_action",
          title: String(cfg.title ?? "Send SMS (workflow)"),
          body: executeSend
            ? "SMS could not be sent automatically (missing Mobile Message config, phone, or opt-out). Compose manually from the contact."
            : (cfg.body != null
              ? String(cfg.body)
              : "Set action_config.execute_send true to send via Mobile Message when configured."),
          priority: "info",
          related_contact_id: enrollment.contact_id,
          related_listing_id: enrollment.listing_id,
          entity_type: "workflow_enrollment",
          entity_id: enrollment.id,
        });
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      }

      case "send_email": {
        const executeSend = cfg.execute_send === true;
        const resendKey = Deno.env.get("RESEND_API_KEY");
        const emailFrom = Deno.env.get("EMAIL_FROM") || "onboarding@resend.dev";
        const subject = String(cfg.subject ?? cfg.title ?? "Message from your agent");
        const html = sanitizeEmailHtml(String(cfg.html ?? cfg.body ?? "<p></p>"));

        if (executeSend && enrollment.contact_id && resendKey) {
          const { data: contact } = await supabase
            .from("contacts")
            .select("id, email_opt_out, email, contact_channels ( channel_type, value, is_primary )")
            .eq("id", enrollment.contact_id)
            .maybeSingle();

          if (contact && contact.email_opt_out !== true) {
            const to = getContactEmail(contact);
            if (to) {
              const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${resendKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  from: emailFrom,
                  to: [to],
                  subject,
                  html: html || "<p></p>",
                }),
              });
              if (res.ok) {
                const bodyPreview = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400);
                await supabase.from("interactions").insert({
                  contact_id: enrollment.contact_id,
                  user_id: uid,
                  type: "email",
                  channel: "email",
                  subject,
                  body: bodyPreview || null,
                  timestamp: new Date().toISOString(),
                });
                return { ok: true };
              }
            }
          }
        }

        const { error } = await supabase.from("notifications").insert({
          user_id: uid,
          kind: "workflow_action",
          title: String(cfg.title ?? "Send email (workflow)"),
          body: executeSend
            ? "Email could not be sent (Resend not configured, missing address, or opt-out)."
            : (cfg.body != null
              ? String(cfg.body)
              : "Set action_config.execute_send true and html/subject to send via Resend."),
          priority: "info",
          related_contact_id: enrollment.contact_id,
          related_listing_id: enrollment.listing_id,
          entity_type: "workflow_enrollment",
          entity_id: enrollment.id,
        });
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      }

      default:
        return { ok: true };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function insertStepRun(
  supabase: ReturnType<typeof createClient>,
  row: {
    enrollment_id: string;
    workflow_id: string;
    user_id: string;
    step_order: number;
    action_type: string;
    status: "success" | "failed" | "branch" | "skipped";
    detail?: string | null;
    branch_taken?: boolean | null;
  },
): Promise<void> {
  const { error } = await supabase.from("crm_workflow_step_runs").insert({
    enrollment_id: row.enrollment_id,
    workflow_id: row.workflow_id,
    user_id: row.user_id,
    step_order: row.step_order,
    action_type: row.action_type,
    status: row.status,
    detail: row.detail ?? null,
    branch_taken: row.branch_taken ?? null,
    executed_at: new Date().toISOString(),
  });
  if (error) {
    console.error("crm_workflow_step_runs insert failed", error.message);
  }
}

function advanceEnrollment(
  ordered: StepRow[],
  enr: EnrollmentRow,
  nextStepOrder: number,
  now: string,
): { completed: boolean; updates: { current_step_order: number; next_action_at: string; status?: string; completed_at?: string } } {
  const nextStep = ordered.find((s) => s.step_order === nextStepOrder);
  if (!nextStep) {
    return {
      completed: true,
      updates: {
        current_step_order: nextStepOrder,
        next_action_at: now,
        status: "completed",
        completed_at: now,
      },
    };
  }
  return {
    completed: false,
    updates: {
      current_step_order: nextStepOrder,
      next_action_at: addMinutes(now, nextStep.delay_minutes),
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    // Accept the current env service key outright. Otherwise verify the presented
    // token really carries service-role privileges by hitting a GoTrue admin
    // endpoint (anon/user JWTs get rejected there). This survives key-rotation
    // drift between pg_cron's vault copy and this function's env — the exact
    // mismatch that silently 401'd the workflow engine for days.
    let authed = Boolean(token) && token === serviceRoleKey;
    if (!authed && token) {
      try {
        const probe = createClient(supabaseUrl, token, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { error: probeErr } = await probe.auth.admin.listUsers({ page: 1, perPage: 1 });
        authed = !probeErr;
      } catch (_) {
        authed = false;
      }
    }
    if (!authed) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date().toISOString();
    const { data: enrollments, error: enrErr } = await supabase
      .from("crm_workflow_enrollments")
      .select("id, workflow_id, user_id, contact_id, listing_id, current_step_order, status, next_action_at")
      .eq("status", "active")
      .lte("next_action_at", now)
      .order("next_action_at", { ascending: true })
      .limit(40);

    if (enrErr) {
      return new Response(JSON.stringify({ error: enrErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const list = (enrollments ?? []) as EnrollmentRow[];
    let processed = 0;
    const errors: string[] = [];

    for (const enr of list) {
      const { data: wf } = await supabase
        .from("crm_workflows")
        .select("id, is_active")
        .eq("id", enr.workflow_id)
        .maybeSingle();

      if (!wf?.is_active) {
        await insertStepRun(supabase, {
          enrollment_id: enr.id,
          workflow_id: enr.workflow_id,
          user_id: enr.user_id,
          step_order: enr.current_step_order,
          action_type: "workflow",
          status: "skipped",
          detail: "Workflow is inactive; enrollment cancelled",
        });
        await supabase
          .from("crm_workflow_enrollments")
          .update({ status: "cancelled", completed_at: now })
          .eq("id", enr.id);
        continue;
      }

      const { data: steps, error: stErr } = await supabase
        .from("crm_workflow_steps")
        .select(
          "step_order, action_type, action_config, delay_minutes, branch_condition, next_step_order_if_true, next_step_order_if_false",
        )
        .eq("workflow_id", enr.workflow_id)
        .order("step_order", { ascending: true });

      if (stErr || !steps?.length) {
        errors.push(`${enr.id}: no steps`);
        continue;
      }

      const ordered = steps as StepRow[];
      const step = ordered.find((s) => s.step_order === enr.current_step_order);
      if (!step) {
        await insertStepRun(supabase, {
          enrollment_id: enr.id,
          workflow_id: enr.workflow_id,
          user_id: enr.user_id,
          step_order: enr.current_step_order,
          action_type: "workflow",
          status: "success",
          detail: "No step at current order; enrollment marked completed",
        });
        await supabase
          .from("crm_workflow_enrollments")
          .update({ status: "completed", completed_at: now, next_action_at: now })
          .eq("id", enr.id);
        await supabase.from("crm_workflows").update({ last_executed_at: now }).eq("id", enr.workflow_id);
        processed++;
        continue;
      }

      let nextStepOrder: number;

      if (step.action_type === "if_branch") {
        const branchOk = await evalBranch(supabase, enr, step.branch_condition as Record<string, unknown> | null);
        nextStepOrder = branchOk
          ? (typeof step.next_step_order_if_true === "number"
            ? step.next_step_order_if_true
            : enr.current_step_order + 1)
          : (typeof step.next_step_order_if_false === "number"
            ? step.next_step_order_if_false
            : enr.current_step_order + 1);
        await insertStepRun(supabase, {
          enrollment_id: enr.id,
          workflow_id: enr.workflow_id,
          user_id: enr.user_id,
          step_order: step.step_order,
          action_type: "if_branch",
          status: "branch",
          branch_taken: branchOk,
          detail: `Next step order ${nextStepOrder}`,
        });
      } else {
        const result = await executeStep(supabase, enr, step);
        if (!result.ok) {
          await insertStepRun(supabase, {
            enrollment_id: enr.id,
            workflow_id: enr.workflow_id,
            user_id: enr.user_id,
            step_order: step.step_order,
            action_type: step.action_type,
            status: "failed",
            detail: result.error ?? "unknown",
          });
          errors.push(`${enr.id} step ${step.step_order}: ${result.error ?? "unknown"}`);
          continue;
        }
        await insertStepRun(supabase, {
          enrollment_id: enr.id,
          workflow_id: enr.workflow_id,
          user_id: enr.user_id,
          step_order: step.step_order,
          action_type: step.action_type,
          status: "success",
          detail: null,
        });
        nextStepOrder = enr.current_step_order + 1;
      }

      const { completed, updates } = advanceEnrollment(ordered, enr, nextStepOrder, now);
      const patch: Record<string, unknown> = {
        current_step_order: updates.current_step_order,
        next_action_at: updates.next_action_at,
      };
      if (completed) {
        patch.status = "completed";
        patch.completed_at = updates.completed_at;
      }

      await supabase.from("crm_workflow_enrollments").update(patch).eq("id", enr.id);
      await supabase.from("crm_workflows").update({ last_executed_at: now }).eq("id", enr.workflow_id);
      processed++;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        scanned: list.length,
        processed,
        errors,
        at: now,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
