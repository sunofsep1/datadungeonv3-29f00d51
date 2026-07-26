import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar as CalendarIcon, 
  ExternalLink, 
  RefreshCw, 
  Unlink, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Printer,
  Download,
  Clock,
  MapPin
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useAppointments, APPOINTMENT_TYPES } from "@/hooks/useAppointments";
import { useCreateAppointmentWithGcal } from "@/hooks/useCreateAppointmentWithGcal";
import { useLeads } from "@/hooks/useLeads";
import { 
  format, 
  parseISO, 
  isToday, 
  isTomorrow, 
  isThisWeek,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays
} from "date-fns";
import { toBrisbaneIso } from "@/lib/appointmentTime";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  htmlLink: string;
  location?: string;
}

type ViewMode = "day" | "week" | "month";

// Derived from the shared vocabulary so this widget can never again write a
// value the rest of the app does not recognise — it previously saved
// "open-home" with a hyphen, which matched nothing in the database.
const TYPE_COLORS: Record<string, string> = {
  appraisal: "bg-purple-500",
  listing_appt: "bg-amber-500",
  open_home: "bg-emerald-500",
  inspection: "bg-blue-500",
  valuation: "bg-indigo-500",
  settlement: "bg-green-500",
  prospecting: "bg-sky-500",
  call: "bg-teal-500",
  team: "bg-pink-500",
  personal: "bg-slate-500",
  meeting: "bg-cyan-500",
};

const EVENT_TYPES = APPOINTMENT_TYPES.map((t) => ({
  value: t.value as string,
  label: t.label as string,
  color: TYPE_COLORS[t.value] ?? "bg-gray-500",
}));

export function EnhancedCalendarWidget() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: localAppointments = [] } = useAppointments();
  const { data: leads = [] } = useLeads();
  const createAppointmentWithGcal = useCreateAppointmentWithGcal();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  // New appointment form
  const [newAppointment, setNewAppointment] = useState({
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    type: "meeting",
    leadId: "",
  });

  const fetchEvents = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!baseUrl) {
        setError("Supabase URL not configured");
        setLoading(false);
        return;
      }
      const response = await fetch(
        `${baseUrl}/functions/v1/google-calendar?action=events`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error || `Calendar error (${response.status})`);
        setEvents([]);
        setLoading(false);
        return;
      }
      if (data?.needsAuth) {
        setNeedsAuth(true);
        setEvents([]);
      } else if (data?.events) {
        setEvents(data.events);
        setNeedsAuth(false);
      } else if (data?.error) {
        console.error("Calendar error:", data.error);
        if (data.error === "Not connected") {
          setNeedsAuth(true);
        } else {
          setError(data.error);
        }
        setEvents([]);
      }
    } catch (e) {
      console.error("Error fetching events:", e);
      setError(e instanceof Error ? e.message : "Failed to fetch Google Calendar");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [user]);

  const handleConnect = async () => {
    if (!user) return;
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!baseUrl) {
      toast({ title: "Error", description: "Supabase URL not configured", variant: "destructive" });
      return;
    }
    setConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${baseUrl}/functions/v1/google-calendar?action=auth-url`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (data.authUrl) {
        const popup = window.open(data.authUrl, "google-auth", "width=500,height=600");
        const checkPopup = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkPopup);
            setConnecting(false);
            fetchEvents();
          }
        }, 1000);
      }
    } catch (error) {
      console.error("Error connecting:", error);
      toast({
        title: "Connection failed",
        description: "Could not connect to Google Calendar",
        variant: "destructive",
      });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!baseUrl) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch(
        `${baseUrl}/functions/v1/google-calendar?action=disconnect`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setEvents([]);
      setNeedsAuth(true);
      toast({
        title: "Disconnected",
        description: "Google Calendar has been disconnected",
      });
    } catch (error) {
      console.error("Error disconnecting:", error);
    }
  };

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

  // Combine Google events with local appointments
  const allEvents = useMemo(() => {
    const localEvents: CalendarEvent[] = localAppointments.map((apt) => ({
      id: apt.id,
      summary: apt.title,
      description: apt.notes || undefined,
      start: { dateTime: apt.date },
      end: { dateTime: apt.date },
      htmlLink: "",
      location: apt.location || undefined,
    }));
    return [...events, ...localEvents];
  }, [events, localAppointments]);

  // Filter events by type
  const filteredEvents = useMemo(() => {
    if (filterType === "all") return allEvents;
    return allEvents.filter(event => {
      const summary = event.summary.toLowerCase();
      return summary.includes(filterType);
    });
  }, [allEvents, filterType]);

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return filteredEvents.filter((event) => {
      const eventDate = parseISO(event.start.dateTime || event.start.date || "");
      return isSameDay(eventDate, date);
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
      case "month": {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
      }
      default:
        return [];
    }
  }, [viewMode, currentDate]);

  const handleAddAppointment = async () => {
    if (!newAppointment.title.trim()) {
      toast({ title: "Error", description: "Please enter a title", variant: "destructive" });
      return;
    }
    if (!newAppointment.date) {
      toast({ title: "Error", description: "Please select a date", variant: "destructive" });
      return;
    }
    if (!newAppointment.startTime) {
      toast({ title: "Error", description: "Please enter a start time", variant: "destructive" });
      return;
    }
    if (newAppointment.endTime && newAppointment.endTime <= newAppointment.startTime) {
      toast({ title: "Error", description: "End time must be after start time", variant: "destructive" });
      return;
    }

    try {
      const dateTime = toBrisbaneIso(newAppointment.date, newAppointment.startTime);
      const endDateTime = newAppointment.endTime
        ? toBrisbaneIso(newAppointment.date, newAppointment.endTime)
        : undefined;
      await createAppointmentWithGcal.mutateAsync({
        title: newAppointment.title,
        date: dateTime,
        notes: newAppointment.description || null,
        location: newAppointment.location || null,
        type: newAppointment.type,
        contact_id: newAppointment.leadId || null,
        syncToGoogle: !needsAuth,
        endDateTime,
      });
      fetchEvents();
      toast({ title: "Success", description: "Appointment created!" });
      setNewAppointment({
        title: "",
        description: "",
        date: "",
        startTime: "",
        endTime: "",
        location: "",
        type: "meeting",
        leadId: "",
      });
      setAddDialogOpen(false);
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to create appointment", 
        variant: "destructive" 
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ["Title", "Start Date", "Start Time", "End Date", "End Time", "Location", "Description"];
    const rows = filteredEvents.map((event) => {
      const start = event.start.dateTime ? parseISO(event.start.dateTime) : parseISO(event.start.date || "");
      const end = event.end.dateTime ? parseISO(event.end.dateTime) : parseISO(event.end.date || "");
      return [
        event.summary,
        format(start, "yyyy-MM-dd"),
        event.start.dateTime ? format(start, "HH:mm") : "All day",
        format(end, "yyyy-MM-dd"),
        event.end.dateTime ? format(end, "HH:mm") : "All day",
        event.location || "",
        event.description || "",
      ];
    });

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `schedule-${format(currentDate, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatEventTime = (event: CalendarEvent) => {
    if (!event.start.dateTime) return "All day";
    const start = parseISO(event.start.dateTime);
    return format(start, "h:mm a");
  };

  const getViewTitle = () => {
    switch (viewMode) {
      case "day":
        return format(currentDate, "EEEE, MMMM d, yyyy");
      case "week": {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
      }
      case "month":
        return format(currentDate, "MMMM yyyy");
    }
  };

  if (loading) {
    return (
      <Card className="p-6 bg-card border-border min-h-[500px]">
        <h3 className="text-lg font-semibold text-foreground mb-4">Calendar</h3>
        <div className="flex items-center justify-center h-[400px]">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (needsAuth) {
    return (
      <Card className="p-6 bg-card border-border min-h-[500px]">
        <h3 className="text-lg font-semibold text-foreground mb-4">Calendar</h3>
        <div className="flex flex-col items-center justify-center h-[400px] text-center">
          <CalendarIcon className="w-12 h-12 mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-4">Connect your Google Calendar to see your events</p>
          <Button onClick={handleConnect} disabled={connecting}>
            {connecting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <CalendarIcon className="w-4 h-4 mr-2" />
                Connect Google Calendar
              </>
            )}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card border-border min-h-[500px] print:bg-white print:border-gray-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 print:hidden">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">Calendar</h3>
          <Badge variant="secondary" className="text-xs font-normal">Google connected</Badge>
          <Button variant="ghost" size="icon" onClick={fetchEvents} title="Refresh" disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setAddDialogOpen(true)} size="sm" className="gap-1">
            <Plus className="w-4 h-4" /> Add Appointment
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDisconnect} title="Disconnect">
            <Unlink className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 print:hidden">
          <p className="text-sm text-destructive truncate">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchEvents}>Retry</Button>
        </div>
      )}

      {/* View Toggle and Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={navigatePrevious}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={navigateNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="font-medium text-foreground ml-2">{getViewTitle()}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {EVENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="h-8">
              <TabsTrigger value="day" className="text-xs px-3">Day</TabsTrigger>
              <TabsTrigger value="week" className="text-xs px-3">Week</TabsTrigger>
              <TabsTrigger value="month" className="text-xs px-3">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-4">
        <h2 className="text-2xl font-bold text-black">{getViewTitle()}</h2>
        <p className="text-sm text-gray-600">Printed on {format(new Date(), "PPP")}</p>
      </div>

      {/* Calendar Grid */}
      <div className={cn(
        "border border-border rounded-lg overflow-hidden print:border-gray-300",
        viewMode === "month" && "grid grid-cols-7"
      )}>
        {/* Day headers for month view */}
        {viewMode === "month" && (
          <>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground bg-secondary border-b border-border print:bg-gray-100 print:text-black">
                {day}
              </div>
            ))}
          </>
        )}
        
        {viewMode === "month" ? (
          displayDays.map((day) => {
            const dayEvents = getEventsForDate(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[100px] p-1 border-b border-r border-border print:border-gray-200",
                  !isCurrentMonth && "bg-muted/30",
                  isToday(day) && "bg-primary/10"
                )}
              >
                <div className={cn(
                  "text-xs font-medium mb-1",
                  isToday(day) ? "text-primary" : !isCurrentMonth ? "text-muted-foreground" : "text-foreground"
                )}>
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((event) => (
                    <Popover key={event.id}>
                      <PopoverTrigger asChild>
                        <button 
                          className="w-full text-left text-xs p-1 rounded bg-primary/20 hover:bg-primary/30 truncate text-foreground"
                        >
                          {event.summary}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-2">
                          <h4 className="font-medium">{event.summary}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {formatEventTime(event)}
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="w-4 h-4" />
                              {event.location}
                            </div>
                          )}
                          {event.description && (
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                          )}
                          {event.htmlLink && (
                            <a
                              href={event.htmlLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" /> Open in Google Calendar
                            </a>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  ))}
                  {dayEvents.length > 3 && (
                    <p className="text-xs text-muted-foreground">+{dayEvents.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })
        ) : viewMode === "week" ? (
          <div className="grid grid-cols-7 divide-x divide-border">
            {displayDays.map((day) => {
              const dayEvents = getEventsForDate(day);
              return (
                <div key={day.toISOString()} className="min-h-[400px]">
                  <div className={cn(
                    "p-2 text-center border-b border-border",
                    isToday(day) && "bg-primary/10"
                  )}>
                    <div className="text-xs text-muted-foreground">{format(day, "EEE")}</div>
                    <div className={cn(
                      "text-lg font-medium",
                      isToday(day) ? "text-primary" : "text-foreground"
                    )}>
                      {format(day, "d")}
                    </div>
                  </div>
                  <div className="p-1 space-y-1">
                    {dayEvents.map((event) => (
                      <Popover key={event.id}>
                        <PopoverTrigger asChild>
                          <button className="w-full text-left text-xs p-2 rounded bg-primary/20 hover:bg-primary/30">
                            <div className="font-medium truncate">{event.summary}</div>
                            <div className="text-muted-foreground">{formatEventTime(event)}</div>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">{event.summary}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              {formatEventTime(event)}
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="w-4 h-4" />
                                {event.location}
                              </div>
                            )}
                            {event.description && (
                              <p className="text-sm text-muted-foreground">{event.description}</p>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="min-h-[400px]">
            <div className={cn(
              "p-4 text-center border-b border-border",
              isToday(currentDate) && "bg-primary/10"
            )}>
              <div className="text-2xl font-bold text-foreground">{format(currentDate, "d")}</div>
              <div className="text-sm text-muted-foreground">{format(currentDate, "EEEE")}</div>
            </div>
            <div className="p-4 space-y-2">
              {getEventsForDate(currentDate).length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No events scheduled</p>
              ) : (
                getEventsForDate(currentDate).map((event) => (
                  <div
                    key={event.id}
                    className="p-3 rounded-lg bg-primary/20 border border-primary/30"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">{event.summary}</h4>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {formatEventTime(event)}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            {event.location}
                          </div>
                        )}
                      </div>
                      {event.htmlLink && (
                        <a
                          href={event.htmlLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Appointment Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-popover border-border" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Add Appointment</DialogTitle>
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
            
            <div className="space-y-2">
              <Label>Description / Notes</Label>
              <Textarea
                placeholder="Add notes..."
                className="bg-input min-h-[80px]"
                value={newAppointment.description}
                onChange={(e) => setNewAppointment({ ...newAppointment, description: e.target.value })}
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
                  onValueChange={(v) => setNewAppointment({ ...newAppointment, type: v })}
                >
                  <SelectTrigger className="bg-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
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
                  onChange={(e) => setNewAppointment({ ...newAppointment, startTime: e.target.value })}
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
              <Label>Related Lead (Optional)</Label>
              <Select
                value={newAppointment.leadId}
                onValueChange={(v) => setNewAppointment({ ...newAppointment, leadId: v })}
              >
                <SelectTrigger className="bg-input">
                  <SelectValue placeholder="Select a lead..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      <span className="flex items-center gap-2">
                        {lead.name}
                        {lead.contact_id ? (
                          <span className="text-[10px] text-muted-foreground font-normal">CRM</span>
                        ) : null}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddAppointment} disabled={createAppointmentWithGcal.isPending}>
              {createAppointmentWithGcal.isPending ? "Creating..." : "Add Appointment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
