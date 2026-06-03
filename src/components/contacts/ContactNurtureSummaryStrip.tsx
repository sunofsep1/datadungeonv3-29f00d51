import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { format } from "date-fns";
import { useContactTasks } from "@/hooks/useContactTasks";
import { useNurtureEnrollmentsForContact, useNurtureSequencesList } from "@/hooks/useNurtureSequences";

interface ContactNurtureSummaryStripProps {
  contactId: string;
  onLogTouch?: () => void;
}

/** One-line summary for collapsed nurture expandable (TanStack dedupes queries with full panel). */
export function ContactNurtureSummaryStrip({ contactId, onLogTouch }: ContactNurtureSummaryStripProps) {
  const { data: tasks = [] } = useContactTasks(contactId);
  const { data: enrollments = [] } = useNurtureEnrollmentsForContact(contactId);
  const { data: sequences = [] } = useNurtureSequencesList();

  const openTasks = useMemo(() => tasks.filter((t) => !t.completed_at), [tasks]);

  const primary = enrollments[0];
  const seqName = useMemo(() => {
    if (!primary) return null;
    const seq = sequences.find((s) => s.id === primary.sequence_id);
    return seq?.name?.trim() || "Sequence";
  }, [primary, sequences]);

  const nextLine = useMemo(() => {
    if (!primary) return null;
    if (primary.next_step_at) {
      return `Next touch ${format(new Date(primary.next_step_at), "d MMM yyyy, h:mm a")}`;
    }
    return "Next step scheduling…";
  }, [primary]);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground">
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
      {primary ? (
        <>
          <span className="font-medium text-foreground">{seqName}</span>
          {nextLine ? <span className="hidden sm:inline">· {nextLine}</span> : null}
          {primary.pause_followup_cadence ? (
            <Badge variant="outline" className="text-[10px] font-normal">
              Paused
            </Badge>
          ) : null}
        </>
      ) : (
        <span>No active sequence — enroll below</span>
      )}
      <Badge variant="secondary" className="tabular-nums text-[10px] font-medium">
        {openTasks.length} task{openTasks.length === 1 ? "" : "s"}
      </Badge>
      <span className="ml-auto flex shrink-0 items-center gap-1.5">
        {onLogTouch ? (
          <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={onLogTouch}>
            Log
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[11px]" asChild>
          <Link to="/nurture">Manage</Link>
        </Button>
      </span>
    </div>
  );
}
