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
      .lte("next_step_at", now);

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

      const startedAt = new Date(enrollment.started_at);
      const dueAt = addDays(startedAt, step.offset_days);

      const { data: contact } = await supabase
        .from("contacts")
        .select(`id, name, email, contact_channels ( channel_type, value, is_primary )`)
        .eq("id", enrollment.contact_id)
        .single();

      if (step.step_type === "task" || step.step_type === "prompt") {
        const { error: taskErr } = await supabase.from("contact_tasks").insert({
          contact_id: enrollment.contact_id,
          user_id: enrollment.user_id,
          title: step.title,
          notes: step.body,
          due_at: dueAt.toISOString(),
          sequence_enrollment_id: enrollment.id,
        });
        if (taskErr) {
          results.push({ enrollment_id: enrollment.id, action: "task_error", detail: taskErr.message });
          continue;
        }
        results.push({ enrollment_id: enrollment.id, action: "task_created" });
      } else if (step.step_type === "email") {
        const to = getContactEmail(contact as any);
        if (!to || !RESEND_API_KEY) {
          results.push({
            enrollment_id: enrollment.id,
            action: "email_skipped",
            detail: !to ? "no contact email" : "no RESEND_API_KEY",
          });
        } else {
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
          results.push({ enrollment_id: enrollment.id, action: "email_sent" });
        }
      }

      const nextIndex = idx + 1;
      if (nextIndex >= steps.length) {
        await supabase
          .from("nurture_sequence_enrollments")
          .update({
            completed_at: new Date().toISOString(),
            next_step_at: null,
            current_step_index: nextIndex,
          })
          .eq("id", enrollment.id);
        results.push({ enrollment_id: enrollment.id, action: "sequence_completed" });
      } else {
        const nextStep = steps[nextIndex] as { offset_days: number };
        const nextAt = addDays(startedAt, nextStep.offset_days);
        await supabase
          .from("nurture_sequence_enrollments")
          .update({
            current_step_index: nextIndex,
            next_step_at: nextAt.toISOString(),
          })
          .eq("id", enrollment.id);
        results.push({ enrollment_id: enrollment.id, action: "advanced" });
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
