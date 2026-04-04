import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
};

function addMinutes(iso: string, minutes: number): string {
  const d = new Date(iso);
  d.setUTCMinutes(d.getUTCMinutes() + Math.min(525600, Math.max(0, Math.floor(minutes))));
  return d.toISOString();
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

      case "send_sms":
      case "send_email": {
        const { error } = await supabase.from("notifications").insert({
          user_id: uid,
          kind: "workflow_action",
          title: String(cfg.title ?? (step.action_type === "send_sms" ? "Send SMS (workflow)" : "Send email (workflow)")),
          body: cfg.body != null
            ? String(cfg.body)
            : "Automated send is not executed here — use listing automations, nurture, or send manually.",
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (authHeader !== `Bearer ${serviceRoleKey}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
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
        await supabase
          .from("crm_workflow_enrollments")
          .update({ status: "cancelled", completed_at: now })
          .eq("id", enr.id);
        continue;
      }

      const { data: steps, error: stErr } = await supabase
        .from("crm_workflow_steps")
        .select("step_order, action_type, action_config, delay_minutes")
        .eq("workflow_id", enr.workflow_id)
        .order("step_order", { ascending: true });

      if (stErr || !steps?.length) {
        errors.push(`${enr.id}: no steps`);
        continue;
      }

      const ordered = steps as StepRow[];
      const step = ordered.find((s) => s.step_order === enr.current_step_order);
      if (!step) {
        await supabase
          .from("crm_workflow_enrollments")
          .update({ status: "completed", completed_at: now, next_action_at: now })
          .eq("id", enr.id);
        await supabase.from("crm_workflows").update({ last_executed_at: now }).eq("id", enr.workflow_id);
        processed++;
        continue;
      }

      const result = await executeStep(supabase, enr, step);
      if (!result.ok) {
        errors.push(`${enr.id} step ${step.step_order}: ${result.error ?? "unknown"}`);
        continue;
      }

      const nextIdx = enr.current_step_order + 1;
      const nextStep = ordered.find((s) => s.step_order === nextIdx);

      if (!nextStep) {
        await supabase
          .from("crm_workflow_enrollments")
          .update({ status: "completed", completed_at: now, next_action_at: now, current_step_order: nextIdx })
          .eq("id", enr.id);
      } else {
        await supabase
          .from("crm_workflow_enrollments")
          .update({
            current_step_order: nextIdx,
            next_action_at: addMinutes(now, nextStep.delay_minutes),
          })
          .eq("id", enr.id);
      }

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
