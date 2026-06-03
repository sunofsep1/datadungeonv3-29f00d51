import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Sparkles,
  Bell,
  RefreshCw,
  ChevronRight,
  Mail,
  ListTodo,
  MessageSquare,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { getPauseReason } from "@/lib/nurturePauseReasonStore";
import { useAdvanceNurtureEnrollmentStep } from "@/hooks/useNurtureSequences";
import { toast } from "sonner";
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
  if (s === "sms") return "SMS";
  return "Task";
}

export type NurtureLiveEnrollmentsProps = {
  /** Dashboard widget: compact list; Nurture page: show more rows */
  variant: "dashboard" | "page";
  /** When the parent page shows its own stat row, hide the duplicate 4-tile summary inside this card */
  hideSummaryGrid?: boolean;
  /** When the parent highlights due counts, hide the extra amber “due now” line */
  hideDueBanner?: boolean;
};

export function NurtureLiveEnrollments({
  variant,
  hideSummaryGrid = false,
  hideDueBanner = false,
}: NurtureLiveEnrollmentsProps) {
  const compactNurtureV2 = isFeatureEnabled("compactNurtureV2");
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

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "due" | "paused">("all");
  const [rowsLimit, setRowsLimit] = useState(variant === "dashboard" ? 12 : 40);
  const [workSessionIndex, setWorkSessionIndex] = useState(0);
  const [workSessionActive, setWorkSessionActive] = useState(false);
  const advanceNurtureStep = useAdvanceNurtureEnrollmentStep();

  const filteredItems = useMemo(() => {
    return items.filter((row) => {
      const now = Date.now();
      const nextAt = row.next_step_at ? new Date(row.next_step_at).getTime() : Number.MAX_SAFE_INTEGER;
      const due = nextAt <= now;
      if (statusFilter === "due" && !due) return false;
      if (statusFilter === "paused" && !row.pause_followup_cadence) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!row.contactName.toLowerCase().includes(q) && !row.sequenceName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [items, search, statusFilter]);

  const { rows: top, dueCount, total: sequenceRowTotal } = useEnrichedPipeline(filteredItems, rowsLimit);
  const dueRows = useMemo(() => top.filter((x) => x.due), [top]);
  const activeWorkItem = dueRows[Math.min(workSessionIndex, Math.max(0, dueRows.length - 1))] ?? null;

  useEffect(() => {
    if (!workSessionActive) return;
    if (dueRows.length === 0) {
      setWorkSessionActive(false);
      setWorkSessionIndex(0);
      return;
    }
    setWorkSessionIndex((idx) => Math.min(idx, dueRows.length - 1));
  }, [workSessionActive, dueRows.length]);

  useEffect(() => {
    if (!workSessionActive) return;
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const typingContext =
        tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable;
      if (typingContext) return;

      if (event.key.toLowerCase() === "j") {
        event.preventDefault();
        setWorkSessionIndex((idx) => Math.min(Math.max(0, dueRows.length - 1), idx + 1));
      } else if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        setWorkSessionIndex((idx) => Math.max(0, idx - 1));
      } else if (event.key.toLowerCase() === "o" && activeWorkItem) {
        event.preventDefault();
        navigate(`/contacts/${activeWorkItem.row.contact_id}?nurtureFocus=1`);
      } else if (event.key.toLowerCase() === "c" && activeWorkItem && !advanceNurtureStep.isPending) {
        event.preventDefault();
        advanceNurtureStep.mutate(
          { enrollment_id: activeWorkItem.row.id, contact_id: activeWorkItem.row.contact_id },
          {
            onSuccess: (data) => {
              toast.success(data.finished ? "Sequence completed" : "Step completed and advanced");
              setWorkSessionIndex((idx) => Math.max(0, idx));
            },
            onError: (err) =>
              toast.error(err instanceof Error ? err.message : "Could not complete step"),
          }
        );
      } else if (event.key === "Escape") {
        event.preventDefault();
        setWorkSessionActive(false);
        setWorkSessionIndex(0);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [workSessionActive, dueRows.length, activeWorkItem, advanceNurtureStep, navigate]);

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
        dash ? "p-3" : "p-3 md:p-4",
      )}
    >
      <div className={cn("flex flex-col sm:flex-row sm:items-start sm:justify-between", dash ? "gap-2 mb-2" : "gap-3 mb-3")}>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground flex flex-wrap items-center gap-x-2 gap-y-1.5 text-base">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className={cn("text-primary shrink-0", dash ? "w-4 h-4" : "w-4 h-4")} />
              {variant === "page" ? "Live pipeline" : "Nurture sequences"}
            </span>
            {dueCount > 0 && (
              <Badge
                variant="destructive"
                className={cn(
                  "max-w-full shrink font-normal gap-1 whitespace-normal text-left leading-snug sm:max-w-[14rem]",
                  dash ? "text-[10px] px-1.5 py-0" : "text-[11px] px-2 py-0.5",
                )}
              >
                <Bell className="w-3 h-3 shrink-0" />
                <span>
                  {dueCount} need attention
                </span>
              </Badge>
            )}
          </h3>
          {!dash ? (
            <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xl">Open {contactsHint} for full context.</p>
          ) : null}
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

      {!dash && compactNurtureV2 ? (
        <div className="mb-3 flex flex-col gap-2 sm:gap-3">
          <input
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm shadow-sm"
            placeholder="Search contact or sequence…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                className="h-9 min-w-[4.25rem]"
                variant={statusFilter === "all" ? "default" : "outline"}
                onClick={() => setStatusFilter("all")}
              >
                All
              </Button>
              <Button
                size="sm"
                className="h-9 min-w-[4.25rem]"
                variant={statusFilter === "due" ? "default" : "outline"}
                onClick={() => setStatusFilter("due")}
              >
                Due
              </Button>
              <Button
                size="sm"
                className="h-9 min-w-[4.25rem]"
                variant={statusFilter === "paused" ? "default" : "outline"}
                onClick={() => setStatusFilter("paused")}
              >
                Paused
              </Button>
            </div>
            {dueRows.length > 0 && (
              <Button
                size="sm"
                className="h-9 w-full sm:w-auto shrink-0"
                variant={workSessionActive ? "secondary" : "default"}
                onClick={() => {
                  setWorkSessionActive((prev) => !prev);
                  setWorkSessionIndex(0);
                }}
              >
                {workSessionActive ? "End due session" : "Work through all due"}
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {!dash && compactNurtureV2 && workSessionActive && activeWorkItem && (
        <div className="mb-3 rounded-md border border-primary/30 bg-primary/8 p-2.5">
          <p className="text-xs text-muted-foreground mb-1">
            Working due items {workSessionIndex + 1} of {dueRows.length}
          </p>
          <p className="text-sm font-medium text-foreground">{activeWorkItem.row.contactName}</p>
          <p className="text-xs text-muted-foreground">{activeWorkItem.row.sequenceName}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              className="h-8"
              disabled={advanceNurtureStep.isPending}
              onClick={() =>
                advanceNurtureStep.mutate(
                  { enrollment_id: activeWorkItem.row.id, contact_id: activeWorkItem.row.contact_id },
                  {
                    onSuccess: (data) => {
                      toast.success(data.finished ? "Sequence completed" : "Step completed and advanced");
                    },
                    onError: (err) =>
                      toast.error(err instanceof Error ? err.message : "Could not complete step"),
                  }
                )
              }
            >
              Complete & next
            </Button>
            <Button
              size="sm"
              className="h-8"
              onClick={() => navigate(`/contacts/${activeWorkItem.row.contact_id}?nurtureFocus=1`)}
            >
              Open contact
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              disabled={workSessionIndex <= 0}
              onClick={() => setWorkSessionIndex((i) => Math.max(0, i - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              disabled={workSessionIndex >= dueRows.length - 1}
              onClick={() => setWorkSessionIndex((i) => Math.min(dueRows.length - 1, i + 1))}
            >
              Next due
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Shortcuts: <span className="font-medium">C</span> complete, <span className="font-medium">O</span> open,
            <span className="font-medium"> J/K</span> next/previous, <span className="font-medium">Esc</span> end session.
          </p>
        </div>
      )}

      {!hideSummaryGrid && !loading && sequenceSummary.activeTotal > 0 && (
        <div className={cn("grid grid-cols-2 sm:grid-cols-4", dash ? "gap-1.5 mb-2" : "gap-2 mb-3")}>
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

      {!hideDueBanner && dueCount > 0 && !loading ? (
        <p
          className={cn(
            "text-amber-800 dark:text-amber-300/95 rounded-md border border-amber-500/25 bg-amber-500/10",
            dash ? "text-[11px] mb-2 px-2 py-1.5" : "text-xs mb-3 px-2.5 py-2",
          )}
        >
          {dueCount} due now
        </p>
      ) : null}

      {loading ? (
        <div className={dash ? "space-y-1.5" : "space-y-2"}>
          {[...Array(dash ? 3 : 4)].map((_, i) => (
            <Skeleton key={i} className={cn("w-full rounded-lg", dash ? "h-14" : variant === "page" ? "h-24" : "h-[4.5rem]")} />
          ))}
        </div>
      ) : top.length === 0 ? (
        <p className={cn("text-muted-foreground", dash ? "text-xs" : "text-sm")}>No active enrollments.</p>
      ) : (
        <>
          <div
            className={cn(
              "overflow-y-auto pr-1 -mr-1",
              dash ? "space-y-1.5 max-h-[min(260px,42vh)]" : "space-y-2 max-h-[min(420px,52vh)]",
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
                const rowShell = cn(
                  "w-full text-left flex flex-col rounded-lg border transition-colors",
                  variant === "page" ? "gap-0 p-3" : dash ? "gap-0.5 p-2" : "gap-1 p-2.5",
                  due
                    ? "border-amber-500/60 bg-amber-500/5 hover:bg-amber-500/10"
                    : dueSoon
                      ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                      : "border-border hover:bg-muted/50",
                );

                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={rowShell}
                      onClick={() => navigate(`/contacts/${row.contact_id}?nurtureFocus=1`)}
                    >
                      {variant === "page" ? (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                {due ? (
                                  <Bell className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                                ) : null}
                                <span className="truncate text-sm font-semibold text-foreground">{row.contactName}</span>
                              </div>
                              <p className="mt-1 truncate text-xs font-medium text-muted-foreground">{row.sequenceName}</p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                              {due ? (
                                <span className="rounded border border-amber-500/35 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                                  Due
                                </span>
                              ) : null}
                              {dueSoon && !due ? (
                                <span className="rounded border border-primary/35 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                  Soon
                                </span>
                              ) : null}
                              <span
                                className={cn(
                                  "max-w-[10.5rem] text-[11px] tabular-nums leading-tight text-muted-foreground",
                                  due && "font-medium text-amber-800 dark:text-amber-300",
                                )}
                              >
                                {nextLabel}
                              </span>
                            </div>
                          </div>
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2.5">
                            <span className="text-[10px] tabular-nums text-muted-foreground">{progress}</span>
                            {row.next_step_type ? (
                              <span className="inline-flex items-center gap-0.5 rounded border border-border bg-muted/25 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                {row.next_step_type === "email" ? (
                                  <Mail className="h-3 w-3" />
                                ) : row.next_step_type === "sms" ? (
                                  <MessageSquare className="h-3 w-3" />
                                ) : (
                                  <ListTodo className="h-3 w-3" />
                                )}
                                {stepTypeLabel(row.next_step_type)}
                              </span>
                            ) : null}
                            {row.pause_followup_cadence ? (
                              <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                Paused
                              </span>
                            ) : null}
                          </div>
                          {nextTitle ? (
                            <p className="mt-2 border-t border-border/40 pt-2 text-[11px] leading-snug text-muted-foreground line-clamp-2">
                              Next: {nextTitle}
                            </p>
                          ) : null}
                          {row.pause_followup_cadence && (row.pause_reason?.trim() || getPauseReason(row.id)) ? (
                            <p className="mt-2 border-t border-amber-500/20 pt-2 text-[11px] leading-snug text-amber-900 line-clamp-2 dark:text-amber-200">
                              Paused reason: {row.pause_reason?.trim() || getPauseReason(row.id)}
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold text-foreground">
                              {due && (
                                <Bell className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                              )}
                              {row.contactName}
                            </span>
                            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                              <span className="text-[10px] tabular-nums text-muted-foreground">{progress}</span>
                              {row.next_step_type && (
                                <span className="inline-flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                  {row.next_step_type === "email" ? (
                                    <Mail className="h-3 w-3" />
                                  ) : row.next_step_type === "sms" ? (
                                    <MessageSquare className="h-3 w-3" />
                                  ) : (
                                    <ListTodo className="h-3 w-3" />
                                  )}
                                  {stepTypeLabel(row.next_step_type)}
                                </span>
                              )}
                              {due && (
                                <span className="rounded border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:text-amber-300">
                                  Due
                                </span>
                              )}
                              {dueSoon && !due && (
                                <span className="rounded border border-primary/30 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                                  Soon
                                </span>
                              )}
                              {row.pause_followup_cadence && (
                                <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                  Cadence paused
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span className="truncate font-medium">{row.sequenceName}</span>
                            <span className={cn("shrink-0 tabular-nums", due && "font-medium text-amber-800 dark:text-amber-300")}>
                              {nextLabel}
                            </span>
                          </div>
                          {nextTitle && (
                            <p className="mt-0.5 border-t border-border/50 pt-1.5 text-[11px] leading-snug text-muted-foreground line-clamp-2">
                              Next: {nextTitle}
                            </p>
                          )}
                          {row.pause_followup_cadence &&
                            (row.pause_reason?.trim() || getPauseReason(row.id)) && (
                              <p className="mt-0.5 border-t border-amber-500/25 pt-1.5 text-[11px] leading-snug text-amber-900 line-clamp-2 dark:text-amber-200">
                                Paused reason: {row.pause_reason?.trim() || getPauseReason(row.id)}
                              </p>
                            )}
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          {sequenceRowTotal > top.length && (
            <p className={cn("text-muted-foreground text-center", dash ? "text-[11px] mt-2" : "text-xs mt-3")}>
              Showing {top.length} of {sequenceRowTotal} enrollments
            </p>
          )}
          {!dash && compactNurtureV2 && top.length < sequenceRowTotal ? (
            <div className="mt-2 text-center">
              <Button size="sm" variant="outline" onClick={() => setRowsLimit((n) => n + 40)}>
                Load more
              </Button>
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}
