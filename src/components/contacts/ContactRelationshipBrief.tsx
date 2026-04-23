import { format, isValid, parseISO } from "date-fns";
import { getDaysSinceLastTouch } from "@/lib/contactLastTouch";
import { CONTACT_SMART_LISTS } from "@/lib/contactSmartLists";
import type { ContactWithMeta } from "@/hooks/useContacts";
import type { NurtureJourneyForPrint } from "@/components/contacts/ContactPrintLayout";
import { cn } from "@/lib/utils";

interface ContactRelationshipBriefProps {
  contact: ContactWithMeta;
  activeJourney?: NurtureJourneyForPrint | null;
  className?: string;
}

function classificationLabel(raw: string | null | undefined): string {
  if (!raw) return "Unclassified";
  const match = CONTACT_SMART_LISTS.find((s) => s.id === raw);
  return match ? match.label : raw.replace(/_/g, " ");
}

function urgencyLabel(raw: string | null | undefined): string | null {
  const map: Record<string, string> = {
    immediate: "Immediate",
    priority: "Priority",
    planned: "Planned",
    backlog: "Backlog",
  };
  return raw ? map[String(raw).toLowerCase()] ?? null : null;
}

function urgencyClass(raw: string | null | undefined): string {
  const r = String(raw ?? "").toLowerCase();
  if (r === "immediate") return "bg-red-500/15 text-red-400 border-red-500/40";
  if (r === "priority") return "bg-amber-500/15 text-amber-400 border-amber-500/40";
  if (r === "planned") return "bg-sky-500/15 text-sky-400 border-sky-500/40";
  if (r === "backlog") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/40";
  return "bg-muted text-muted-foreground border-border";
}

export function ContactRelationshipBrief({
  contact,
  activeJourney,
  className,
}: ContactRelationshipBriefProps) {
  const daysSince = getDaysSinceLastTouch(contact);

  const lastTouchLabel = (() => {
    if (daysSince === null) return null;
    if (daysSince === 0) return "today";
    if (daysSince === 1) return "yesterday";
    return `${daysSince} days ago`;
  })();

  const lastTouchStale = daysSince !== null && daysSince >= 14;

  const nextTouchRaw = (contact as { next_touch_date?: string | null }).next_touch_date?.trim();
  const nextTouchDate = nextTouchRaw ? parseISO(`${nextTouchRaw.slice(0, 10)}T12:00:00`) : null;
  const nextTouchLabel = nextTouchDate && isValid(nextTouchDate) ? format(nextTouchDate, "d MMM yyyy") : null;

  const urgencyRaw = (contact as { category?: string | null }).category;
  const urgency = urgencyLabel(urgencyRaw);
  const classification = classificationLabel((contact as { contact_category?: string | null }).contact_category);

  const nurtureText = (() => {
    if (!activeJourney) return "Not enrolled";
    const step = Math.min(activeJourney.currentStepIndex + 1, activeJourney.totalSteps);
    const stepLabel = activeJourney.steps[activeJourney.currentStepIndex]?.title;
    const base = `${activeJourney.sequenceName} · step ${step} of ${activeJourney.totalSteps}`;
    return stepLabel ? `${base} — ${stepLabel}` : base;
  })();

  return (
    <div
      className={cn(
        "rounded-lg border border-info/30 bg-info/5 border-l-4 border-l-info/50 px-4 py-3 space-y-1.5",
        className
      )}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide min-w-[72px]">Status</span>
        <span className="text-xs text-foreground font-medium">{classification}</span>
        {urgency && (
          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", urgencyClass(urgencyRaw))}>
            {urgency}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide min-w-[72px]">Touch</span>
        <span className="text-xs">
          {lastTouchLabel ? (
            <>
              Last:{" "}
              <span className={cn("font-medium", lastTouchStale && "text-amber-400")}>{lastTouchLabel}</span>
            </>
          ) : (
            <span className="text-muted-foreground">No touch recorded</span>
          )}
          {nextTouchLabel && (
            <>
              <span className="mx-2 text-muted-foreground">·</span>
              Next: <span className="font-medium">{nextTouchLabel}</span>
            </>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide min-w-[72px]">Nurture</span>
        <span className={cn("text-xs", !activeJourney && "text-muted-foreground")}>{nurtureText}</span>
      </div>
    </div>
  );
}
