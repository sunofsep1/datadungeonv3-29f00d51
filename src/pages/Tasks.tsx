import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Plus } from "lucide-react";
import { useAppointments } from "@/hooks/useAppointments";
import { format, isPast, isToday } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function Tasks() {
  const navigate = useNavigate();
  const { data: appointments = [], isLoading } = useAppointments();
  const [filter, setFilter] = useState<"all" | "today" | "upcoming">("all");

  const tasks = useMemo(() => {
    const sorted = [...appointments].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    if (filter === "today") {
      return sorted.filter((a) => isToday(new Date(a.date)));
    }
    if (filter === "upcoming") {
      return sorted.filter((a) => !isPast(new Date(a.date)));
    }
    return sorted;
  }, [appointments, filter]);

  const overdueCount = useMemo(
    () =>
      appointments.filter((a) => {
        const d = new Date(a.date);
        return isPast(d) && !isToday(d);
      }).length,
    [appointments]
  );

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Tasks" description="Appointments and to-dos" />
        <div className="space-y-2 mt-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in min-h-[60vh]">
      <PageHeader
        title="Tasks"
        description="Appointments and scheduled items"
      />
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button
          variant={filter === "today" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("today")}
        >
          Today
        </Button>
        <Button
          variant={filter === "upcoming" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("upcoming")}
        >
          Upcoming
        </Button>
        {overdueCount > 0 && (
          <span className="text-sm text-muted-foreground self-center">
            {overdueCount} overdue
          </span>
        )}
      </div>
      {tasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="mb-4">
            {filter !== "all"
              ? `No ${filter} appointments.`
              : "No appointments yet. Schedule from Calendar or Dashboard."}
          </p>
          <Button variant="default" onClick={() => navigate("/calendar")}>
            <Calendar className="w-4 h-4 mr-2" />
            Open Calendar
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((apt) => {
            const date = new Date(apt.date);
            const isOverdue = isPast(date) && !isToday(date);
            return (
              <Card
                key={apt.id}
                className={`p-3 border border-border hover:bg-muted/50 transition-all duration-200 cursor-pointer zoho-card ${isOverdue ? "border-amber-500/30" : ""}`}
                onClick={() => navigate("/appointments")}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isPast(date)}
                    onCheckedChange={() => {}}
                    onClick={(e) => e.stopPropagation()}
                    className="pointer-events-none"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{apt.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(date, "EEE, d MMM · HH:mm")}
                      {apt.location && ` · ${apt.location}`}
                    </p>
                  </div>
                  {isOverdue && (
                    <span className="text-xs text-amber-500">Overdue</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
