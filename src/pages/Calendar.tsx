import { useState, useMemo, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  ExternalLink,
  RefreshCw,
  Unlink,
  Plus,
} from "lucide-react";
import { useAppointments, useCreateAppointment } from "@/hooks/useAppointments";
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
  addHours,
} from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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

const GCAL_URL = "https://agflprqqvsndkwlpscvt.supabase.co/functions/v1/google-calendar";

export default function Calendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: appointments = [], isError: appointmentsError, refetch: refetchAppointments } = useAppointments();
  const createAppointment = useCreateAppointment();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());

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
    type: "meeting" as "valuation" | "meeting" | "call" | "inspection",
    notes: "",
    syncToGoogle: true,
  });

  const fetchGcal = useCallback(async () => {
    if (!user) return;
    setGcalLoading(true);
    setGcalError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setGcalLoading(false);
        return;
      }
      const res = await fetch(`${GCAL_URL}?action=events`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
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

  const getEventsForDate = (date: Date): CalendarItem[] => {
    return mergedItems.filter((item) => {
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

  const handleConnectGcal = async () => {
    if (!user) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${GCAL_URL}?action=auth-url`, {
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
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch(`${GCAL_URL}?action=disconnect`, {
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      });
      setGcalEvents([]);
      setGcalNeedsAuth(true);
      setGcalError(null);
    } catch {}
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
      const dateTime = `${newAppointment.date}T${newAppointment.startTime}:00`;
      const appointment = await createAppointment.mutateAsync({
        title: newAppointment.title,
        date: dateTime,
        location: newAppointment.location || null,
        type: newAppointment.type,
        notes: newAppointment.notes || null,
      });

      // Sync to Google Calendar if enabled
      if (newAppointment.syncToGoogle && !gcalNeedsAuth && user) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await fetch(`${GCAL_URL}?action=create-event`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                summary: newAppointment.title,
                description: newAppointment.notes || "",
                start: dateTime,
                end: newAppointment.endTime
                  ? `${newAppointment.date}T${newAppointment.endTime}:00`
                  : addHours(new Date(dateTime), 1).toISOString(),
                location: newAppointment.location || "",
              }),
            });
            fetchGcal();
            toast({ title: "Synced", description: "Added to Google Calendar" });
          }
        } catch (e) {
          console.error("Google Calendar sync failed:", e);
        }
      }

      toast({ title: "Success", description: "Appointment created!" });
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

  // Render calendar views
  const renderDayView = () => {
    const events = getEventsForDate(currentDate);
    return (
      <div className="space-y-2">
        <div className="text-lg font-semibold mb-4">{format(currentDate, "EEEE, MMMM d, yyyy")}</div>
        {events.length === 0 ? (
          <p className="text-white/60 text-center py-8">No events scheduled</p>
        ) : (
          <div className="space-y-2">
            {events.map((item) => (
              <Card key={item.id} className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{item.title}</span>
                      <Badge variant={item.source === "google" ? "secondary" : "default"} className="text-xs">
                        {item.source === "google" ? "Google" : "App"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-white/60">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatEventTime(item)}
                      </span>
                      {item.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {item.location}
                        </span>
                      )}
                    </div>
                  </div>
                  {item.htmlLink && (
                    <a
                      href={item.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const events = getEventsForDate(day);
          return (
            <div key={day.toISOString()} className="border border-white/10 rounded-lg p-2 min-h-[200px]">
              <div
                className={cn(
                  "text-sm font-medium mb-2",
                  isToday(day) && "text-primary font-bold",
                  !isSameMonth(day, currentDate) && "text-white/60"
                )}
              >
                {format(day, "EEE d")}
              </div>
              <div className="space-y-1">
                {events.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "text-xs p-1 rounded truncate",
                      item.source === "google" ? "bg-blue-500/20 text-blue-700" : "bg-primary/20 text-primary"
                    )}
                    title={item.title}
                  >
                    {formatEventTime(item)} {item.title}
                  </div>
                ))}
                {events.length > 3 && (
                  <div className="text-xs text-white/60">+{events.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="grid grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-white/60 p-2">
            {day}
          </div>
        ))}
        {days.map((day) => {
          const events = getEventsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "border border-white/10 rounded p-1 min-h-[100px]",
                !isCurrentMonth && "opacity-50"
              )}
            >
              <div
                className={cn(
                  "text-sm mb-1",
                  isToday(day) && "font-bold text-primary",
                  !isCurrentMonth && "text-white/60"
                )}
              >
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {events.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "text-[10px] p-0.5 rounded truncate",
                      item.source === "google" ? "bg-blue-500/20" : "bg-primary/20"
                    )}
                    title={item.title}
                  >
                    {item.title}
                  </div>
                ))}
                {events.length > 2 && (
                  <div className="text-[10px] text-white/60">+{events.length - 2}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Calendar"
        description="View and manage your appointments and Google Calendar events"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-[#242424] border-white/10">
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
                        <SelectItem value="valuation">Valuation</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="call">Call</SelectItem>
                        <SelectItem value="inspection">Inspection</SelectItem>
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
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Additional notes..."
                    className="bg-input min-h-[80px]"
                    value={newAppointment.notes}
                    onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                  />
                </div>
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
                    {gcalNeedsAuth && " (Connect Google Calendar first)"}
                  </Label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateAppointment} disabled={createAppointment.isPending}>
                  {createAppointment.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Google Calendar Connection */}
      {user && (
        <Card className="p-4 mb-6 zoho-card border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              <span className="font-medium">Google Calendar</span>
            </div>
            <div className="flex items-center gap-2">
              {gcalNeedsAuth ? (
                <Button variant="outline" size="sm" onClick={handleConnectGcal} disabled={gcalLoading}>
                  {gcalLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CalendarIcon className="w-3 h-3" />}
                  Connect Google
                </Button>
              ) : (
                <>
                  <Badge variant="secondary" className="text-xs font-normal">Connected</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchGcal} title="Refresh" disabled={gcalLoading}>
                    <RefreshCw className={cn("w-3 h-3", gcalLoading && "animate-spin")} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDisconnectGcal} title="Disconnect">
                    <Unlink className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
          {gcalError && (
            <div className="mt-2 text-sm text-destructive">{gcalError}</div>
          )}
        </Card>
      )}

      {/* Calendar Controls */}
      <Card className="p-4 mb-6 zoho-card border-white/10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={navigatePrevious}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={navigateNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={navigateToday} className="ml-2">
              Today
            </Button>
            <div className="ml-4 text-lg font-semibold">
              {viewMode === "day" && format(currentDate, "MMMM d, yyyy")}
              {viewMode === "week" && `${format(startOfWeek(currentDate), "MMM d")} - ${format(endOfWeek(currentDate), "MMM d, yyyy")}`}
              {viewMode === "month" && format(currentDate, "MMMM yyyy")}
            </div>
          </div>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      {/* Calendar View */}
      <Card className="p-4 zoho-card border-white/10">
        {viewMode === "day" && renderDayView()}
        {viewMode === "week" && renderWeekView()}
        {viewMode === "month" && renderMonthView()}
      </Card>

      {/* Upcoming Events */}
      {upcomingItems.length > 0 && (
        <Card className="p-4 mt-6 zoho-card border-white/10">
          <h3 className="font-semibold mb-4">Upcoming Events</h3>
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {upcomingItems.map((item) => (
                <div key={item.id} className="flex items-start justify-between p-2 rounded border border-white/10">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{item.title}</span>
                      <Badge variant={item.source === "google" ? "secondary" : "default"} className="text-xs">
                        {item.source === "google" ? "Google" : "App"}
                      </Badge>
                    </div>
                    <div className="text-sm text-white/60">
                      {format(parseISO(item.date), "MMM d, h:mm a")}
                      {item.location && ` • ${item.location}`}
                    </div>
                  </div>
                  {item.htmlLink && (
                    <a
                      href={item.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline ml-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
