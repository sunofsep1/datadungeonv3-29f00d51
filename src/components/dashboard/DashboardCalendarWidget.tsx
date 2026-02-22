import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  ExternalLink,
  RefreshCw,
  Unlink,
  Pencil,
  Trash2,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { useAppointments, useDeleteAppointment } from "@/hooks/useAppointments";
import { useCreateAppointmentWithGcal } from "@/hooks/useCreateAppointmentWithGcal";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
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
  addHours,
} from "date-fns";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

type ViewMode = "day" | "week" | "month";

interface GCalEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  htmlLink?: string;
  location?: string;
}

export type CalendarItemSource = "app" | "google";

export interface CalendarItem {
  id: string;
  title: string;
  date: string;
  source: CalendarItemSource;
  location?: string | null;
  htmlLink?: string;
}

const getGcalUrl = () => {
  const base = import.meta.env.VITE_SUPABASE_URL;
  return base ? `${base}/functions/v1/google-calendar` : null;
};

type AppointmentType = "valuation" | "meeting" | "call" | "inspection";

function EventChip({
  item,
  onEdit,
  onDelete,
  onOpenGoogle,
  tooltipContent,
  titleAttribute,
  size = "sm",
}: {
  item: CalendarItem;
  onEdit?: () => void;
  onDelete?: () => void;
  onOpenGoogle?: () => void;
  tooltipContent?: React.ReactNode;
  /** Native title for fallback tooltip when hover preview is not shown */
  titleAttribute?: string;
  size?: "sm" | "md";
}) {
  const isApp = item.source === "app";
  const content = (
    <div className={cn(
      "truncate text-[10px] px-1 rounded mb-0.5 cursor-pointer hover:opacity-90",
      item.source === "google" ? "bg-amber-500/20 text-amber-700 dark:text-amber-400" : "bg-primary/20 text-primary"
    )}>
      {item.title}
    </div>
  );

  const wrapWithTooltip = (node: React.ReactNode) =>
    tooltipContent ? (
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span className="block w-full min-h-[1em]" title={titleAttribute}>{node}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] z-[100]" sideOffset={6}>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    ) : titleAttribute ? (
      <span className="block w-full" title={titleAttribute}>{node}</span>
    ) : (
      node
    );

  if (isApp && (onEdit || onDelete)) {
    return wrapWithTooltip(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="w-full text-left" onClick={(e) => e.stopPropagation()}>
            {content}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48" onClick={(e) => e.stopPropagation()}>
          {onEdit && <DropdownMenuItem onClick={onEdit}><Pencil className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>}
          {onDelete && <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  if (onOpenGoogle) {
    return wrapWithTooltip(
      <button type="button" className="w-full text-left" onClick={(e) => { e.stopPropagation(); onOpenGoogle(); }}>
        {content}
      </button>
    );
  }
  return wrapWithTooltip(<div onClick={(e) => e.stopPropagation()}>{content}</div>);
}

interface DashboardCalendarWidgetProps {
  onDayClick?: (date: Date) => void;
  onAddAppointmentRequest?: (date: Date) => void;
}

export function DashboardCalendarWidget({ onDayClick, onAddAppointmentRequest }: DashboardCalendarWidgetProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: appointments = [], isError: appointmentsError, refetch: refetchAppointments } = useAppointments();
  const createAppointmentWithGcal = useCreateAppointmentWithGcal();
  const deleteAppointment = useDeleteAppointment();
  const handleDayOrAdd = onAddAppointmentRequest ?? onDayClick;
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());

  const [gcalEvents, setGcalEvents] = useState<GCalEvent[]>([]);
  const [gcalLoading, setGcalLoading] = useState(false);
  const [gcalNeedsAuth, setGcalNeedsAuth] = useState(false);
  const [gcalError, setGcalError] = useState<string | null>(null);

  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [newBooking, setNewBooking] = useState({
    title: "",
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "",
    location: "",
    type: "meeting" as AppointmentType,
    notes: "",
    syncToGoogle: true,
  });

  const openNewAppointmentForSlot = (date: Date, startTime?: string) => {
    setNewBooking((prev) => ({
      ...prev,
      date: format(date, "yyyy-MM-dd"),
      startTime: startTime ?? prev.startTime,
      title: "",
      notes: "",
    }));
    setIsBookingDialogOpen(true);
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
      const msg = e instanceof Error ? e.message : "Failed to fetch Google Calendar";
      const isNetwork = /failed to fetch|network|load/i.test(msg);
      setGcalError(isNetwork
        ? "Could not reach calendar. Deploy the google-calendar Edge Function to your Supabase project and ensure VITE_SUPABASE_URL in .env matches that project."
        : msg);
      setGcalEvents([]);
    } finally {
      setGcalLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGcal();
  }, [fetchGcal]);

  const mergedItems = useMemo((): CalendarItem[] => {
    const appItems: CalendarItem[] = (appointments ?? []).map((a) => ({
      id: `app-${a.id}`,
      title: a.title,
      date: a.date,
      source: "app" as const,
      location: a.location ?? null,
    }));
    const gcItems: CalendarItem[] = gcalEvents.map((e) => {
      const dateStr = e.start?.dateTime ?? e.start?.date ?? "";
      return {
        id: `gc-${e.id}`,
        title: e.summary || "(No title)",
        date: dateStr,
        source: "google" as const,
        location: e.location ?? null,
        htmlLink: e.htmlLink,
      };
    });
    const all = [...appItems, ...gcItems].filter((i) => i.date);
    all.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return all;
  }, [appointments, gcalEvents]);

  // Navigation handlers
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

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return mergedItems.filter((item) => {
      try {
        const d = parseISO(item.date);
        return isSameDay(d, date);
      } catch {
        return false;
      }
    });
  };

  // Get days to display based on view mode
  const displayDays = useMemo(() => {
    switch (viewMode) {
      case "day":
        return [currentDate];
      case "week":
        return eachDayOfInterval({
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 }),
        });
      case "month":
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
      default:
        return [];
    }
  }, [viewMode, currentDate]);

  const getViewTitle = () => {
    switch (viewMode) {
      case "day":
        return format(currentDate, "EEEE, MMMM d, yyyy");
      case "week":
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
      case "month":
        return format(currentDate, "MMMM yyyy");
    }
  };

  const formatEventTime = (item: CalendarItem) => {
    try {
      const date = parseISO(item.date);
      return format(date, "h:mm a");
    } catch {
      return "";
    }
  };

  // Upcoming items (app + Google)
  const upcomingItems = useMemo(() => {
    const now = new Date();
    return mergedItems
      .filter((item) => {
        try {
          return parseISO(item.date) >= now;
        } catch {
          return false;
        }
      })
      .slice(0, 8);
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

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleDeleteAppointment = async (id: string) => {
    const appId = id.startsWith("app-") ? id.replace("app-", "") : id;
    try {
      await deleteAppointment.mutateAsync(appId);
      toast({ title: "Deleted", description: "Appointment removed." });
      setDeleteTarget(null);
      refetchAppointments();
      fetchGcal();
    } catch {
      toast({ title: "Error", description: "Could not delete appointment", variant: "destructive" });
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
    } catch {}
  };

  const handleCreateBooking = async () => {
    if (!newBooking.title.trim()) {
      toast({ title: "Error", description: "Please enter a title", variant: "destructive" });
      return;
    }
    if (!newBooking.startTime) {
      toast({ title: "Error", description: "Please enter a start time", variant: "destructive" });
      return;
    }
    try {
      const dateTime = `${newBooking.date}T${newBooking.startTime}:00`;
      const endDateTime = newBooking.endTime
        ? `${newBooking.date}T${newBooking.endTime}:00`
        : undefined;
      await createAppointmentWithGcal.mutateAsync({
        title: newBooking.title,
        date: dateTime,
        location: newBooking.location || null,
        notes: newBooking.notes || null,
        type: newBooking.type,
        syncToGoogle: newBooking.syncToGoogle,
        endDateTime,
      });
      toast({ title: "Success", description: "Booking created!" });
      refetchAppointments();
      fetchGcal();
      setNewBooking({
        title: "",
        date: format(new Date(), "yyyy-MM-dd"),
        startTime: "09:00",
        endTime: "",
        location: "",
        type: "meeting",
        notes: "",
        syncToGoogle: true,
      });
      setIsBookingDialogOpen(false);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create booking",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="zoho-card p-4 md:p-6">
      <TooltipProvider delayDuration={200} skipDelayDuration={0}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Calendar</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user && (
            <div className="flex items-center gap-1">
              {gcalNeedsAuth ? (
                <Button variant="outline" size="sm" onClick={handleConnectGcal} disabled={gcalLoading} className="gap-1">
                  {gcalLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CalendarIcon className="w-3 h-3" />}
                  Connect Google
                </Button>
              ) : (
                <>
                  <Badge variant="secondary" className="text-xs font-normal">Google connected</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchGcal} title="Refresh Google Calendar" disabled={gcalLoading}>
                    <RefreshCw className={cn("w-3 h-3", gcalLoading && "animate-spin")} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDisconnectGcal} title="Disconnect Google Calendar">
                    <Unlink className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          )}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="h-8">
              <TabsTrigger value="day" className="text-xs px-2">Day</TabsTrigger>
              <TabsTrigger value="week" className="text-xs px-2">Week</TabsTrigger>
              <TabsTrigger value="month" className="text-xs px-2">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="default"
            size="sm"
            onClick={() => openNewAppointmentForSlot(new Date())}
            className="gap-1"
          >
            <Plus className="w-3 h-3" />
            Add booking
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/calendar")}
            className="gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="hidden sm:inline">Full Calendar</span>
          </Button>
        </div>
      </div>

      {/* New booking dialog */}
      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent className="sm:max-w-[440px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>New booking</DialogTitle>
            <DialogDescription className="text-muted-foreground">Create an appointment from the calendar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label className="text-foreground">Title *</Label>
              <Input
                placeholder="Appointment title"
                className="bg-input border-border"
                value={newBooking.title}
                onChange={(e) => setNewBooking({ ...newBooking, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-foreground">Date</Label>
                <Input
                  type="date"
                  className="bg-input border-border"
                  value={newBooking.date}
                  onChange={(e) => setNewBooking({ ...newBooking, date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">Type</Label>
                <Select
                  value={newBooking.type}
                  onValueChange={(v: AppointmentType) => setNewBooking({ ...newBooking, type: v })}
                >
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="valuation">Valuation</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-foreground">Start time</Label>
                <Input
                  type="time"
                  className="bg-input border-border"
                  value={newBooking.startTime}
                  onChange={(e) => setNewBooking({ ...newBooking, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">End time</Label>
                <Input
                  type="time"
                  className="bg-input border-border"
                  value={newBooking.endTime}
                  onChange={(e) => setNewBooking({ ...newBooking, endTime: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground">Location</Label>
              <Input
                placeholder="Meeting location"
                className="bg-input border-border"
                value={newBooking.location}
                onChange={(e) => setNewBooking({ ...newBooking, location: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground">Notes</Label>
              <Textarea
                placeholder="Optional notes..."
                className="bg-input border-border min-h-[60px]"
                value={newBooking.notes}
                onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dashboard-sync-google"
                  checked={newBooking.syncToGoogle && !gcalNeedsAuth}
                  disabled={gcalNeedsAuth}
                  onCheckedChange={(checked) =>
                    setNewBooking({ ...newBooking, syncToGoogle: checked as boolean })
                  }
                />
                <Label htmlFor="dashboard-sync-google" className="text-sm font-normal cursor-pointer text-foreground">
                  Sync to Google Calendar
                  {gcalNeedsAuth && " (connect above first)"}
                </Label>
              </div>
              {!gcalNeedsAuth && (
                <p className="text-xs text-muted-foreground">Saved in app and created in Google Calendar.</p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsBookingDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateBooking} disabled={createAppointmentWithGcal.isPending}>
              {createAppointmentWithGcal.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {appointmentsError && (
        <div className="flex items-center justify-between gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">Couldn&apos;t load appointments.</p>
          <Button variant="outline" size="sm" onClick={() => refetchAppointments()}>Retry</Button>
        </div>
      )}
      {gcalError && !gcalNeedsAuth && (
        <div className="flex flex-col gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-destructive font-medium">Google Calendar</p>
            <Button variant="outline" size="sm" onClick={fetchGcal}>Retry</Button>
          </div>
          <p className="text-sm text-destructive/90">{gcalError}</p>
          {gcalError.toLowerCase().includes("not configured") && (
            <div className="text-xs text-destructive/80 mt-1 space-y-1">
              <p>
                Setup: add <strong>GOOGLE_CLIENT_ID</strong> and <strong>GOOGLE_CLIENT_SECRET</strong> in{" "}
                <a 
                  href="https://supabase.com/dashboard/project/sujyalrzbubvhpkntwja/functions/google-calendar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-destructive font-medium"
                >
                  Supabase → Edge Functions → google-calendar
                </a>
              </p>
              <p>
                See <code className="bg-destructive/10 px-1 py-0.5 rounded font-mono">docs/GOOGLE_CALENDAR_SETUP.md</code> in the repo for step-by-step instructions.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={navigatePrevious}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={navigateNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <h4 className="text-sm font-medium text-foreground">{getViewTitle()}</h4>
      </div>

      {/* Calendar Grid */}
      {viewMode === "month" && (
        <div className="grid grid-cols-7 gap-1 mb-4">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
          {displayDays.map((day, idx) => {
            const dayEvents = getEventsForDate(day);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleDayOrAdd?.(day)}
                className={cn(
                  "min-h-[60px] p-1 border border-border rounded text-xs text-left transition-colors hover:bg-muted/50 cursor-pointer",
                  isToday(day) && "bg-primary/10 border-primary",
                  !isSameMonth(day, currentDate) && "opacity-40"
                )}
                title="Click to add booking"
              >
                <div className={cn(
                  "font-medium mb-1",
                  isToday(day) && "text-primary"
                )}>
                  {format(day, "d")}
                </div>
                {dayEvents.slice(0, 2).map((item) => (
                  <EventChip
                    key={item.id}
                    item={item}
                    onEdit={() => item.source === "app" && navigate(`/appointments?edit=${item.id.replace("app-", "")}`)}
                    onDelete={() => item.source === "app" && setDeleteTarget(item.id)}
                    onOpenGoogle={item.htmlLink ? () => window.open(item.htmlLink!) : undefined}
                    titleAttribute={[item.title, formatEventTime(item), item.location ?? ""].filter(Boolean).join(" · ")}
                    tooltipContent={
                      <div className="space-y-0.5 text-left">
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{formatEventTime(item)}</p>
                        {item.location && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{item.location}</p>}
                      </div>
                    }
                  />
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-[10px] text-muted-foreground">
                    +{dayEvents.length - 2} more
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {viewMode === "week" && (
        <div className="grid grid-cols-7 gap-1 mb-4">
          {displayDays.map((day, idx) => {
            const dayEvents = getEventsForDate(day);
            return (
              <div
                key={idx}
                role="button"
                tabIndex={0}
                onClick={() => handleDayOrAdd?.(day)}
                onKeyDown={(e) => e.key === "Enter" && handleDayOrAdd?.(day)}
                className={cn(
                  "min-h-[100px] p-2 border border-border rounded text-left transition-colors hover:bg-muted/50 cursor-pointer",
                  isToday(day) && "bg-primary/10 border-primary"
                )}
              >
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openNewAppointmentForSlot(day); }}
                  className={cn(
                    "text-xs font-medium mb-2 text-left rounded p-1 -m-1 hover:bg-white/10 transition-colors",
                    isToday(day) && "text-primary"
                  )}
                  title="Click to add booking"
                >
                  <div>{format(day, "EEE")}</div>
                  <div className="text-lg">{format(day, "d")}</div>
                </button>
                <div className="flex-1 space-y-1">
                {dayEvents.map((item) => (
                  <div key={item.id} onClick={(e) => e.stopPropagation()}>
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <span className="block w-full min-h-[1em]">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                title={[item.title, formatEventTime(item), item.location].filter(Boolean).join(" · ")}
                                className={cn(
                                  "w-full text-left text-xs px-1 py-0.5 rounded mb-1 truncate block hover:opacity-90",
                                  item.source === "google" ? "bg-amber-500/20 text-amber-700 dark:text-amber-400" : "bg-primary/20 text-primary"
                                )}
                              >
                                <div className="font-medium truncate">{item.title}</div>
                                <div className="text-[10px] opacity-75">{formatEventTime(item)}</div>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48">
                              {item.source === "app" && (
                                <>
                                  <DropdownMenuItem onClick={() => navigate(`/appointments?edit=${item.id.replace("app-", "")}`)}><Pencil className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setDeleteTarget(item.id)} className="text-destructive focus:text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                                </>
                              )}
                              {item.source === "google" && item.htmlLink && (
                                <DropdownMenuItem onClick={() => window.open(item.htmlLink!)}><ExternalLink className="w-4 h-4 mr-2" /> Open in Google Calendar</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[240px] z-[100]" sideOffset={6}>
                        <div className="space-y-0.5 text-left">
                          <p className="font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{formatEventTime(item)}</p>
                          {item.location && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{item.location}</p>}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ))}
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDayOrAdd?.(day); }}
                  className="mt-2 text-[10px] text-muted-foreground hover:text-primary transition-colors text-left"
                >
                  + Add booking
                </button>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "day" && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => handleDayOrAdd?.(currentDate)}
            className={cn(
              "w-full p-4 border border-border rounded text-left transition-colors hover:bg-muted/50 cursor-pointer",
              isToday(currentDate) && "bg-primary/5 border-primary"
            )}
          >
            <div className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              {format(currentDate, "EEEE, MMMM d")}
              {isToday(currentDate) && (
                <Badge variant="secondary" className="text-xs">Today</Badge>
              )}
            </div>
            <button
              type="button"
              onClick={() => openNewAppointmentForSlot(currentDate)}
              className="w-full py-3 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-muted/50 transition-colors text-sm mb-4"
            >
              + Add booking for this day
            </button>
            {getEventsForDate(currentDate).length === 0 ? (
              <p className="text-sm text-muted-foreground">Click to add an appointment</p>
            ) : (
              <div className="space-y-3">
                {getEventsForDate(currentDate).map((item) => (
                  <div key={item.id} onClick={(e) => e.stopPropagation()} className="flex items-start gap-3 p-3 bg-secondary rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{item.title}</span>
                        <Badge variant={item.source === "google" ? "secondary" : "default"} className="text-[10px]">
                          {item.source === "google" ? "Google" : "App"}
                        </Badge>
                        {item.source === "app" ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
                                <MoreHorizontal className="w-3 h-3" /> Actions
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={() => navigate(`/appointments?edit=${item.id.replace("app-", "")}`)}><Pencil className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeleteTarget(item.id)} className="text-destructive focus:text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : item.htmlLink ? (
                          <a href={item.htmlLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                            <ExternalLink className="w-3 h-3" /> Open in Google
                          </a>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        {formatEventTime(item)}
                      </div>
                      {item.location && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3" />
                          {item.location}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </button>
        </div>
      )}

      {/* Upcoming */}
      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-medium text-foreground mb-3">Upcoming</h4>
        {upcomingItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming appointments or Google Calendar events</p>
        ) : (
          <div className="space-y-2">
            {upcomingItems.map((item) => {
              let dateStr = "";
              try {
                dateStr = format(parseISO(item.date), "EEEE, MMM d, h:mm a");
              } catch {}
              return (
                <div key={item.id} className="flex items-center gap-3 text-sm group">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      item.source === "google" ? "bg-amber-500" : "bg-primary"
                    )}
                  />
                  <div className="flex-1 min-w-0 truncate flex items-center gap-2">
                    <span className="font-medium truncate">{item.title}</span>
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">
                      {item.source === "google" ? "Google" : "App"}
                    </Badge>
                  </div>
                  {item.source === "app" ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 text-xs flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/appointments?edit=${item.id.replace("app-", "")}`)}><Pencil className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteTarget(item.id)} className="text-destructive focus:text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : item.htmlLink ? (
                    <a
                      href={item.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex-shrink-0"
                      title="Open in Google Calendar"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : null}
                  <div className="text-xs text-muted-foreground flex-shrink-0">{dateStr}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete appointment?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the appointment. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDeleteAppointment(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </TooltipProvider>
    </Card>
  );
}
