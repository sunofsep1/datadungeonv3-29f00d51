import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, ListTodo } from "lucide-react";
import { useAppointments } from "@/hooks/useAppointments";
import { useContacts } from "@/hooks/useContacts";
import { useOpenContactTasksForUser, useUpdateContactTask } from "@/hooks/useContactTasks";
import { usePendingStepRunsByTaskIds, useCompleteNurtureStepAndAdvance } from "@/hooks/useNurtureSequences";
import { format, isPast, isToday } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function Tasks() {
  const navigate = useNavigate();
  const { data: appointments = [], isLoading } = useAppointments();
  const { data: contacts = [] } = useContacts();
  const { data: contactTasks = [], isLoading: ctLoading } = useOpenContactTasksForUser();
  const updateContactTask = useUpdateContactTask();
  const completeStep = useCompleteNurtureStepAndAdvance();
  const [filter, setFilter] = useState<"all" | "today" | "upcoming">("all");
  const sequenceTaskIds = useMemo(
    () => contactTasks.filter((t) => t.sequence_enrollment_id).map((t) => t.id),
    [contactTasks]
  );
  const { data: pendingRuns = [] } = usePendingStepRunsByTaskIds(sequenceTaskIds);
  const pendingRunByTaskId = useMemo(() => {
    const map = new Map<string, (typeof pendingRuns)[number]>();
    pendingRuns.forEach((r) => {
      if (r.task_id) map.set(r.task_id, r);
    });
    return map;
  }, [pendingRuns]);

  const contactNameById = useMemo(() => new Map(contacts.map((c) => [c.id, c.name ?? "Contact"])), [contacts]);

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
        <PageHeader title="Tasks" description="Appointments and contact to-dos" />
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
        description="Appointments and CRM contact tasks"
      />
      <Tabs defaultValue="appointments" className="mt-4">
        <TabsList className="mb-4">
          <TabsTrigger value="appointments" className="gap-1.5">
            <Calendar className="w-4 h-4" /> Appointments
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1.5">
            <ListTodo className="w-4 h-4" /> Contact tasks
            {contactTasks.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/20 px-1.5 text-xs">{contactTasks.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4">
          <div className="flex flex-wrap gap-2">
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
        </TabsContent>

        <TabsContent value="contacts">
          {ctLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : contactTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No open contact tasks. Add tasks from a contact&apos;s Nurture &amp; tasks section.
            </p>
          ) : (
            <div className="space-y-2">
              {contactTasks.map((t) => {
                const due = t.due_at ? new Date(t.due_at) : null;
                const overdue = due ? isPast(due) && !isToday(due) : false;
                return (
                  <Card
                    key={t.id}
                    className={`p-3 border border-border zoho-card ${overdue ? "border-amber-500/30" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={false}
                        onCheckedChange={(v) => {
                          if (v === true) {
                            const run = pendingRunByTaskId.get(t.id);
                            if (t.sequence_enrollment_id && run) {
                              completeStep.mutate(
                                {
                                  enrollment_id: t.sequence_enrollment_id,
                                  step_run_id: run.id,
                                  contact_id: t.contact_id,
                                  outcome: "completed",
                                },
                                {
                                  onSuccess: () => toast.success("Step completed. Next step scheduled."),
                                  onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
                                }
                              );
                              return;
                            }
                            updateContactTask.mutate(
                              {
                                id: t.id,
                                contact_id: t.contact_id,
                                completed_at: new Date().toISOString(),
                              },
                              {
                                onSuccess: () => toast.success("Done"),
                                onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
                              }
                            );
                          }
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <button
                          type="button"
                          className="text-left w-full"
                          onClick={() => navigate(`/contacts/${t.contact_id}`)}
                        >
                          <p className="font-medium text-foreground">{t.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {contactNameById.get(t.contact_id) ?? "Contact"}
                            {due && ` · ${format(due, "d MMM yyyy")}`}
                          </p>
                        </button>
                      </div>
                      {t.sequence_enrollment_id && pendingRunByTaskId.get(t.id) ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const run = pendingRunByTaskId.get(t.id);
                            if (!run || !t.sequence_enrollment_id) return;
                            completeStep.mutate(
                              {
                                enrollment_id: t.sequence_enrollment_id,
                                step_run_id: run.id,
                                contact_id: t.contact_id,
                                outcome: "completed",
                              },
                              {
                                onSuccess: () => toast.success("Step completed. Next step scheduled."),
                                onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
                              }
                            );
                          }}
                        >
                          Complete & next
                        </Button>
                      ) : null}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
