import { Link } from "react-router-dom";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";
import { ArrowLeft, Briefcase, CalendarClock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppointments } from "@/hooks/useAppointments";
import { useContactTasks } from "@/hooks/useContactTasks";
import { hrefForWorkshop } from "@/lib/attentionWorkWorkspace";

type Props = {
  contactId: string;
  contactTaskId?: string | null;
  appointmentId?: string | null;
  nurtureSequence?: boolean;
};

function dueLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return null;
  if (isPast(due) && !isToday(due)) return `Overdue since ${format(due, "EEE d MMM")}`;
  if (isToday(due)) return `Due today at ${format(due, "h:mm a")}`;
  return `Due ${formatDistanceToNow(due, { addSuffix: true })}`;
}

export function ContactHubWorkBanner({
  contactId,
  contactTaskId,
  appointmentId,
  nurtureSequence,
}: Props) {
  const { data: tasks = [] } = useContactTasks(contactId);
  const { data: appointments = [] } = useAppointments();

  const task = contactTaskId ? tasks.find((t) => t.id === contactTaskId) : undefined;
  const appointment = appointmentId ? appointments.find((a) => a.id === appointmentId) : undefined;

  const workshopHref = (() => {
    if (appointmentId) {
      return hrefForWorkshop({ kind: "appointment", contactId, appointmentId, contactTaskId: contactTaskId ?? undefined });
    }
    if (contactTaskId) {
      const kind = task?.sequence_enrollment_id || nurtureSequence ? "sequenceTask" : "contactTask";
      return hrefForWorkshop({ kind, contactId, contactTaskId });
    }
    return null;
  })();

  const headline = task?.title ?? appointment?.title ?? "Focus from Daily Hub";
  const subline = task ? dueLabel(task.due_at) : appointment ? dueLabel(appointment.date) : null;

  return (
    <Card className="zoho-card border-primary/30 bg-gradient-to-r from-primary/10 via-background to-background p-4 print:hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">From Daily Hub</p>
            {task?.sequence_enrollment_id || nurtureSequence ? (
              <Badge variant="outline" className="text-[10px]">
                Sequence
              </Badge>
            ) : null}
            {appointment ? (
              <Badge variant="outline" className="text-[10px]">
                Appointment
              </Badge>
            ) : null}
          </div>
          <p className="text-sm font-semibold text-foreground">{headline}</p>
          {subline ? <p className="text-xs text-muted-foreground">{subline}</p> : null}
          <p className="text-xs text-muted-foreground">
            Contact details, email, and linked properties are below — use Email / SMS in the header, or open Workshop to
            complete this step.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
            <Link to="/attention-hub">
              <ArrowLeft className="h-3.5 w-3.5" />
              Hub
            </Link>
          </Button>
          {workshopHref ? (
            <Button size="sm" className="h-8 gap-1.5 text-xs" asChild>
              <Link to={workshopHref}>
                {appointment ? (
                  <CalendarClock className="h-3.5 w-3.5" />
                ) : (
                  <Briefcase className="h-3.5 w-3.5" />
                )}
                Open workshop
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
