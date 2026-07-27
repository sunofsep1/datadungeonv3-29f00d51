import { useState, useMemo, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { SegmentedTabsList, SegmentedTabsTrigger } from "@/components/ui/segmented-tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  ExternalLink,
  RefreshCw,
  Unlink,
  Plus,
} from "lucide-react";
import { useAppointments, APPOINTMENT_TYPES, type AppointmentType } from "@/hooks/useAppointments";
import { useContacts } from "@/hooks/useContacts";
import { DayRail } from "@/components/calendar/DayRail";
import { WeekView } from "@/components/calendar/WeekView";
import {
  clashingIds,
  dayLoad,
  dedupeAgainstGoogle,
  FILTER_TYPES,
  metaFor,
  typeLabel,
  type CalendarItem,
  type CalendarItem as CalItem,
  type CalendarItemSource,
} from "@/lib/calendarEvents";
import { useCreateAppointmentWithGcal } from "@/hooks/useCreateAppointmentWithGcal";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  format,
  parseISO,
  isToday,
  isSameDay,
  isSameMonth,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from "date-fns";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useToast } from "@/hooks/use-toast";
import { endTimeFromStart, toBrisbaneIso } from "@/lib/appointmentTime";

type ViewMode = "day" | "week" | "month";

interface GCalEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  htmlLink?: string;
  location?: string;
}

export type { CalendarItem, CalendarItemSource } from "@/lib/calendarEvents";

const getGcalUrl = () => {
  const base = import.meta.env.VITE_SUPABASE_URL;
  return base ? `${base}/functions/v1/google-calendar` : null;
};

export default function Calendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: profile } = useUserProfile();
  const defaultDuration = profile?.default_appointment_duration ?? 60;
  const { data: appointments = [], refetch: refetchAppointments } = useAppointments();
  const createAppointmentWithGcal = useCreateAppointmentWithGcal();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [defaultViewApplied, setDefaultViewApplied] = useState(false);

  useEffect(() => {
    if (defaultViewApplied || !profile?.default_calendar_view) return;
    setViewMode(profile.default_calendar_view);
    setDefaultViewApplied(true);
  }, [profile?.default_calendar_view, defaultViewApplied]);

  const { data: contacts = [] } = useContacts();
  /** The day the rail is showing. Month view stays put while you inspect a day. */
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  /** Empty set means "show everything" rather than "show nothing". */
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());

  const [gcalEvents, setGcalEvents] = useState<GCalEvent[]>([]);
  const [gcalLoading, setGcalLoading] = useState(false);
  const [gcalNeedsAuth, setGcalNeedsAuth] = useState(false);
  const [gcalError, setGcalError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    title: "",
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "",
    location: "",
    type: "meeting" as AppointmentType,
    notes: "",
    syncToGoogle: true,
  });

  /** Open the New Appointment dialog with a specific date (and optional time) pre-filled (e.g. from clicking a calendar cell). */
  const openNewAppointmentForSlot = (date: Date, startTime?: string) => {
    const start = startTime ?? "09:00";
    setNewAppointment((prev) => ({
      ...prev,
      date: format(date, "yyyy-MM-dd"),
      startTime: start,
      endTime: endTimeFromStart(start, defaultDuration),
      title: "",
      notes: "",
    }));
    setIsDialogOpen(true);
  };

  const fetchGcal = useCallback(async () => {
    if (!user) return;
    setGcalLoading(true);
    setGcalError(null);
    try {
      const gcalUrl = getGcalUrl();
      if (!gcalUrl) {
        setGcalError("Supabase URL not configured");
        setGcalLoading(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setGcalLoading(false);
        return;
      }
      const res = await fetch(`${gcalUrl}?action=events`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGcalError(data?.error || `Calendar error (${res.status})`);
        setGcalEvents([]);
        setGcalLoading(false);
        return;
      }
      if (data?.needsAuth) {
        setGcalNeedsAuth(true);
        setGcalEvents([]);
      } else if (data?.events) {
        setGcalEvents(data.events);
        setGcalNeedsAuth(false);
      } else if (data?.error) {
        if (data.error === "Not connected") setGcalNeedsAuth(true);
        else setGcalError(data.error);
        setGcalEvents([]);
      }
    } catch (e) {
      setGcalError(e instanceof Error ? e.message : "Failed to fetch Google Calendar");
      setGcalEvents([]);
    } finally {
      setGcalLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGcal();
  }, [fetchGcal]);

  const mergedItems = useMemo((): CalItem[] => {
    const appItems: CalItem[] = (appointments ?? []).map((a) => ({
      id: `app-${a.id}`,
      appointmentId: a.id,
      title: a.title,
      date: a.date,
      end: a.end_date ?? null,
      allDay: Boolean(a.all_day),
      source: "app" as const,
      type: a.type ?? "meeting",
      location: a.location ?? null,
      contactId: a.contact_id ?? null,
      notes: a.notes ?? null,
    }));
    const gcItems: CalItem[] = gcalEvents.map((e) => {
      const dateStr = e.start?.dateTime ?? e.start?.date ?? "";
      return {
        id: `gc-${e.id}`,
        title: e.summary || "(No title)",
        date: dateStr,
        end: e.end?.dateTime ?? null,
        // Google all-day events carry `date` instead of `dateTime`.
        allDay: Boolean(e.start?.date && !e.start?.dateTime),
        source: "google" as const,
        location: e.location ?? null,
        htmlLink: e.htmlLink,
      };
    });
    // An appointment synced to Google exists in both feeds; show it once.
    const linkedIds = (appointments ?? [])
      .map((a) => a.google_event_id)
      .filter((id): id is string => Boolean(id));
    const all = dedupeAgainstGoogle(
      appItems.filter((i) => i.date),
      gcItems.filter((i) => i.date),
      linkedIds,
    );
    all.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return all;
  }, [appointments, gcalEvents]);

  /** Types actually present this month, so the filter row only offers real options. */
  const presentTypes = useMemo(() => {
    const seen = new Set<string>();
    mergedItems.forEach((i) => {
      if (i.source === "app") seen.add(i.type ?? "meeting");
    });
    return FILTER_TYPES.filter((t) => seen.has(t));
  }, [mergedItems]);

  const visibleItems = useMemo(() => {
    if (activeTypes.size === 0) return mergedItems;
    return mergedItems.filter(
      (i) => i.source === "google" || activeTypes.has(i.type ?? "meeting"),
    );
  }, [mergedItems, activeTypes]);

  const contactNameFor = useCallback(
    (contactId: string) => {
      const c = contacts.find((x) => x.id === contactId);
      if (!c) return undefined;
      return [c.first_name, c.last_name].filter(Boolean).join(" ") || undefined;
    },
    [contacts],
  );

  const toggleType = (t: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const navigatePrevious = () => {
    switch (viewMode) {
      case "day":
        setCurrentDate(subDays(currentDate, 1));
        break;
      case "week":
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case "month":
        setCurrentDate(subMonths(currentDate, 1));
        break;
    }
  };

  const navigateNext = () => {
    switch (viewMode) {
      case "day":
        setCurrentDate(addDays(currentDate, 1));
        break;
      case "week":
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case "month":
        setCurrentDate(addMonths(currentDate, 1));
        break;
    }
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  const getEventsForDate = (date: Date): CalItem[] => {
    return visibleItems.filter((item) => {
      const itemDate = parseISO(item.date);
      return isSameDay(itemDate, date);
    });
  };

  const upcomingItems = useMemo(() => {
    const today = new Date();
    return mergedItems
      .filter((item) => {
        const itemDate = parseISO(item.date);
        return itemDate >= today;
      })
      .slice(0, 10);
  }, [mergedItems]);

  const eventCounts = useMemo(() => {
    let app = 0;
    let google = 0;
    mergedItems.forEach((i) => {
      if (i.source === "google") google += 1;
      else app += 1;
    });
    return { app, google, total: mergedItems.length };
  }, [mergedItems]);

  const handleConnectGcal = async () => {
    if (!user) return;
    const gcalBase = getGcalUrl();
    if (!gcalBase) {
      setGcalError("Supabase URL not configured");
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${gcalBase}?action=auth-url`, {
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data?.authUrl) {
        const popup = window.open(data.authUrl, "google-auth", "width=500,height=600");
        const t = setInterval(() => {
          if (popup?.closed) {
            clearInterval(t);
            fetchGcal();
          }
        }, 500);
      }
    } catch (e) {
      setGcalError(e instanceof Error ? e.message : "Could not connect");
    }
  };

  const handleDisconnectGcal = async () => {
    if (!user) return;
    const gcalBase = getGcalUrl();
    if (!gcalBase) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch(`${gcalBase}?action=disconnect`, {
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      });
      setGcalEvents([]);
      setGcalNeedsAuth(true);
      setGcalError(null);
    } catch {
      /* ignore disconnect errors */
    }
  };

  const handleCreateAppointment = async () => {
    if (!newAppointment.title.trim()) {
      toast({ title: "Error", description: "Please enter a title", variant: "destructive" });
      return;
    }
    if (!newAppointment.startTime) {
      toast({ title: "Error", description: "Please enter a start time", variant: "destructive" });
      return;
    }

    try {
      const dateTime = toBrisbaneIso(newAppointment.date, newAppointment.startTime);
      const endDateTime = newAppointment.endTime
        ? toBrisbaneIso(newAppointment.date, newAppointment.endTime)
        : toBrisbaneIso(
            newAppointment.date,
            endTimeFromStart(newAppointment.startTime, defaultDuration),
          );
      await createAppointmentWithGcal.mutateAsync({
        title: newAppointment.title,
        date: dateTime,
        location: newAppointment.location || null,
        notes: newAppointment.notes || null,
        type: newAppointment.type,
        syncToGoogle: newAppointment.syncToGoogle,
        endDateTime,
      });
      toast({ title: "Success", description: "Appointment created!" });
      refetchAppointments();
      fetchGcal();
      setNewAppointment({
        title: "",
        date: format(new Date(), "yyyy-MM-dd"),
        startTime: "09:00",
        endTime: "",
        location: "",
        type: "meeting",
        notes: "",
        syncToGoogle: true,
      });
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create appointment",
        variant: "destructive",
      });
    }
  };

  const formatEventTime = (item: CalendarItem): string => {
    try {
      const date = parseISO(item.date);
      return format(date, "h:mm a");
    } catch {
      return "";
    }
  };

  const sourceAccent = (source: CalendarItemSource) =>
    source === "google"
      ? "border-l-4 border-l-sky-500 bg-sky-500/[0.06]"
      : "border-l-4 border-l-primary bg-primary/[0.06]";

  // Render calendar views
  const renderDayView = () => {
    const events = getEventsForDate(currentDate);
    return (
      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Selected day</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {format(currentDate, "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openNewAppointmentForSlot(currentDate)}
          className="group w-full rounded-xl border-2 border-dashed border-border/80 bg-muted/20 py-4 text-sm font-medium text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Plus className="h-4 w-4 transition-transform group-hover:scale-110" />
            Add booking for this day
          </span>
        </button>
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-muted/10 py-14 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <CalendarDays className="h-7 w-7 text-primary" />
            </div>
            <p className="font-medium text-foreground">Nothing on the calendar</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">Add an appointment or connect Google to see external events.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {events.map((item) => (
              <li key={item.id}>
                <Card
                  className={cn(
                    "overflow-hidden border-border bg-card/90 shadow-sm transition-shadow hover:shadow-md",
                    sourceAccent(item.source),
                  )}
                >
                  <div className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">{item.title}</span>
                        <Badge
                          variant={item.source === "google" ? "outline" : "default"}
                          className={cn(
                            "text-[10px] font-normal uppercase tracking-wide",
                            item.source === "google" && "border-sky-500/40 bg-sky-500/10 text-sky-100",
                          )}
                        >
                          {item.source === "google" ? "Google" : "App"}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 shrink-0 text-primary/80" />
                          {formatEventTime(item)}
                        </span>
                        {item.location ? (
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">{item.location}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {item.htmlLink ? (
                      <a
                        href={item.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-lg p-2 text-primary ring-offset-background transition-colors hover:bg-muted hover:text-primary"
                        title="Open in Google Calendar"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <WeekView
        days={weekDays}
        itemsForDay={getEventsForDate}
        defaultDurationMinutes={defaultDuration}
        contactNameFor={contactNameFor}
        onAddAt={(d, startTime) => openNewAppointmentForSlot(d, startTime)}
        onSelectItem={(item) => {
          if (item.source === "google" && item.htmlLink) window.open(item.htmlLink, "_blank");
        }}
      />
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const selectedItems = getEventsForDate(selectedDay);

    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-xl border border-border/80">
          <div className="grid grid-cols-7 gap-px bg-border">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div
                key={day}
                className="bg-muted/50 px-1 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-border">
            {days.map((day) => {
              const events = getEventsForDate(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = isSameDay(day, selectedDay);
              const clashes = clashingIds(events, defaultDuration);
              const load = dayLoad(events);
              const shown = events.slice(0, 3);

              return (
                <div
                  key={day.toISOString()}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedDay(day)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedDay(day);
                    }
                  }}
                  onDoubleClick={() => openNewAppointmentForSlot(day)}
                  className={cn(
                    "min-w-0 cursor-pointer overflow-hidden bg-card p-1.5 text-left transition-colors hover:bg-muted/40 sm:p-2",
                    "min-h-[96px] sm:min-h-[116px]",
                    !isCurrentMonth && "bg-muted/20",
                    isSelected && "ring-2 ring-inset ring-primary",
                  )}
                  title="Click to open this day · double-click to add"
                >
                  <div className="mb-1 flex items-center gap-1">
                    <span
                      className={cn(
                        "inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full text-xs tabular-nums",
                        isToday(day)
                          ? "bg-primary font-semibold text-primary-foreground"
                          : cn("font-medium text-foreground", !isCurrentMonth && "text-muted-foreground/60"),
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {clashes.size > 0 ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" title="Double-booked" />
                    ) : null}
                    <span className="ml-auto flex gap-[2px]" aria-hidden>
                      {[1, 2, 3].map((n) => (
                        <span
                          key={n}
                          className={cn(
                            "block h-1 w-1 rounded-full",
                            load >= n ? "bg-muted-foreground/70" : "bg-transparent",
                          )}
                        />
                      ))}
                    </span>
                  </div>

                  <div className="space-y-[3px]">
                    {shown.map((item) => {
                      const meta = metaFor(item);
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "flex min-w-0 items-baseline gap-1 rounded-sm border-l-2 px-1 py-[2px] text-[10.5px] leading-tight",
                            meta.bar,
                            meta.chip,
                            clashes.has(item.id) && "bg-red-500/15",
                          )}
                          title={`${item.allDay ? "All day" : format(parseISO(item.date), "h:mm a")} — ${item.title}`}
                        >
                          {!item.allDay ? (
                            <span className="shrink-0 tabular-nums text-muted-foreground">
                              {format(parseISO(item.date), "HH:mm")}
                            </span>
                          ) : null}
                          <span className="min-w-0 flex-1 truncate text-foreground">{item.title}</span>
                        </div>
                      );
                    })}
                    {events.length > shown.length ? (
                      <div className="pl-1 text-[10px] font-medium text-muted-foreground">
                        +{events.length - shown.length} more
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <DayRail
            day={selectedDay}
            items={selectedItems}
            defaultDurationMinutes={defaultDuration}
            contactNameFor={contactNameFor}
            onAddAt={(d, startTime) => openNewAppointmentForSlot(d, startTime)}
            onSelectItem={(item) => {
              if (item.source === "google" && item.htmlLink) window.open(item.htmlLink, "_blank");
            }}
          />
        </div>
      </div>
    );
  };

  const renderTypeFilters = () => {
    if (presentTypes.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1.5">
        {presentTypes.map((t) => {
          const meta = metaFor({ source: "app", type: t });
          const count = mergedItems.filter((i) => i.source === "app" && (i.type ?? "meeting") === t).length;
          const on = activeTypes.size === 0 || activeTypes.has(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggleType(t)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-opacity",
                on ? "border-border/80 text-foreground" : "border-border/50 text-muted-foreground opacity-45",
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
              {typeLabel(t)}
              <span className="tabular-nums text-muted-foreground">{count}</span>
            </button>
          );
        })}
        {activeTypes.size > 0 ? (
          <button
            type="button"
            onClick={() => setActiveTypes(new Set())}
            className="rounded-full px-2.5 py-1 text-[11.5px] font-medium text-primary underline-offset-2 hover:underline"
          >
            Show all
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <div className="animate-fade-in mx-auto max-w-[1600px] space-y-4 pb-10">
      <PageHeader
        title="Calendar"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" size="sm">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add appointment</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="border-border bg-card sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>New Appointment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    placeholder="Appointment title"
                    className="bg-input"
                    value={newAppointment.title}
                    onChange={(e) => setNewAppointment({ ...newAppointment, title: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      className="bg-input"
                      value={newAppointment.date}
                      onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={newAppointment.type}
                      onValueChange={(value: any) => setNewAppointment({ ...newAppointment, type: value })}
                    >
                      <SelectTrigger className="bg-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {APPOINTMENT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time *</Label>
                    <Input
                      type="time"
                      className="bg-input"
                      value={newAppointment.startTime}
                      onChange={(e) => {
                        const startTime = e.target.value;
                        setNewAppointment({
                          ...newAppointment,
                          startTime,
                          endTime: endTimeFromStart(startTime, defaultDuration),
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      className="bg-input"
                      value={newAppointment.endTime}
                      onChange={(e) => setNewAppointment({ ...newAppointment, endTime: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    placeholder="Meeting location"
                    className="bg-input"
                    value={newAppointment.location}
                    onChange={(e) => setNewAppointment({ ...newAppointment, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Additional notes..."
                    className="bg-input min-h-[80px]"
                    value={newAppointment.notes}
                    onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sync-google"
                      checked={newAppointment.syncToGoogle && !gcalNeedsAuth}
                      disabled={gcalNeedsAuth}
                      onCheckedChange={(checked) =>
                        setNewAppointment({ ...newAppointment, syncToGoogle: checked as boolean })
                      }
                    />
                    <Label htmlFor="sync-google" className="text-sm font-normal cursor-pointer">
                      Sync to Google Calendar
                      {gcalNeedsAuth && " (Connect Google below first)"}
                    </Label>
                  </div>
                  {!gcalNeedsAuth ? (
                    <p className="text-xs text-muted-foreground">
                      Booking will be saved in the app and created in your Google Calendar so both stay in sync.
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateAppointment} disabled={createAppointmentWithGcal.isPending}>
                  {createAppointmentWithGcal.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Single toolbar: navigation, period, view mode, compact stats & Google */}
      <Card className="zoho-card overflow-hidden border-border shadow-sm">
        <div className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={navigatePrevious} aria-label="Previous">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={navigateNext} aria-label="Next">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="secondary" size="sm" className="h-8 shrink-0 px-3 text-xs font-semibold sm:h-9 sm:text-sm" onClick={navigateToday}>
                  Today
                </Button>
              </div>
              <p className="min-w-0 truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                {viewMode === "day" && format(currentDate, "EEEE, MMMM d, yyyy")}
                {viewMode === "week" &&
                  `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d")} – ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d, yyyy")}`}
                {viewMode === "month" && format(currentDate, "MMMM yyyy")}
              </p>
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full lg:w-auto lg:shrink-0">
              <SegmentedTabsList className="grid h-10 w-full grid-cols-3 gap-1 sm:h-11 lg:w-[min(100%,300px)]">
                <SegmentedTabsTrigger value="day" className="text-xs sm:text-sm">
                  Day
                </SegmentedTabsTrigger>
                <SegmentedTabsTrigger value="week" className="text-xs sm:text-sm">
                  Week
                </SegmentedTabsTrigger>
                <SegmentedTabsTrigger value="month" className="text-xs sm:text-sm">
                  Month
                </SegmentedTabsTrigger>
              </SegmentedTabsList>
            </Tabs>
          </div>

          <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p className="text-[13px] text-muted-foreground">
              <span className="font-semibold tabular-nums text-foreground">{eventCounts.total}</span> events
              <span className="mx-1.5 text-border">·</span>
              <span className="tabular-nums text-primary">{eventCounts.app}</span> in-app
              <span className="mx-1.5 text-border">·</span>
              <span className="tabular-nums text-sky-400 dark:text-sky-300">{eventCounts.google}</span> Google
            </p>
            {user ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="hidden text-muted-foreground sm:inline">Google</span>
                {gcalNeedsAuth ? (
                  <>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleConnectGcal} disabled={gcalLoading}>
                      {gcalLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CalendarIcon className="h-3.5 w-3.5" />}
                      Connect
                    </Button>
                    <Link to="/settings/integrations" className="text-[11px] text-primary hover:underline">
                      Integration settings
                    </Link>
                  </>
                ) : (
                  <>
                    <Badge
                      variant="secondary"
                      className="border border-emerald-500/25 bg-emerald-500/10 text-[11px] font-normal text-emerald-200"
                    >
                      Connected
                    </Badge>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchGcal} title="Refresh Google events" disabled={gcalLoading}>
                      <RefreshCw className={cn("h-3.5 w-3.5", gcalLoading && "animate-spin")} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={handleDisconnectGcal}
                      title="Disconnect Google"
                    >
                      <Unlink className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
        {gcalError ? (
          <div className="border-t border-border bg-destructive/10 px-3 py-2.5 text-sm text-destructive sm:px-4">{gcalError}</div>
        ) : null}
      </Card>

      {/* Calendar View */}
      <Card className="zoho-card border-border p-4 shadow-sm sm:p-6">
        {viewMode === "month" || viewMode === "week" ? <div className="mb-4">{renderTypeFilters()}</div> : null}
        {viewMode === "day" && renderDayView()}
        {viewMode === "week" && renderWeekView()}
        {viewMode === "month" && renderMonthView()}
      </Card>

      {/* Upcoming Events */}
      <Card className="zoho-card border-border p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-foreground">Upcoming</h3>
            <p className="text-sm text-muted-foreground">Next events from today — newest first.</p>
          </div>
          {upcomingItems.length > 0 ? (
            <span className="text-xs font-medium text-muted-foreground tabular-nums">{upcomingItems.length} shown</span>
          ) : null}
        </div>
        {upcomingItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-12 text-center">
            <Clock className="mb-2 h-8 w-8 text-muted-foreground/60" />
            <p className="font-medium text-foreground">No upcoming events</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">You&apos;re clear ahead — add an appointment or connect Google.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[320px] pr-3">
            <ul className="space-y-2">
              {upcomingItems.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    "flex items-start justify-between gap-3 rounded-xl border border-border bg-card/60 p-3 transition-colors hover:bg-muted/40",
                    item.source === "google" && "border-sky-500/20 bg-sky-500/[0.04]",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{item.title}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-normal",
                          item.source === "google"
                            ? "border-sky-500/35 bg-sky-500/10 text-sky-100"
                            : "border-primary/40 bg-primary/10",
                        )}
                      >
                        {item.source === "google" ? "Google" : "App"}
                      </Badge>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {format(parseISO(item.date), "EEE d MMM, h:mm a")}
                      {item.location ? ` · ${item.location}` : ""}
                    </div>
                  </div>
                  {item.htmlLink ? (
                    <a
                      href={item.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-lg p-2 text-primary hover:bg-muted"
                      title="Open in Google"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </Card>
    </div>
  );
}
