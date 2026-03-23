import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Sparkles,
  Bell,
  RefreshCw,
  ChevronRight,
  Mail,
  ListTodo,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useActiveNurtureEnrollments,
  type ActiveNurtureEnrollmentItem,
} from "@/hooks/useActiveNurtureEnrollments";

type EnrichedRow = {
  row: ActiveNurtureEnrollmentItem;
  due: boolean;
  dueSoon: boolean;
};

function useEnrichedPipeline(items: ActiveNurtureEnrollmentItem[], maxRows: number) {
  return useMemo(() => {
    const now = Date.now();
    const MS_24H = 24 * 60 * 60 * 1000;
    const enriched: EnrichedRow[] = items.map((row) => {
      const nextAt = row.next_step_at ? new Date(row.next_step_at).getTime() : null;
      const due = nextAt != null && nextAt <= now;
      const dueSoon = nextAt != null && !due && nextAt - now <= MS_24H;
      return { row, due, dueSoon };
    });
    enriched.sort((a, b) => {
      if (a.due !== b.due) return a.due ? -1 : 1;
      if (a.dueSoon !== b.dueSoon) return a.dueSoon ? -1 : 1;
      const ta = a.row.next_step_at ? new Date(a.row.next_step_at).getTime() : Infinity;
      const tb = b.row.next_step_at ? new Date(b.row.next_step_at).getTime() : Infinity;
      return ta - tb;
    });
    const dueCount = enriched.filter((x) => x.due).length;
    return {
      rows: enriched.slice(0, maxRows),
      dueCount,
      total: enriched.length,
    };
  }, [items, maxRows]);
}

function stepTypeLabel(t: string | null) {
  const s = (t ?? "").toLowerCase();
  if (s === "email") return "Email";
  if (s === "prompt") return "Prompt";
  return "Task";
}

export type NurtureLiveEnrollmentsProps = {
  /** Dashboard widget: compact list; Nurture page: show more rows */
  variant: "dashboard" | "page";
};

export function NurtureLiveEnrollments({ variant }: NurtureLiveEnrollmentsProps) {
  const navigate = useNavigate();
  const {
    data: nurtureDash,
    isLoading: loading,
    dataUpdatedAt,
    refetch,
    isFetching,
  } = useActiveNurtureEnrollments();

  const items = nurtureDash?.items ?? [];
  const sequenceSummary = nurtureDash?.summary ?? {
    activeTotal: 0,
    dueNow: 0,
    dueToday: 0,
    dueSoon24h: 0,
  };

  const maxRows = variant === "dashboard" ? 12 : 500;
  const { rows: top, dueCount, total: sequenceRowTotal } = useEnrichedPipeline(items, maxRows);

  const showManageLink = variant === "dashboard";
  const contactsHint = (
    <button
      type="button"
      className="text-primary underline underline-offset-2"
      onClick={() => navigate("/contacts")}
    >
      Contacts
    </button>
  );

  const dash = variant === "dashboard";

  return (
    <Card
      className={cn(
        "zoho-card flex flex-col border-primary/15 bg-gradient-to-b from-primary/[0.03] to-transparent",
        dash ? "p-3" : "p-4 md:p-6",
        variant === "page" && "mb-6"
      )}
    >
      <div className={cn("flex flex-col sm:flex-row sm:items-start sm:justify-between", dash ? "gap-2 mb-2" : "gap-3 mb-3")}>
        <div className="min-w-0">
          <h3 className={cn("font-semibold text-foreground flex items-center gap-1.5 flex-wrap", dash ? "text-base" : "text-lg")}>
            <Sparkles className={cn("text-primary shrink-0", dash ? "w-4 h-4" : "w-5 h-5")} />
            {variant === "page" ? "Live pipeline" : "Nurture sequences"}
            {dueCount > 0 && (
              <Badge variant="destructive" className={cn("font-normal gap-1 shrink-0", dash && "text-[10px] px-1.5 py-0")}>
                <Bell className="w-3 h-3" />
                {dueCount} need attention
              </Badge>
            )}
          </h3>
          {dash ? (
            <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xl leading-snug">
              Enrollments and next step times · Open {contactsHint} to work tasks.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              Who is enrolled, the next step, and when it runs — same data as the dashboard widget. Use {contactsHint} to
              open a contact and work tasks or enrollment.
            </p>
          )}
          {dataUpdatedAt > 0 && (
            <p className="text-[10px] text-muted-foreground/80 mt-0.5">
              Updated {format(new Date(dataUpdatedAt), "d MMM, h:mm a")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("gap-1", dash ? "h-7 text-xs px-2" : "h-8")}
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
            Refresh
          </Button>
          {showManageLink && (
            <Button
              variant="ghost"
              size="sm"
              className={cn("text-muted-foreground hover:text-foreground", dash ? "h-7 text-xs px-2" : "h-8")}
              onClick={() => navigate("/nurture")}
            >
              Manage <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
          )}
        </div>
      </div>

      {!loading && sequenceSummary.activeTotal > 0 && (
        <div className={cn("grid grid-cols-2 sm:grid-cols-4", dash ? "gap-1.5 mb-2" : "gap-2 mb-4")}>
          <div className={cn("rounded-md border border-border bg-background/60 text-center", dash ? "px-2 py-1.5" : "rounded-lg px-3 py-2")}>
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Active</p>
            <p className={cn("font-semibold text-foreground tabular-nums", dash ? "text-sm" : "text-lg")}>{sequenceSummary.activeTotal}</p>
          </div>
          <div className={cn("rounded-md border border-amber-500/30 bg-amber-500/5 text-center", dash ? "px-2 py-1.5" : "rounded-lg px-3 py-2")}>
            <p className="text-[9px] uppercase tracking-wide text-amber-800/90 dark:text-amber-300/90">Due now</p>
            <p className={cn("font-semibold text-amber-900 dark:text-amber-200 tabular-nums", dash ? "text-sm" : "text-lg")}>
              {sequenceSummary.dueNow}
            </p>
          </div>
          <div className={cn("rounded-md border border-border bg-background/60 text-center", dash ? "px-2 py-1.5" : "rounded-lg px-3 py-2")}>
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Due today</p>
            <p className={cn("font-semibold text-foreground tabular-nums", dash ? "text-sm" : "text-lg")}>{sequenceSummary.dueToday}</p>
          </div>
          <div className={cn("rounded-md border border-primary/25 bg-primary/5 text-center", dash ? "px-2 py-1.5" : "rounded-lg px-3 py-2")}>
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Next 24h</p>
            <p className={cn("font-semibold text-foreground tabular-nums", dash ? "text-sm" : "text-lg")}>{sequenceSummary.dueSoon24h}</p>
          </div>
        </div>
      )}

      {dueCount > 0 && !loading && (
        <p className={cn("text-amber-800 dark:text-amber-300/95 flex items-start gap-1.5 rounded-md border border-amber-500/25 bg-amber-500/10", dash ? "text-[11px] mb-2 px-2 py-1.5" : "text-xs mb-3 px-2.5 py-2")}>
          <Bell className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Scheduled step time has passed for {dueCount} contact{dueCount === 1 ? "" : "s"} — open them for tasks, or
            the hourly automation will send email steps when configured.
          </span>
        </p>
      )}

      {loading ? (
        <div className={dash ? "space-y-1.5" : "space-y-2"}>
          {[...Array(dash ? 3 : 4)].map((_, i) => (
            <Skeleton key={i} className={cn("w-full rounded-lg", dash ? "h-14" : "h-[4.5rem]")} />
          ))}
        </div>
      ) : top.length === 0 ? (
        <p className={cn("text-muted-foreground", dash ? "text-xs" : "text-sm")}>
          No contacts enrolled in a nurture sequence. Enroll from a contact&apos;s{" "}
          <span className="text-foreground">Nurture &amp; tasks</span> section.
        </p>
      ) : (
        <>
          <div
            className={cn(
              "overflow-y-auto pr-1 -mr-1",
              dash ? "space-y-1.5 max-h-[min(260px,42vh)]" : "space-y-2 max-h-[min(560px,65vh)]"
            )}
          >
            <ul className={dash ? "space-y-1.5" : "space-y-2"}>
              {top.map(({ row, due, dueSoon }) => {
                const nextLabel =
                  row.next_step_at != null
                    ? due
                      ? "Due now"
                      : dueSoon
                        ? `Soon · ${format(new Date(row.next_step_at), "d MMM, h:mm a")}`
                        : format(new Date(row.next_step_at), "d MMM, h:mm a")
                    : "—";
                const progress =
                  row.total_steps > 0
                    ? `Step ${Math.min(row.current_step_index + 1, row.total_steps)} of ${row.total_steps}`
                    : "—";
                const nextTitle = row.next_step_title?.replace(/^\[Sequence\]\s*/i, "").trim() || null;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={cn(
                        "w-full text-left flex flex-col rounded-lg border transition-colors",
                        dash ? "gap-0.5 p-2" : "gap-1 p-2.5",
                        due
                          ? "border-amber-500/60 bg-amber-500/5 hover:bg-amber-500/10"
                          : dueSoon
                            ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                            : "border-border hover:bg-muted/50"
                      )}
                      onClick={() => navigate(`/contacts/${row.contact_id}`)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5 min-w-0">
                          {due && (
                            <Bell className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden />
                          )}
                          {row.contactName}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                          <span className="text-[10px] text-muted-foreground tabular-nums">{progress}</span>
                          {row.next_step_type && (
                            <span className="text-[10px] inline-flex items-center gap-0.5 uppercase tracking-wide border border-border rounded px-1.5 py-0.5 text-muted-foreground">
                              {row.next_step_type === "email" ? (
                                <Mail className="w-3 h-3" />
                              ) : (
                                <ListTodo className="w-3 h-3" />
                              )}
                              {stepTypeLabel(row.next_step_type)}
                            </span>
                          )}
                          {due && (
                            <span className="text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded px-1.5 py-0.5">
                              Due
                            </span>
                          )}
                          {dueSoon && !due && (
                            <span className="text-[10px] font-medium uppercase tracking-wide text-primary border border-primary/30 rounded px-1.5 py-0.5">
                              Soon
                            </span>
                          )}
                          {row.pause_followup_cadence && (
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground border border-border rounded px-1.5 py-0.5">
                              Cadence paused
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="truncate font-medium">{row.sequenceName}</span>
                        <span className={cn("shrink-0 tabular-nums", due && "text-amber-800 dark:text-amber-300 font-medium")}>
                          {nextLabel}
                        </span>
                      </div>
                      {nextTitle && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug border-t border-border/50 pt-1.5 mt-0.5">
                          Next: {nextTitle}
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          {sequenceRowTotal > top.length && (
            <p className={cn("text-muted-foreground text-center", dash ? "text-[11px] mt-2" : "text-xs mt-3")}>
              Showing {top.length} of {sequenceRowTotal} enrollments ·{" "}
              <button
                type="button"
                className="text-primary underline underline-offset-2 font-medium"
                onClick={() => navigate("/contacts")}
              >
                Open Contacts
              </button>{" "}
              to search your full database.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
