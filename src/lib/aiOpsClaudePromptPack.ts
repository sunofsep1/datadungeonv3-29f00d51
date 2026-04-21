import { format, nextFriday } from "date-fns";

export type ClaudePromptPackEntry = {
  id: string;
  category: string;
  title: string;
  /** Placeholders: {{USER_ID}}, {{THIS_FRIDAY}}. Replace CONTACT_ID / WORKFLOW_ID / ID lists yourself. */
  template: string;
};

export const CLAUDE_PROMPT_PACK: ClaudePromptPackEntry[] = [
  {
    id: "daily-warm-oldest-touch",
    category: "Daily",
    title: "Top 10 warm leads by oldest touch",
    template: `Find my top 10 contacts where contact_category is "warm_lead", ordered by oldest last_touch_date (nulls last). Limit 10. For each, note name, phone, and last_touch_date.`,
  },
  {
    id: "daily-missing-next-touch",
    category: "Daily",
    title: "Contacts missing next touch (20)",
    template: `List contacts for userId "{{USER_ID}}" where next_touch_date is null or missing, newest first. Limit 20. Include name, phone, and lead_temperature.`,
  },
  {
    id: "daily-search-seller-nurture",
    category: "Daily",
    title: "Search seller nurture (25)",
    template: `Search contacts with query "seller_nurture" for userId "{{USER_ID}}", limit 25. Return id, name, phone, last_touch_date, next_touch_date.`,
  },
  {
    id: "daily-summarize-contact",
    category: "Daily",
    title: "Summarize one contact — next 3 actions",
    template: `Load contact CONTACT_ID (user "{{USER_ID}}"). Summarize context in 3 bullets: what we know, risk/opportunity, and the single best next action with channel (call / SMS / email / in person).`,
  },
  {
    id: "tasks-bulk-follow-up",
    category: "Task automation",
    title: "Follow-up call tasks — 3 contacts tomorrow 9:00",
    template: `For contact IDs [ID1, ID2, ID3], create tasks titled "Follow up call" due tomorrow at 09:00 local time for userId "{{USER_ID}}". Use one task per contact; include contact_id in each payload.`,
  },
  {
    id: "tasks-single-appraisal",
    category: "Task automation",
    title: "Book appraisal task with due datetime",
    template: `Create a task for contact CONTACT_ID: title "Book appraisal meeting", notes "Confirm preferred day/time", dueAt ISO "2026-04-21T23:00:00.000Z", userId "{{USER_ID}}".`,
  },
  {
    id: "tasks-reactivation-from-search",
    category: "Task automation",
    title: "Reactivation tasks from search (5)",
    template: `Run search for contacts matching "cold" or warm_lead (as appropriate to our schema), take the first 5 results for user "{{USER_ID}}", and create tasks titled "Reactivation check-in" due tomorrow at 09:00 local.`,
  },
  {
    id: "touch-call",
    category: "Touch logging",
    title: "Log a phone call touch",
    template: `Log a call touch for CONTACT_ID: subject "Follow-up call", body "Discussed timing and motivation; follow up Friday", channel "phone", userId "{{USER_ID}}".`,
  },
  {
    id: "touch-sms",
    category: "Touch logging",
    title: "Log an SMS touch",
    template: `Log SMS touch for CONTACT_ID: subject "SMS sent", body "Sent appraisal intro and availability", channel "sms", timestamp now, userId "{{USER_ID}}".`,
  },
  {
    id: "touch-meeting",
    category: "Touch logging",
    title: "Log an in-person meeting touch",
    template: `For CONTACT_ID, log a meeting touch: subject "Buyer consult", body "Budget confirmed; needs 3-bed near schools", channel "in_person", userId "{{USER_ID}}".`,
  },
  {
    id: "contact-update-touch-category-notes",
    category: "Contact updates",
    title: "Set next touch, category, append notes",
    template: `Update contact CONTACT_ID for user "{{USER_ID}}": set next_touch_date to "{{THIS_FRIDAY}}", contact_category to "warm_lead", and append to notes: "Prefers afternoons" (preserve existing notes).`,
  },
  {
    id: "contact-update-temperature-source",
    category: "Contact updates",
    title: "Temperature, category, source",
    template: `Update contact CONTACT_ID: lead_temperature "warm", contact_category "priority" (or pipeline equivalent), source "Referral". userId "{{USER_ID}}". Only change fields that exist on our schema.`,
  },
  {
    id: "contact-bulk-next-touch-friday",
    category: "Contact updates",
    title: "Next touch this Friday — list of IDs",
    template: `Set next_touch_date to {{THIS_FRIDAY}} (date only) for contacts [ID1, ID2, ID3] owned by "{{USER_ID}}". Confirm each ID exists before applying.`,
  },
  {
    id: "workflow-list-and-enroll-prep",
    category: "Workflows",
    title: "List matches + prepare enroll_workflow calls",
    template: `List up to 10 contacts matching query "seller nurture" for user "{{USER_ID}}". For each id, output a ready enroll_workflow payload with workflowId "WORKFLOW_ID". Do not execute until I confirm.`,
  },
  {
    id: "workflow-enroll-one",
    category: "Workflows",
    title: "Enroll one contact into workflow",
    template: `Enroll CONTACT_ID into workflow WORKFLOW_ID for userId "{{USER_ID}}". Show the exact API payload you would send, then wait for my confirmation before executing.`,
  },
  {
    id: "workflow-past-client-confirm",
    category: "Workflows",
    title: "Past clients — confirm then enroll (3)",
    template: `From search query "past_client" for "{{USER_ID}}", take the first 3 contacts. List names and ids, ask me to confirm, then enroll each in workflow WORKFLOW_ID.`,
  },
  {
    id: "manager-call-sheet",
    category: "Manager",
    title: "Call sheet from search (30)",
    template: `Run search_contacts (limit 30) for "{{USER_ID}}". Produce a call sheet table: name, phone, last_touch_date, suggested one-line opener.`,
  },
  {
    id: "manager-stale-14-day-tasks",
    category: "Manager",
    title: "14-day stale — draft one task each",
    template: `Find contacts last touched more than 14 days ago for "{{USER_ID}}". Draft one task per contact titled "14-day follow-up" with sensible due dates; output as a numbered plan for review.`,
  },
  {
    id: "manager-sms-first-no-email",
    category: "Manager",
    title: "No email — SMS-first ranked list",
    template: `Among my contacts with no email on file for "{{USER_ID}}", build a ranked list for SMS-first outreach: include name, mobile, last_touch_date, and rank score with one-line rationale.`,
  },
  {
    id: "qc-guardrails",
    category: "Safety",
    title: "Guardrails for this session",
    template: `Operating rules for this session:
1) If CONTACT_ID, WORKFLOW_ID, or any required id is missing, ask me before assuming.
2) For any write (tasks, touches, contact updates, enrollments), show a preview plan and wait for explicit confirmation before executing.
3) Prefer userId "{{USER_ID}}" for all scoped queries.`,
  },
];

export function applyClaudePromptPackTemplate(template: string, userId: string | undefined): string {
  const uid = userId?.trim() || "YOUR_USER_ID";
  const friday = format(nextFriday(new Date()), "yyyy-MM-dd");
  return template.replace(/\{\{USER_ID\}\}/g, uid).replace(/\{\{THIS_FRIDAY\}\}/g, friday);
}

export function getClaudePromptPackById(id: string): ClaudePromptPackEntry | undefined {
  return CLAUDE_PROMPT_PACK.find((e) => e.id === id);
}
