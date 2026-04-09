import { useEffect, useMemo, useState } from "react";
import { addDays, format, startOfDay } from "date-fns";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useAnnualReviews,
  useCommunityEvents,
  useCreateCommunityEvent,
  useSeedJanuaryAnnualReviews,
  useTogglePrepChecklistItem,
  useUpdateAnnualReview,
  type AnnualReviewWithRelations,
} from "@/hooks/useAnnualReviews";
import { EventInvitesBlock } from "@/components/annualReviews/EventInvitesBlock";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CalendarDays, ChevronDown, ClipboardCheck, Loader2, PartyPopper, Sparkles } from "lucide-react";

const REVIEW_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "scheduled", label: "Scheduled" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rescheduled", label: "Rescheduled" },
] as const;

const PREP_LABELS: Record<string, string> = {
  mortgage_statement: "Mortgage statement",
  escrow_statement: "Escrow statement",
  insurance_dec_page: "Insurance declaration page",
  credit_review_permission: "Credit review permission",
  cma_prepared: "CMA prepared",
};

function contactLabel(r: AnnualReviewWithRelations): string {
  const fn = r.contact?.first_name?.trim() ?? "";
  const ln = r.contact?.last_name?.trim() ?? "";
  const name = `${fn} ${ln}`.trim();
  return name || "Contact";
}

function ReviewRowCard({
  r,
  onPatch,
}: {
  r: AnnualReviewWithRelations;
  onPatch: (id: string, patch: { loan_officer_partner?: string | null; insurance_partner?: string | null; notes?: string | null }) => void;
}) {
  const [loanOfficer, setLoanOfficer] = useState(r.loan_officer_partner ?? "");
  const [insurance, setInsurance] = useState(r.insurance_partner ?? "");
  const [notes, setNotes] = useState(r.notes ?? "");

  useEffect(() => {
    setLoanOfficer(r.loan_officer_partner ?? "");
    setInsurance(r.insurance_partner ?? "");
    setNotes(r.notes ?? "");
  }, [r.id, r.loan_officer_partner, r.insurance_partner, r.notes, r.updated_at]);

  return (
    <li className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to={`/contacts/${r.contact_id}`}
            className="font-medium text-foreground hover:text-teal hover:underline"
          >
            {contactLabel(r)}
          </Link>
          <p className="text-sm text-muted-foreground">
            {r.scheduled_date
              ? new Date(r.scheduled_date + "T12:00:00").toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "No date set"}
          </p>
        </div>
        <ReviewStatusControls r={r} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Loan officer partner</Label>
          <Input
            value={loanOfficer}
            placeholder="Name or firm"
            onChange={(e) => setLoanOfficer(e.target.value)}
            onBlur={() => {
              const v = loanOfficer.trim() || null;
              if (v !== (r.loan_officer_partner ?? null)) onPatch(r.id, { loan_officer_partner: v });
            }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Insurance partner</Label>
          <Input
            value={insurance}
            placeholder="Name or firm"
            onChange={(e) => setInsurance(e.target.value)}
            onBlur={() => {
              const v = insurance.trim() || null;
              if (v !== (r.insurance_partner ?? null)) onPatch(r.id, { insurance_partner: v });
            }}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Notes</Label>
        <Textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            const v = notes.trim() || null;
            if (v !== (r.notes ?? null)) onPatch(r.id, { notes: v });
          }}
        />
      </div>
      <ReviewPrepList r={r} />
    </li>
  );
}

function ReviewStatusControls({ r }: { r: AnnualReviewWithRelations }) {
  const updateReview = useUpdateAnnualReview();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={r.status}
        onValueChange={(status) => updateReview.mutate({ id: r.id, patch: { status } })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {REVIEW_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="date"
        className="w-[160px]"
        value={r.scheduled_date ?? ""}
        onChange={(e) =>
          updateReview.mutate({
            id: r.id,
            patch: {
              scheduled_date: e.target.value || null,
            },
          })
        }
      />
    </div>
  );
}

function ReviewPrepList({ r }: { r: AnnualReviewWithRelations }) {
  const togglePrep = useTogglePrepChecklistItem();
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">Prep checklist</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {(r.review_prep_checklist ?? []).map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <Checkbox
              id={`prep-${item.id}`}
              checked={item.is_complete}
              onCheckedChange={(checked) =>
                togglePrep.mutate({
                  id: item.id,
                  isComplete: Boolean(checked),
                  reviewYear: r.year,
                })
              }
            />
            <label htmlFor={`prep-${item.id}`} className="text-sm cursor-pointer leading-tight">
              {PREP_LABELS[item.item] ?? item.item.replace(/_/g, " ")}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AnnualReviews() {
  const currentYear = new Date().getFullYear();
  const [reviewYear, setReviewYear] = useState(currentYear);
  const { data: reviews = [], isLoading } = useAnnualReviews(reviewYear);
  const seedJanuary = useSeedJanuaryAnnualReviews();
  const updateReview = useUpdateAnnualReview();
  const { data: events = [], isLoading: eventsLoading } = useCommunityEvents();
  const createEvent = useCreateCommunityEvent();
  const { toast } = useToast();

  const [eventForm, setEventForm] = useState({
    name: "",
    event_date: "",
    location: "",
    description: "",
  });

  const yearOptions = useMemo(
    () => [currentYear - 1, currentYear, currentYear + 1],
    [currentYear]
  );

  const reviewStatusSummary = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of reviews) {
      m.set(r.status, (m.get(r.status) ?? 0) + 1);
    }
    return m;
  }, [reviews]);

  const upcomingReviews = useMemo(() => {
    const start = startOfDay(new Date());
    const end = addDays(start, 30);
    return reviews
      .filter((r) => r.scheduled_date)
      .map((r) => {
        const d = new Date(`${r.scheduled_date}T12:00:00`);
        return { r, d };
      })
      .filter(({ d }) => !Number.isNaN(d.getTime()) && d >= start && d <= end)
      .sort((a, b) => a.d.getTime() - b.d.getTime())
      .slice(0, 14);
  }, [reviews]);

  const januaryBoard = useMemo(() => {
    const prefix = `${reviewYear}-01-`;
    return reviews
      .filter((r) => r.scheduled_date?.startsWith(prefix))
      .map((r) => {
        const d = new Date(`${r.scheduled_date}T12:00:00`);
        return { r, d };
      })
      .filter(({ d }) => !Number.isNaN(d.getTime()))
      .sort((a, b) => a.d.getTime() - b.d.getTime());
  }, [reviews, reviewYear]);

  const handleSeed = async () => {
    try {
      const result = await seedJanuary.mutateAsync({ year: reviewYear, max: 20 });
      const n = result?.reviews_created ?? 0;
      toast({
        title: "January schedule",
        description:
          n === 0
            ? "No new rows added (already scheduled or no Top 100 / Past Client contacts)."
            : `Created ${n} review slot${n === 1 ? "" : "s"} on weekdays in January.`,
      });
    } catch (e) {
      toast({
        title: "Could not seed reviews",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleCreateEvent = async () => {
    if (!eventForm.name.trim() || !eventForm.event_date) {
      toast({
        title: "Missing fields",
        description: "Add an event name and date.",
        variant: "destructive",
      });
      return;
    }
    try {
      await createEvent.mutateAsync({
        name: eventForm.name.trim(),
        event_date: eventForm.event_date,
        location: eventForm.location.trim() || null,
        description: eventForm.description.trim() || null,
        status: "planning",
      });
      setEventForm({ name: "", event_date: "", location: "", description: "" });
      toast({ title: "Event saved" });
    } catch (e) {
      toast({
        title: "Could not save event",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="Annual reviews & events"
        description="Plan January annual reviews for Top 100 and past clients, track prep checklists, and list community events."
      />

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-teal/15 p-2 text-teal">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Annual real estate reviews</CardTitle>
              <CardDescription>
                Seed up to 20 weekday slots in January for contacts in{" "}
                <strong>Top 100</strong> or <strong>Past client</strong>. Each review gets a prep
                checklist automatically.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(reviewYear)}
              onValueChange={(v) => setReviewYear(Number(v))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="secondary"
              disabled={seedJanuary.isPending}
              onClick={() => void handleSeed()}
            >
              {seedJanuary.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Seed January slots
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/70 bg-muted/15 p-4 space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Planner snapshot
              </p>
              <div className="flex flex-wrap gap-2">
                {REVIEW_STATUSES.map((s) => {
                  const n = reviewStatusSummary.get(s.value) ?? 0;
                  if (n === 0) return null;
                  return (
                    <Badge key={s.value} variant="secondary" className="font-normal text-xs">
                      {s.label}: {n}
                    </Badge>
                  );
                })}
                {reviews.length === 0 && !isLoading ? (
                  <span className="text-sm text-muted-foreground">No rows for this year yet.</span>
                ) : null}
              </div>
            </div>
            {januaryBoard.length > 0 ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  January {reviewYear} board
                </p>
                <ul className="flex flex-wrap gap-2">
                  {januaryBoard.map(({ r, d }) => (
                    <li key={r.id}>
                      <Link
                        to={`/contacts/${r.contact_id}`}
                        className="inline-flex flex-col gap-0.5 rounded-md border border-border/80 bg-card/60 px-2.5 py-1.5 text-left hover:bg-accent/40 transition-colors min-w-[7.5rem]"
                      >
                        <span className="text-xs font-medium text-foreground truncate max-w-[10rem]">
                          {contactLabel(r)}
                        </span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {format(d, "EEE d MMM")}
                        </span>
                        <Badge variant="outline" className="text-[9px] h-5 w-fit font-normal">
                          {REVIEW_STATUSES.find((s) => s.value === r.status)?.label ?? r.status}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {upcomingReviews.length > 0 ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Scheduled in the next 30 days
                </p>
                <ul className="space-y-1.5 text-sm">
                  {upcomingReviews.map(({ r, d }) => (
                    <li key={r.id} className="flex items-center justify-between gap-2">
                      <Link
                        to={`/contacts/${r.contact_id}`}
                        className="text-primary hover:underline truncate min-w-0"
                      >
                        {contactLabel(r)}
                      </Link>
                      <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                        {format(d, "EEE d MMM")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : reviews.length > 0 && !isLoading ? (
              <p className="text-xs text-muted-foreground">No reviews scheduled in the next 30 days.</p>
            ) : null}
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading reviews…
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No reviews for {reviewYear}. Use &quot;Seed January slots&quot; or add reviews from
              SQL / future contact actions.
            </p>
          ) : (
            <ul className="space-y-4">
              {reviews.map((r) => (
                <ReviewRowCard
                  key={r.id}
                  r={r}
                  onPatch={(id, patch) => updateReview.mutate({ id, patch })}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-teal/15 p-2 text-teal">
              <PartyPopper className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Community events</CardTitle>
              <CardDescription>
                Quarterly client events — add guests and track RSVP from each event below.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="ev-name">Event name</Label>
              <Input
                id="ev-name"
                value={eventForm.name}
                onChange={(e) => setEventForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Spring client appreciation"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ev-date">Date</Label>
              <Input
                id="ev-date"
                type="date"
                value={eventForm.event_date}
                onChange={(e) => setEventForm((f) => ({ ...f, event_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ev-loc">Location</Label>
              <Input
                id="ev-loc"
                value={eventForm.location}
                onChange={(e) => setEventForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1 sm:col-span-2 lg:col-span-4">
              <Label htmlFor="ev-desc">Description</Label>
              <Textarea
                id="ev-desc"
                rows={2}
                value={eventForm.description}
                onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional details"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="button" onClick={() => void handleCreateEvent()} disabled={createEvent.isPending}>
                {createEvent.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CalendarDays className="mr-2 h-4 w-4" />
                )}
                Add event
              </Button>
            </div>
          </div>

          {eventsLoading ? (
            <p className="text-sm text-muted-foreground">Loading events…</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {events.map((ev) => (
                <li key={ev.id} className="px-4 py-3">
                  <Collapsible>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium">{ev.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(ev.event_date + "T12:00:00").toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {ev.location ? ` · ${ev.location}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          {ev.status.replace(/_/g, " ")}
                        </span>
                        <CollapsibleTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="group h-8 gap-1 text-xs"
                          >
                            Invites
                            <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>
                    <CollapsibleContent>
                      <EventInvitesBlock eventId={ev.id} />
                    </CollapsibleContent>
                  </Collapsible>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
