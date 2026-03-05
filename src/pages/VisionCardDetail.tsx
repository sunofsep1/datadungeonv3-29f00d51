import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { ArrowLeft, Target, Calendar, CalendarPlus, Loader2, Pencil, ImageIcon } from "lucide-react";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { useVisionCard, useUpdateVisionCard } from "@/hooks/useVisionCard";
import { useCreateAppointment } from "@/hooks/useAppointments";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const STATUS_OPTIONS = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "achieved", label: "Achieved" },
] as const;

export default function VisionCardDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: card, isLoading, isError } = useVisionCard(id);
  const updateCard = useUpdateVisionCard();
  const createAppointment = useCreateAppointment();

  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [calendarDate, setCalendarDate] = useState("");
  const [addToCalendarPending, setAddToCalendarPending] = useState(false);

  useEffect(() => {
    if (card?.notes != null) setNotes(card.notes);
  }, [card?.notes]);

  const handleSaveNotes = async () => {
    if (!id || notes === (card?.notes ?? "")) return;
    setNotesSaving(true);
    try {
      await updateCard.mutateAsync({ id, notes: notes || null });
      toast.success("Notes saved");
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setNotesSaving(false);
    }
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
      await createAppointment.mutateAsync({
        title: card.title,
        date: calendarDate,
        notes: `Vision: ${card.title}${card.notes ? `\n\n${card.notes}` : ""}`,
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

  const statusValue = (card.status && STATUS_OPTIONS.some((o) => o.value === card.status)) ? card.status : "not_started";

  return (
    <div className="animate-fade-in space-y-6">
      <PageBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Vision Board", href: "/dashboard" },
          { label: card.title },
        ]}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Vision Board
        </Button>
      </div>

      {/* Hero: image + title + target date + status */}
      <Card className={cn("overflow-hidden border border-border", "bg-gradient-to-b", card.color)}>
        <div className="aspect-[21/9] sm:aspect-[3/1] w-full relative bg-muted/30 flex items-center justify-center">
          {card.image_url ? (
            <img
              src={card.image_url}
              alt=""
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageIcon className="w-16 h-16 text-muted-foreground/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-foreground">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight drop-shadow-sm">
                {card.title}
              </h1>
              <StatusBadge status={statusValue} />
            </div>
            {card.target_date && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Target date: {format(new Date(card.target_date), "EEEE, MMMM d, yyyy")}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Notes */}
        <Card className="zoho-card p-6 border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Notes
            </h2>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSaveNotes}
              disabled={notesSaving || notes === (card.notes ?? "")}
            >
              {notesSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              {notesSaving ? " Saving…" : " Save"}
            </Button>
          </div>
          <Textarea
            placeholder="Jot down ideas, milestones, or next steps…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleSaveNotes}
            className="min-h-[160px] resize-y bg-background border-border"
          />
        </Card>

        {/* Times & dates / Extras */}
        <div className="space-y-6">
          <Card className="zoho-card p-6 border-border">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
              Target date
            </h2>
            <Input
              type="date"
              value={card.target_date ? card.target_date.slice(0, 10) : ""}
              onChange={(e) => handleTargetDateChange(e.target.value || "")}
              className="border-border mb-4"
            />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4 mt-6">
              Status &amp; progress
            </h2>
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
          </Card>

          <Card className="zoho-card p-6 border-border">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
              <CalendarPlus className="h-4 w-4" />
              Add to calendar
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Create a calendar event for this vision so you can block time or set a reminder.
            </p>
            <div className="flex flex-wrap gap-2">
              <Input
                type="date"
                value={calendarDate}
                onChange={(e) => setCalendarDate(e.target.value)}
                className="border-border flex-1 min-w-[160px]"
              />
              <Button
                onClick={handleAddToCalendar}
                disabled={!calendarDate.trim() || addToCalendarPending}
              >
                {addToCalendarPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Add event
              </Button>
            </div>
          </Card>
        </div>
      </div>
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
