import { Card } from "@/components/ui/card";
import { useAppointments } from "@/hooks/useAppointments";
import { Calendar, Clock, MapPin } from "lucide-react";
import { format, isToday, isTomorrow, addDays, isWithinInterval, startOfToday, endOfDay } from "date-fns";
import { Link } from "react-router-dom";

export function MiniCalendar() {
  const { data: appointments = [] } = useAppointments();
  
  const today = startOfToday();
  const endOfWeek = endOfDay(addDays(today, 6));
  
  const upcomingAppointments = appointments
    .filter((apt) => {
      const aptDate = new Date(apt.date);
      return isWithinInterval(aptDate, { start: today, end: endOfWeek });
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEE, MMM d");
  };

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-info" />
          <h3 className="font-semibold text-foreground">This Week</h3>
        </div>
        <Link to="/appointments" className="text-xs text-primary hover:underline">
          Full Calendar →
        </Link>
      </div>

      {upcomingAppointments.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No upcoming appointments</p>
        </div>
      ) : (
        <div className="space-y-3">
          {upcomingAppointments.map((apt) => (
            <div
              key={apt.id}
              className="p-3 rounded-lg bg-secondary/50 border border-border"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm text-foreground">{apt.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(apt.date), "h:mm a")}
                    </span>
                    {apt.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {apt.location}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  isToday(new Date(apt.date)) 
                    ? "bg-primary/20 text-primary" 
                    : "bg-secondary text-muted-foreground"
                }`}>
                  {formatDate(apt.date)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
