import { useState, useMemo } from "react";
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
  ExternalLink
} from "lucide-react";
import { useAppointments } from "@/hooks/useAppointments";
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

export function DashboardCalendarWidget() {
  const navigate = useNavigate();
  const { data: appointments = [] } = useAppointments();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());

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
    return appointments.filter((apt) => {
      const aptDate = parseISO(apt.date);
      return isSameDay(aptDate, date);
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

  const formatEventTime = (apt: { date: string }) => {
    const date = parseISO(apt.date);
    return format(date, "h:mm a");
  };

  // Upcoming appointments for sidebar
  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    return appointments
      .filter((apt) => parseISO(apt.date) >= now)
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
      .slice(0, 5);
  }, [appointments]);

  return (
    <Card className="p-4 md:p-6 bg-card border-border">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Calendar</h3>
        </div>
        <div className="flex items-center gap-2">
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
                {dayEvents.slice(0, 2).map((apt) => (
                  <div
                    key={apt.id}
                    className="truncate text-[10px] bg-primary/20 text-primary px-1 rounded mb-0.5"
                  >
                    {apt.title}
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
                {dayEvents.map((apt) => (
                  <div
                    key={apt.id}
                    className="text-xs bg-primary/20 text-primary px-1 py-0.5 rounded mb-1 truncate"
                  >
                    <div className="font-medium truncate">{apt.title}</div>
                    <div className="text-[10px] opacity-75">{formatEventTime(apt)}</div>
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
                {getEventsForDate(currentDate).map((apt) => (
                  <div key={apt.id} className="flex items-start gap-3 p-3 bg-secondary rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{apt.title}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        {formatEventTime(apt)}
                      </div>
                      {apt.location && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3" />
                          {apt.location}
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

      {/* Upcoming Appointments */}
      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-medium text-foreground mb-3">Upcoming</h4>
        {upcomingAppointments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming appointments</p>
        ) : (
          <div className="space-y-2">
            {upcomingAppointments.map((apt) => (
              <div key={apt.id} className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <div className="flex-1 truncate">
                  <span className="font-medium">{apt.title}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(parseISO(apt.date), "MMM d, h:mm a")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
