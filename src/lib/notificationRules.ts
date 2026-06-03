/** Human-readable sources for rows in `notifications` (in-app bell). Keep in sync with Supabase triggers/RPCs. */
export const IN_APP_NOTIFICATION_SOURCES: Array<{ headline: string; detail: string }> = [
  {
    headline: "Stale priority contacts",
    detail:
      "Top 100, past clients, or hot leads with no touch in 14+ days (deduped daily via notification jobs).",
  },
  {
    headline: "Hot lead score",
    detail: "Lead score reaches 61+ on a contact (once per day per contact).",
  },
  {
    headline: "Overdue contact tasks",
    detail: "Open tasks with a due date in the past.",
  },
  {
    headline: "Nurture steps due",
    detail: "Sequence enrollments whose next step time has passed.",
  },
  {
    headline: "New leads",
    detail: "A new row is created in Leads (inbound capture).",
  },
  {
    headline: "Listing pipeline stage",
    detail: "A listing’s pipeline stage changes.",
  },
  {
    headline: "Birthdays",
    detail: "Scheduled birthday reminders for contacts (cron).",
  },
  {
    headline: "Unread summary",
    detail: "Optional in-app digest summarizing other unread items (system job).",
  },
];
