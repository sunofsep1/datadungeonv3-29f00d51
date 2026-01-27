import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  MapPin,
  ExternalLink,
  RefreshCw,
  Unlink
} from "lucide-react";
import { useAppointments } from "@/hooks/useAppointments";
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
  subDays
} from "date-fns";
import { cn } from "@/lib/utils";

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

export function DashboardCalendarWidget() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: appointments = [], isError: appointmentsError, refetch: refetchAppointments } = useAppointments();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());

  const [gcalEvents, setGcalEvents] = useState<GCalEvent[]>([]);
  const [gcalLoading, setGcalLoading] = useState(false);
  const [gcalNeedsAuth, setGcalNeedsAuth] = useState(false);
  const [gcalError, setGcalError] = useState<string | null>(null);

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

  return (
    <Card className="p-4 md:p-6 bg-card border-border">
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
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/appointments")}
            className="gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="hidden sm:inline">Full View</span>
          </Button>
        </div>
      </div>

      {appointmentsError && (
        <div className="flex items-center justify-between gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">Couldn&apos;t load appointments.</p>
          <Button variant="outline" size="sm" onClick={() => refetchAppointments()}>Retry</Button>
        </div>
      )}
      {gcalError && !gcalNeedsAuth && (
        <div className="flex items-center justify-between gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive truncate">Google Calendar: {gcalError}</p>
          <Button variant="outline" size="sm" onClick={fetchGcal}>Retry</Button>
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
              <div
                key={idx}
                className={cn(
                  "min-h-[60px] p-1 border border-border rounded text-xs",
                  isToday(day) && "bg-primary/10 border-primary",
                  !isSameMonth(day, currentDate) && "opacity-40"
                )}
              >
                <div className={cn(
                  "font-medium mb-1",
                  isToday(day) && "text-primary"
                )}>
                  {format(day, "d")}
                </div>
                {dayEvents.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "truncate text-[10px] px-1 rounded mb-0.5",
                      item.source === "google" ? "bg-amber-500/20 text-amber-700 dark:text-amber-400" : "bg-primary/20 text-primary"
                    )}
                    title={item.source === "google" ? "Google Calendar" : "App"}
                  >
                    {item.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-[10px] text-muted-foreground">
                    +{dayEvents.length - 2} more
                  </div>
                )}
              </div>
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
                className={cn(
                  "min-h-[100px] p-2 border border-border rounded",
                  isToday(day) && "bg-primary/10 border-primary"
                )}
              >
                <div className={cn(
                  "text-xs font-medium mb-2",
                  isToday(day) && "text-primary"
                )}>
                  <div>{format(day, "EEE")}</div>
                  <div className="text-lg">{format(day, "d")}</div>
                </div>
                {dayEvents.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "text-xs px-1 py-0.5 rounded mb-1 truncate",
                      item.source === "google" ? "bg-amber-500/20 text-amber-700 dark:text-amber-400" : "bg-primary/20 text-primary"
                    )}
                  >
                    <div className="font-medium truncate">{item.title}</div>
                    <div className="text-[10px] opacity-75">{formatEventTime(item)}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "day" && (
        <div className="mb-4">
          <div className={cn(
            "p-4 border border-border rounded",
            isToday(currentDate) && "bg-primary/5 border-primary"
          )}>
            <div className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              {format(currentDate, "EEEE, MMMM d")}
              {isToday(currentDate) && (
                <Badge variant="secondary" className="text-xs">Today</Badge>
              )}
            </div>
            {getEventsForDate(currentDate).length === 0 ? (
              <p className="text-sm text-muted-foreground">No appointments scheduled</p>
            ) : (
              <div className="space-y-3">
                {getEventsForDate(currentDate).map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 bg-secondary rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{item.title}</span>
                        <Badge variant={item.source === "google" ? "secondary" : "default"} className="text-[10px]">
                          {item.source === "google" ? "Google" : "App"}
                        </Badge>
                        {item.htmlLink && (
                          <a
                            href={item.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-0.5"
                          >
                            <ExternalLink className="w-3 h-3" /> Open
                          </a>
                        )}
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
          </div>
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
                dateStr = format(parseISO(item.date), "MMM d, h:mm a");
              } catch {}
              return (
                <div key={item.id} className="flex items-center gap-3 text-sm">
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
                  {item.htmlLink ? (
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
    </Card>
  );
}
