import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "onboarding@resend.dev";

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
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

async function advanceEnrollment(
  supabase: ReturnType<typeof createClient>,
  enrollment: { id: string; sequence_id: string; current_step_index: number; started_at: string },
  stepsLength: number,
) {
  const nextIndex = enrollment.current_step_index + 1;
  if (nextIndex >= stepsLength) {
    await supabase
      .from("nurture_sequence_enrollments")
      .update({
        completed_at: new Date().toISOString(),
        next_step_at: null,
        current_step_index: nextIndex,
      })
      .eq("id", enrollment.id);
    return "sequence_completed";
  }

  const { data: nextStep } = await supabase
    .from("nurture_sequence_steps")
    .select("offset_days")
    .eq("sequence_id", enrollment.sequence_id)
    .order("sort_order", { ascending: true })
    .range(nextIndex, nextIndex)
    .maybeSingle();

  const nextAt = addDays(new Date(enrollment.started_at), Number(nextStep?.offset_days ?? 0));
  await supabase
    .from("nurture_sequence_enrollments")
    .update({
      current_step_index: nextIndex,
      next_step_at: nextAt.toISOString(),
    })
    .eq("id", enrollment.id);
  return "advanced";
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
          // Email: if we previously sent it (error is null), finish + advance; otherwise wait for manual completion.
          if (step.step_type === "email" && !existingRun.error) {
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
              results.push({ enrollment_id: enrollment.id, action: "email_rpc_error_after_pending_run", detail: rpcErr.message });
              continue;
            }

            results.push({ enrollment_id: enrollment.id, action: "email_advanced_after_pending_run" });
            continue;
          }

          // For task/prompt (and for email fallback requiring manual action), create notification only once.
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
        .select(`id, name, first_name, last_name, email, contact_channels ( channel_type, value, is_primary )`)
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
        const to = getContactEmail(contact as {
          email?: string | null;
          contact_channels?: Array<{ channel_type: string; value?: string | null; is_primary?: boolean }>;
        } | null);
        if (!to || !RESEND_API_KEY) {
          const { data: taskRow, error: taskErr } = await supabase
            .from("contact_tasks")
            .insert({
              contact_id: enrollment.contact_id,
              user_id: enrollment.user_id,
              title: step.title,
              notes: (step.body || "Email step requires manual action") + (!to ? " (missing contact email)" : ""),
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
              error: !to ? "missing_contact_email" : "missing_resend_api_key",
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
            body: !to ? "Email step is due, but contact has no email." : "Email step is due, but email delivery is not configured.",
            entity_type: "nurture_sequence_step_runs",
            entity_id: createdRunId ?? null,
            read_at: null,
          });
          results.push({ enrollment_id: enrollment.id, action: "email_fallback_task_created" });
          continue;
        }

        const sub = step.email_subject || step.title;
        const html = step.email_html || `<p>${(step.body || "").replace(/\n/g, "<br/>")}</p>`;
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: EMAIL_FROM,
            to: [to],
            subject: sub,
            html,
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
