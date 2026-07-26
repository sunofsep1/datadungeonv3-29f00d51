import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  Target,
  Calendar,
  CalendarPlus,
  Loader2,
  Pencil,
  ImageIcon,
  Sparkles,
  StickyNote,
  ExternalLink,
  LayoutDashboard,
  Hammer,
  ListTodo,
  Building2,
  GitBranch,
  LineChart,
  Megaphone,
  Workflow,
} from "lucide-react";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { useVisionCard, useUpdateVisionCard } from "@/hooks/useVisionCard";
import { useCreateAppointment } from "@/hooks/useAppointments";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { toBrisbaneAllDayIso } from "@/lib/appointmentTime";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, isFuture } from "date-fns";
import { MiniCalendar } from "@/components/dashboard/MiniCalendar";
import { VisionVoiceMemosCard } from "@/components/vision/VisionVoiceMemosCard";
import { VisionDeskOutreachCard } from "@/components/vision/VisionDeskOutreachCard";
import { VisionDeskChecklistCard } from "@/components/vision/VisionDeskChecklistCard";
import {
  emptyVisionDesk,
  joinVisionNotes,
  splitVisionNotes,
  type VisionDeskData,
} from "@/lib/visionDeskNotes";

const STATUS_OPTIONS = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "achieved", label: "Achieved" },
] as const;

const VISION_DESK_MORE_LINKS: { to: string; label: string; Icon: typeof Building2; hint: string }[] = [
  { to: "/listings", label: "Listings", Icon: Building2, hint: "Campaign board" },
  { to: "/nurture", label: "Nurture", Icon: Workflow, hint: "Sequences" },
  { to: "/pricing", label: "Pricing", Icon: LineChart, hint: "Intel" },
  { to: "/pipeline", label: "Pipeline", Icon: GitBranch, hint: "Deals" },
  { to: "/marketing", label: "Marketing", Icon: Megaphone, hint: "Campaigns" },
];

export default function VisionCardDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: card, isLoading, isError } = useVisionCard(id);
  const updateCard = useUpdateVisionCard();
  const createAppointment = useCreateAppointment();

  const [userNotes, setUserNotes] = useState("");
  const [desk, setDesk] = useState<VisionDeskData>(emptyVisionDesk);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [deskSaving, setDeskSaving] = useState(false);
  const [calendarDate, setCalendarDate] = useState("");
  const [addToCalendarPending, setAddToCalendarPending] = useState(false);

  useEffect(() => {
    if (!card) return;
    const { userNotes: u, desk: d } = splitVisionNotes(card.notes);
    setUserNotes(u);
    setDesk(d);
  }, [card?.id]);

  const persistNotesPayload = useCallback(
    (nextUser: string, nextDesk: VisionDeskData) => joinVisionNotes(nextUser, nextDesk) || null,
    []
  );

  const saveNotes = useCallback(
    async (nextUser: string, nextDesk: VisionDeskData) => {
      if (!id) return;
      const raw = persistNotesPayload(nextUser, nextDesk);
      const payload = raw?.trim() ? raw : null;
      const prev = card?.notes ?? null;
      if (payload === prev || (payload === null && (prev === null || prev === ""))) return;
      setNotesSaving(true);
      try {
        await updateCard.mutateAsync({ id, notes: payload });
        toast.success("Saved");
      } catch {
        toast.error("Failed to save");
      } finally {
        setNotesSaving(false);
      }
    },
    [card?.notes, id, persistNotesPayload, updateCard]
  );

  const saveDesk = useCallback(
    async (nextUser: string, nextDesk: VisionDeskData) => {
      if (!id) return;
      const raw = persistNotesPayload(nextUser, nextDesk);
      const payload = raw?.trim() ? raw : null;
      const prev = card?.notes ?? null;
      if (payload === prev || (payload === null && (prev === null || prev === ""))) return;
      setDeskSaving(true);
      try {
        await updateCard.mutateAsync({ id, notes: payload });
      } catch {
        toast.error("Failed to save desk");
      } finally {
        setDeskSaving(false);
      }
    },
    [card?.notes, id, persistNotesPayload, updateCard]
  );

  const handleSaveUserNotes = async () => {
    if (!id) return;
    await saveNotes(userNotes, desk);
  };

  const updateDesk = async (next: VisionDeskData) => {
    setDesk(next);
    await saveDesk(userNotes, next);
  };

  const handleStatusChange = async (status: string) => {
    if (!id) return;
    try {
      await updateCard.mutateAsync({ id, status: status || null });
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleTargetDateChange = async (newDate: string) => {
    if (!id) return;
    try {
      await updateCard.mutateAsync({ id, target_date: newDate || null });
      toast.success("Target date updated");
    } catch {
      toast.error("Failed to update target date");
    }
  };

  const handleAddToCalendar = async () => {
    if (!user || !card || !calendarDate.trim()) {
      toast.error("Pick a date to add to calendar");
      return;
    }
    setAddToCalendarPending(true);
    try {
      const fullNotes = persistNotesPayload(userNotes, desk);
      await createAppointment.mutateAsync({
        title: card.title,
        date: toBrisbaneAllDayIso(calendarDate),
        all_day: true,
        type: "personal",
        notes: `Vision: ${card.title}${fullNotes ? `\n\n${fullNotes}` : ""}`,
      });
      toast.success("Added to calendar");
      setCalendarDate("");
    } catch {
      toast.error("Failed to add to calendar");
    } finally {
      setAddToCalendarPending(false);
    }
  };

  if (isLoading || !id) {
    return (
      <div className="animate-fade-in flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !card) {
    return (
      <div className="animate-fade-in text-center py-12">
        <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="font-medium text-foreground mb-2">Vision card not found</p>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const statusValue =
    card.status && STATUS_OPTIONS.some((o) => o.value === card.status) ? card.status : "not_started";
  const deskBusy = deskSaving || updateCard.isPending;

  const targetDateObj = card.target_date ? new Date(card.target_date) : null;
  const targetDistance =
    targetDateObj && !Number.isNaN(targetDateObj.getTime()) && isFuture(targetDateObj)
      ? formatDistanceToNow(targetDateObj, { addSuffix: true })
      : null;

  const checklistDone = desk.checklist.filter((x) => x.done).length;
  const checklistTotal = desk.checklist.length;

  return (
    <div className="animate-fade-in container max-w-7xl w-full flex flex-col flex-1 min-h-0 gap-6 py-6 pb-8 sm:pb-10">
      <PageBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Vision Board", href: "/dashboard" },
          { label: card.title },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Vision Board
        </Button>
        <Button variant="outline" size="sm" className="gap-1 text-xs h-8" asChild>
          <Link to="/calendar">
            <ExternalLink className="h-3 w-3" />
            Calendar
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="gap-1 text-xs h-8" asChild>
          <Link to="/tasks">Tasks</Link>
        </Button>
        <Button variant="outline" size="sm" className="gap-1 text-xs h-8" asChild>
          <Link to="/contacts">Contacts</Link>
        </Button>
      </div>

      <Card className={cn("overflow-hidden border border-border", "bg-gradient-to-b", card.color)}>
        <div className="aspect-[21/9] sm:aspect-[3/1] w-full relative bg-muted/30 flex items-center justify-center">
          {card.image_url ? (
            <img src={card.image_url} alt="" className="absolute inset-0 w-full h-full object-contain" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageIcon className="w-16 h-16 text-muted-foreground/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-foreground">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight drop-shadow-sm">{card.title}</h1>
              <StatusBadge status={statusValue} />
            </div>
            {card.target_date ? (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Target date: {format(new Date(card.target_date), "EEEE, MMMM d, yyyy")}</span>
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="grid shrink-0 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card className="zoho-card border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="font-semibold text-sm text-foreground">Vision work desk</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Capture notes, scratch thinking, checklist steps, and outreach — everything stays on this card.
            </p>
          </Card>

          <Card className="zoho-card p-6 border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Notes</h2>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void handleSaveUserNotes()}
                disabled={
                  notesSaving ||
                  (() => {
                    const raw = persistNotesPayload(userNotes, desk);
                    const payload = raw?.trim() ? raw : null;
                    const prev = card.notes ?? null;
                    return payload === prev || (payload === null && (prev === null || prev === ""));
                  })()
                }
              >
                {notesSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                {notesSaving ? " Saving…" : " Save"}
              </Button>
            </div>
            <Textarea
              placeholder="Jot down ideas, milestones, or next steps…"
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              onBlur={() => void handleSaveUserNotes()}
              className="min-h-[200px] resize-y bg-background border-border text-sm"
            />
          </Card>

          <Accordion type="multiple" defaultValue={["scratch"]} className="space-y-2">
            <AccordionItem value="scratch" className="rounded-lg border border-border bg-card px-4">
              <AccordionTrigger className="py-3 text-sm font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-primary" />
                  Scratch pad
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <p className="mb-2 text-xs text-muted-foreground">
                  Rough working space (saved on the card). On large screens it defaults tall to use the viewport; drag the
                  bottom-right corner to resize.
                </p>
                <Textarea
                  placeholder="Brain dump, bullets, links…"
                  value={desk.scratch}
                  onChange={(e) => setDesk((d) => ({ ...d, scratch: e.target.value }))}
                  onBlur={(e) => void saveDesk(userNotes, { ...desk, scratch: e.target.value })}
                  className="min-h-[10rem] w-full resize-y bg-background border-border text-sm lg:min-h-[clamp(12rem,calc(100dvh-30rem),min(56rem,calc(100dvh-16rem)))]"
                  disabled={deskBusy}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="space-y-4">
          <VisionDeskOutreachCard visionTitle={card.title} />
          <VisionVoiceMemosCard
            visionCardId={card.id}
            memos={desk.memos}
            onMemosChange={(nextMemos) => void updateDesk({ ...desk, memos: nextMemos })}
            disabled={deskBusy}
          />
          <VisionDeskChecklistCard
            items={desk.checklist}
            onItemsChange={(next) => void updateDesk({ ...desk, checklist: next })}
            newItemText={newChecklistItem}
            onNewItemTextChange={setNewChecklistItem}
            disabled={deskBusy}
          />
          <MiniCalendar />

          <Card className="zoho-card p-5 border-border space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">Target date</h2>
              <Input
                type="date"
                value={card.target_date ? card.target_date.slice(0, 10) : ""}
                onChange={(e) => handleTargetDateChange(e.target.value || "")}
                className="border-border"
              />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">Status</h2>
              <Select value={statusValue} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="pt-2 border-t border-border">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                <CalendarPlus className="h-4 w-4" />
                Add to calendar
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                Block time or set a reminder for this vision.
              </p>
              <div className="flex flex-wrap gap-2">
                <Input
                  type="date"
                  value={calendarDate}
                  onChange={(e) => setCalendarDate(e.target.value)}
                  className="border-border flex-1 min-w-[160px]"
                />
                <Button onClick={() => void handleAddToCalendar()} disabled={!calendarDate.trim() || addToCalendarPending}>
                  {addToCalendarPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Add event
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="zoho-card shrink-0 border-border bg-gradient-to-br from-muted/25 via-background to-primary/[0.07] p-5 sm:p-6">
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">From this vision</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Jump into execution without leaving this card — priorities first, then the rest of your desk.
          </p>
          {targetDistance && targetDateObj ? (
            <p className="text-xs text-primary/90 mt-2 font-medium">
              Target {format(targetDateObj, "d MMM yyyy")} · {targetDistance}
            </p>
          ) : card.target_date && targetDateObj && !Number.isNaN(targetDateObj.getTime()) ? (
            <p className="text-xs text-muted-foreground mt-2">
              Target {format(targetDateObj, "EEEE, d MMM yyyy")}
            </p>
          ) : null}
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5 shrink-0">
          <Button
            variant="outline"
            className="h-auto min-h-[5.5rem] flex-col items-start justify-center gap-1 border-border/80 bg-card/60 py-4 px-4 text-left hover:bg-card"
            asChild
          >
            <Link to="/attention-hub">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-sm">Daily Hub</span>
              <span className="text-[11px] text-muted-foreground font-normal">Priorities & focus</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            className="h-auto min-h-[5.5rem] flex-col items-start justify-center gap-1 border-border/80 bg-card/60 py-4 px-4 text-left hover:bg-card"
            asChild
          >
            <Link to="/workshop">
              <Hammer className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-sm">Workshop</span>
              <span className="text-[11px] text-muted-foreground font-normal">Work a task end-to-end</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            className="h-auto min-h-[5.5rem] flex-col items-start justify-center gap-1 border-border/80 bg-card/60 py-4 px-4 text-left hover:bg-card"
            asChild
          >
            <Link to="/dashboard">
              <LayoutDashboard className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-sm">Dashboard</span>
              <span className="text-[11px] text-muted-foreground font-normal">Vision board & widgets</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            className="h-auto min-h-[5.5rem] flex-col items-start justify-center gap-1 border-border/80 bg-card/60 py-4 px-4 text-left hover:bg-card col-span-2 lg:col-span-1"
            asChild
          >
            <Link to="/todos">
              <ListTodo className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-sm">To-do lists</span>
              <span className="text-[11px] text-muted-foreground font-normal">General tasks off your mind</span>
            </Link>
          </Button>
        </div>

        <div className="mt-6 pt-5 border-t border-border/60">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Desk shortcuts</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {VISION_DESK_MORE_LINKS.map(({ to, label, Icon, hint }) => (
              <Button
                key={to}
                variant="outline"
                size="sm"
                className="h-auto min-h-[3.75rem] flex-col items-center justify-center gap-0.5 border-border/80 bg-card/50 py-2 px-1 text-center hover:bg-card"
                asChild
              >
                <Link to={to}>
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium leading-tight">{label}</span>
                  <span className="text-[10px] text-muted-foreground font-normal leading-tight">{hint}</span>
                </Link>
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-dashed border-primary/25 bg-muted/15 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Momentum</p>
              <p className="text-sm text-foreground/90 mt-1">
                {statusValue === "achieved"
                  ? "Celebrate this win, then add the next vision on your board."
                  : statusValue === "in_progress"
                    ? "Ship one small thing today — Daily Hub or Workshop above."
                    : "Start with one tile above (10 minutes), then capture what changed in Notes."}
              </p>
              {checklistTotal > 0 ? (
                <p className="text-[11px] text-muted-foreground mt-2">
                  Checklist: {checklistDone}/{checklistTotal} done on this card.
                </p>
              ) : null}
            </div>
            <Button variant="secondary" size="sm" className="shrink-0" asChild>
              <Link to="/dashboard">Vision board</Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    not_started: "Not started",
    in_progress: "In progress",
    achieved: "Achieved",
  };
  const styles: Record<string, string> = {
    not_started: "bg-muted text-muted-foreground",
    in_progress: "bg-primary/20 text-primary border border-primary/40",
    achieved: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border",
        styles[status] ?? styles.not_started
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}
