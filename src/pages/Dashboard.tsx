import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { DashboardWelcomeHeader } from "@/components/dashboard/DashboardWelcomeHeader";
import { SortableWidget } from "@/components/dashboard/SortableWidget";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users,
  TrendingUp,
  Megaphone,
  Calendar,
  Home,
  ChevronRight,
  CheckSquare,
  Clock,
  MapPin,
  ListTodo,
  Sparkles,
  GripVertical,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useContacts, useCreateContact } from "@/hooks/useContacts";
import { useAppointments } from "@/hooks/useAppointments";
import { useOpenContactTasksForUser } from "@/hooks/useContactTasks";
import { useActiveNurtureEnrollments } from "@/hooks/useActiveNurtureEnrollments";
import { useCreateAppointmentWithGcal } from "@/hooks/useCreateAppointmentWithGcal";
import { useCreateLead } from "@/hooks/useLeads";
import { usePosts, useCreatePost } from "@/hooks/usePosts";
import { useAuth } from "@/contexts/AuthContext";
import { format, isPast, isToday } from "date-fns";
import { VisionBoard } from "@/components/dashboard/VisionBoard";
import { AffirmationsWidget } from "@/components/dashboard/AffirmationsWidget";
import { KPISnapshot } from "@/components/dashboard/KPISnapshot";
import { DashboardCalendarWidget } from "@/components/dashboard/DashboardCalendarWidget";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { TopStoriesWidget } from "@/components/dashboard/TopStoriesWidget";
import { NewsWidget } from "@/components/dashboard/NewsWidget";
import { PipelineSummary } from "@/components/dashboard/PipelineSummary";
import { Skeleton } from "@/components/ui/skeleton";
import { NurtureLiveEnrollments } from "@/components/nurture/NurtureLiveEnrollments";
import {
  loadDashboardWidgetOrder,
  saveDashboardWidgetOrder,
  resetDashboardWidgetsToDefault,
  DASHBOARD_WIDGET_LABELS,
} from "@/lib/dashboardWidgetOrder";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (searchParams.get("calendar_connected") === "true") {
      toast({
        title: "Google Calendar connected",
        description: "Your calendar events will appear in the widget.",
      });
      // Remove the param
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete("calendar_connected");
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams, toast]);

  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => loadDashboardWidgetOrder(undefined));
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (user?.id) {
      setWidgetOrder(loadDashboardWidgetOrder(user.id));
    }
  }, [user?.id]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null);
      const { active, over } = event;
      if (over && active.id !== over.id) {
        setWidgetOrder((prev) => {
          const oldIndex = prev.indexOf(String(active.id));
          const newIndex = prev.indexOf(String(over.id));
          if (oldIndex === -1 || newIndex === -1) return prev;
          const next = arrayMove(prev, oldIndex, newIndex);
          saveDashboardWidgetOrder(user?.id, next);
          return next;
        });
      }
    },
    [user?.id]
  );

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
  }, []);

  const handleRemoveWidget = useCallback(
    (id: string) => {
      setWidgetOrder((prev) => {
        const next = prev.filter((w) => w !== id);
        saveDashboardWidgetOrder(user?.id, next);
        return next;
      });
      toast({ title: "Widget removed", description: "Your layout has been saved." });
    },
    [user?.id, toast]
  );

  const handleRestoreDefaultWidgets = useCallback(() => {
    setWidgetOrder(resetDashboardWidgetsToDefault(user?.id));
    toast({ title: "Dashboard restored", description: "All default widgets are back." });
  }, [user?.id, toast]);

  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [postDialogOpen, setPostDialogOpen] = useState(false);

  const [newContact, setNewContact] = useState({ name: "", email: "", phone: "" });
  const [newAppointment, setNewAppointment] = useState({ title: "", date: "", time: "", location: "" });
  const [newLead, setNewLead] = useState({ name: "", email: "", phone: "", source: "", propertyInterest: "" });
  const [newPost, setNewPost] = useState({ title: "", content: "", platform: "facebook", scheduledDate: "" });

  const { data: contacts = [], isLoading: contactsLoading } = useContacts();
  const { data: appointments = [], isLoading: appointmentsLoading } = useAppointments();
  const { data: openContactTasks = [] } = useOpenContactTasksForUser();
  const { data: nurtureDash } = useActiveNurtureEnrollments();
  const sequenceSummary = nurtureDash?.summary ?? {
    activeTotal: 0,
    dueNow: 0,
    dueToday: 0,
    dueSoon24h: 0,
  };
  const { data: posts = [] } = usePosts();

  const createContact = useCreateContact();
  const createAppointmentWithGcal = useCreateAppointmentWithGcal();
  const createLead = useCreateLead();
  const createPost = useCreatePost();

  const stats = [
    { label: "Contacts", value: contacts.length, icon: Users, path: "/contacts" },
    { label: "Nurture", value: sequenceSummary.activeTotal, icon: Sparkles, path: "/nurture" },
    { label: "Appointments", value: appointments.length, icon: Calendar, path: "/appointments" },
    { label: "Posts", value: posts.length, icon: TrendingUp, path: "/marketing" },
  ];

  const recentContacts = useMemo(
    () => [...contacts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
    [contacts]
  );

  const upcomingAppointments = useMemo(
    () =>
      [...appointments]
        .filter((a) => !isPast(new Date(a.date)) || isToday(new Date(a.date)))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5),
    [appointments]
  );

  const overdueCount = useMemo(
    () =>
      appointments.filter((a) => {
        const d = new Date(a.date);
        return isPast(d) && !isToday(d);
      }).length,
    [appointments]
  );

  const handleAddContact = async () => {
    if (!newContact.name.trim()) {
      toast({ title: "Error", description: "Please enter a contact name", variant: "destructive" });
      return;
    }
    try {
      await createContact.mutateAsync({
        name: newContact.name,
        email: newContact.email || null,
        phone: newContact.phone || null,
      });
      toast({ title: "Success", description: "Contact added!" });
      setNewContact({ name: "", email: "", phone: "" });
      setContactDialogOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to add contact", variant: "destructive" });
    }
  };

  const handleAddLead = async () => {
    if (!newLead.name.trim()) {
      toast({ title: "Error", description: "Please enter a name", variant: "destructive" });
      return;
    }
    try {
      await createLead.mutateAsync({
        name: newLead.name,
        email: newLead.email || null,
        phone: newLead.phone || null,
        source: newLead.source || null,
        property_interest: newLead.propertyInterest || null,
      });
      toast({ title: "Success", description: "Lead added!" });
      setNewLead({ name: "", email: "", phone: "", source: "", propertyInterest: "" });
      setLeadDialogOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to add lead", variant: "destructive" });
    }
  };

  const handleAddPost = async () => {
    if (!newPost.title.trim()) {
      toast({ title: "Error", description: "Please enter a title", variant: "destructive" });
      return;
    }
    try {
      await createPost.mutateAsync({
        title: newPost.title,
        content: newPost.content || null,
        platform: newPost.platform,
        scheduled_date: newPost.scheduledDate || null,
        status: newPost.scheduledDate ? "scheduled" : "draft",
      });
      toast({ title: "Success", description: "Post created!" });
      setNewPost({ title: "", content: "", platform: "facebook", scheduledDate: "" });
      setPostDialogOpen(false);
      navigate("/marketing");
    } catch (error) {
      toast({ title: "Error", description: "Failed to create post", variant: "destructive" });
    }
  };

  const handleScheduleAppointment = async () => {
    if (!newAppointment.title.trim()) {
      toast({ title: "Error", description: "Please enter appointment title", variant: "destructive" });
      return;
    }
    if (!newAppointment.date) {
      toast({ title: "Error", description: "Please select a date", variant: "destructive" });
      return;
    }
    try {
      const dateTime = newAppointment.time 
        ? `${newAppointment.date}T${newAppointment.time}:00`
        : `${newAppointment.date}T09:00:00`;
      
      await createAppointmentWithGcal.mutateAsync({
        title: newAppointment.title,
        date: dateTime,
        location: newAppointment.location || null,
        syncToGoogle: true,
      });
      toast({ title: "Success", description: "Appointment scheduled!" });
      setNewAppointment({ title: "", date: "", time: "", location: "" });
      setAppointmentDialogOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to schedule appointment", variant: "destructive" });
    }
  };

  const renderWidget = (id: string) => {
    switch (id) {
      case "visionBoard":
        return <VisionBoard />;
      case "affirmations":
        return <AffirmationsWidget />;
      case "stats":
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5">
            {contactsLoading ? (
              [...Array(4)].map((_, i) => (
                <Card key={i} className="zoho-card p-2.5 sm:p-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Skeleton className="h-2.5 w-12 mb-1.5" />
                      <Skeleton className="h-7 w-10" />
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              stats.map((stat, index) => (
                <Card
                  key={index}
                  className="zoho-card p-2.5 sm:p-3 cursor-pointer hover:bg-white/10 transition-colors duration-200 focus-within:ring-2 focus-within:ring-[#00BCD4] focus-within:ring-inset"
                  onClick={() => navigate(stat.path)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && navigate(stat.path)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded-md zoho-accent-bg shrink-0">
                        <stat.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 zoho-accent" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{stat.label}</p>
                        <p className="text-lg sm:text-xl font-bold text-foreground tabular-nums leading-tight">{stat.value}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 opacity-70" />
                  </div>
                </Card>
              ))
            )}
          </div>
        );
      case "topStories":
        return <TopStoriesWidget />;
      case "news":
        return <NewsWidget />;
      case "calendar":
        return (
          <DashboardCalendarWidget
            onAddAppointmentRequest={(date) => {
              setNewAppointment((prev) => ({
                ...prev,
                date: format(date, "yyyy-MM-dd"),
                time: format(date, "HH:mm"),
              }));
              setAppointmentDialogOpen(true);
            }}
          />
        );
      case "kpi":
        return <KPISnapshot />;
      case "pipeline":
        return <PipelineSummary />;
      case "activityFeed":
        return <RecentActivityFeed />;
      case "todo":
        return (
          <Card className="zoho-card p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 zoho-accent shrink-0" />
                To-Do
              </h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground -mr-1" onClick={() => navigate("/tasks")}>
                View all <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </div>
            {overdueCount > 0 ? (
              <div className="rounded-md bg-amber-500/15 border border-amber-500/30 p-2.5">
                <p className="text-sm font-medium text-amber-200">
                  {overdueCount} overdue task{overdueCount !== 1 ? "s" : ""}
                </p>
                <Button variant="outline" size="sm" className="mt-2 h-8 border-amber-500/50 text-amber-200 hover:bg-amber-500/20" onClick={() => navigate("/tasks")}>
                  Go to Tasks
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                <span>No overdue tasks</span>
              </div>
            )}
          </Card>
        );
      case "recentContacts":
        return (
          <Card className="zoho-card p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-foreground">Recent Contacts</h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground -mr-1" onClick={() => navigate("/contacts")}>
                View all <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </div>
            {contactsLoading ? (
              <div className="space-y-1.5">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full rounded-md" />
                ))}
              </div>
            ) : recentContacts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 px-3 rounded-lg border border-dashed border-border">
                <Users className="w-8 h-8 shrink-0 text-muted-foreground opacity-80" />
                <p className="text-xs text-muted-foreground text-center leading-snug">No contacts yet. Add your first contact.</p>
                <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setContactDialogOpen(true)}>
                  <Users className="w-3.5 h-3.5" /> Add Contact
                </Button>
              </div>
            ) : (
              <ul className="space-y-1">
                {recentContacts.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="w-full text-left flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover:bg-white/10 active:scale-[0.99] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
                      onClick={() => navigate(`/contacts/${c.id}`)}
                    >
                      <span className="text-sm text-foreground truncate">{c.name}</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      case "upcomingAppointments": {
        return (
          <Card className="zoho-card p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="w-4 h-4 zoho-accent shrink-0" />
                Upcoming appointments
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground -mr-1"
                onClick={() => navigate("/appointments")}
              >
                View all <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </div>
            {appointmentsLoading ? (
              <div className="space-y-1.5">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 px-3 rounded-lg border border-dashed border-border">
                <Calendar className="w-8 h-8 shrink-0 text-muted-foreground opacity-80" />
                <p className="text-xs text-muted-foreground text-center leading-snug">No upcoming appointments. Use the calendar or quick actions.</p>
                <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs border-border" onClick={() => navigate("/appointments")}>
                  <Calendar className="w-3.5 h-3.5" /> Appointments
                </Button>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {upcomingAppointments.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      className="w-full text-left flex items-start justify-between gap-2 p-2 rounded-md border border-border hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
                      onClick={() => navigate("/appointments")}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground text-sm truncate">{a.title ?? "Appointment"}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          {format(new Date(a.date), "EEE d MMM · h:mm a")}
                        </p>
                        {a.location?.trim() && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-start gap-1">
                            <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{a.location}</span>
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground mt-0.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      }
      case "contactTasks": {
        const contactName = (id: string) => contacts.find((c) => c.id === id)?.name ?? "Contact";
        const top = [...openContactTasks]
          .sort((a, b) => {
            const na = contactName(a.contact_id);
            const nb = contactName(b.contact_id);
            const byName = na.localeCompare(nb, undefined, { sensitivity: "base" });
            if (byName !== 0) return byName;
            const da = a.due_at ? new Date(a.due_at).getTime() : Infinity;
            const db = b.due_at ? new Date(b.due_at).getTime() : Infinity;
            return da - db;
          })
          .slice(0, 6);
        return (
          <Card className="zoho-card p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-1.5">
                <ListTodo className="w-4 h-4 zoho-accent shrink-0" />
                Contact tasks
              </h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground -mr-1" onClick={() => navigate("/tasks")}>
                Open <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </div>
            {top.length === 0 ? (
              <p className="text-xs text-muted-foreground leading-relaxed">No open contact tasks. Add them from a contact&apos;s Nurture section.</p>
            ) : (
              <ul className="space-y-1">
                {top.map((t) => {
                  const due = t.due_at ? new Date(t.due_at) : null;
                  const overdue = due ? isPast(due) && !isToday(due) : false;
                  const name = contactName(t.contact_id);
                  const fromSequence = Boolean(t.sequence_enrollment_id);
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        className={`w-full text-left flex items-start justify-between gap-2 py-2 px-2 rounded-md border hover:bg-muted/50 transition-colors ${
                          overdue ? "border-amber-500/35 bg-amber-500/[0.06]" : "border-border"
                        }`}
                        onClick={() =>
                          navigate(
                            fromSequence
                              ? `/contacts/${t.contact_id}?nurtureFocus=1`
                              : `/contacts/${t.contact_id}`
                          )
                        }
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                            {fromSequence ? (
                              <span className="font-medium text-primary/90">Sequence · </span>
                            ) : null}
                            <span>{t.title}</span>
                            {due ? (
                              <span className={overdue ? " text-amber-700 dark:text-amber-300" : ""}>
                                {" "}
                                · {format(due, "d MMM")}
                                {overdue ? " · overdue" : ""}
                              </span>
                            ) : null}
                          </p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground mt-0.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        );
      }
      case "activeSequences":
        return <NurtureLiveEnrollments variant="dashboard" />;
      case "quickActions":
        return (
          <Card className="zoho-card p-3">
            <h3 className="text-base font-semibold text-foreground mb-2">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2 justify-items-stretch">
              <button onClick={() => setContactDialogOpen(true)} className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-muted hover:bg-muted/80 border border-border text-foreground transition-colors min-h-[40px] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background text-left">
                <Users className="w-3.5 h-3.5 zoho-accent shrink-0" />
                <span className="text-xs font-medium leading-tight">Add Contact</span>
              </button>
              <button onClick={() => setLeadDialogOpen(true)} className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-muted hover:bg-muted/80 border border-border text-foreground transition-colors min-h-[40px] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background text-left">
                <Megaphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-xs font-medium leading-tight">Add Lead</span>
              </button>
              <button onClick={() => setAppointmentDialogOpen(true)} className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-muted hover:bg-muted/80 border border-border text-foreground transition-colors min-h-[40px] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background text-left">
                <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-xs font-medium leading-tight">Schedule</span>
              </button>
              <button onClick={() => setPostDialogOpen(true)} className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-muted hover:bg-muted/80 border border-border text-foreground transition-colors min-h-[40px] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background text-left">
                <Home className="w-3.5 h-3.5 zoho-accent shrink-0" />
                <span className="text-xs font-medium leading-tight">Create Post</span>
              </button>
            </div>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="animate-fade-in flex min-h-0 flex-1 flex-col gap-4 pb-6">
      <DashboardWelcomeHeader />

      <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 -mt-1 mb-1">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-muted/40 px-2 py-0.5 text-[11px] text-foreground/85">
          Drag to reorder, or ✕ to remove. Layout is saved in this browser for your account.
        </span>
      </p>

      {widgetOrder.length === 0 ? (
        <Card className="zoho-card p-8 md:p-10 border-dashed border-border max-w-lg">
          <p className="text-foreground font-medium mb-1">No widgets on your dashboard</p>
          <p className="text-sm text-muted-foreground mb-6">
            You removed every section. Restore the default set to bring back all widgets, or refresh after signing in if
            something looks wrong.
          </p>
          <Button type="button" onClick={handleRestoreDefaultWidgets}>
            Restore default widgets
          </Button>
        </Card>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <SortableContext items={widgetOrder} strategy={rectSortingStrategy}>
                <div
                  className={cn(
                    /* Balanced multi-column: short tiles stack under tall ones instead of leaving row gaps */
                    "columns-1 lg:columns-2 [column-fill:balance] gap-x-3 lg:gap-x-4",
                    /* Stretch the column set so both columns share one bottom edge with the viewport */
                    "min-h-[calc(100dvh-14rem)] sm:min-h-[calc(100dvh-15rem)] lg:min-h-[calc(100dvh-16rem)]"
                  )}
                >
                  {widgetOrder.map((id) => (
                    <SortableWidget key={id} id={id} onRemove={handleRemoveWidget}>
                      {renderWidget(id)}
                    </SortableWidget>
                  ))}
                </div>
              </SortableContext>
              <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.25, 1, 0.5, 1)" }}>
                {activeDragId ? (
                  <div className="flex items-center gap-3 rounded-xl border-2 border-primary bg-card px-4 py-3 shadow-lg max-w-[min(100vw-2rem,400px)]">
                    <GripVertical className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-semibold text-foreground">
                      {DASHBOARD_WIDGET_LABELS[activeDragId] ?? activeDragId}
                    </span>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
          <div className="mt-auto flex shrink-0 justify-end border-t border-border/50 pt-4">
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={handleRestoreDefaultWidgets}>
              Restore default layout
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-popover border-border" aria-describedby="add-contact-desc">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription id="add-contact-desc">Add a new contact to your CRM.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2"><Label>Name *</Label><Input placeholder="Contact name" className="bg-input" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input placeholder="email@example.com" className="bg-input" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input placeholder="0400 000 000" className="bg-input" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setContactDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddContact} disabled={createContact.isPending}>{createContact.isPending ? "Adding..." : "Add Contact"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-popover border-border" aria-describedby="add-lead-desc">
          <DialogHeader>
            <DialogTitle>Add Lead</DialogTitle>
            <DialogDescription id="add-lead-desc">Add a new lead with source and property interest.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2"><Label>Name *</Label><Input placeholder="Lead name" className="bg-input" value={newLead.name} onChange={(e) => setNewLead({ ...newLead, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Email</Label><Input placeholder="email@example.com" className="bg-input" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input placeholder="0400 000 000" className="bg-input" value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={newLead.source} onValueChange={(value) => setNewLead({ ...newLead, source: value })}>
                <SelectTrigger className="bg-input"><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="social">Social Media</SelectItem>
                  <SelectItem value="open-home">Open Home</SelectItem>
                  <SelectItem value="cold-call">Cold Call</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Property Interest</Label><Input placeholder="e.g. 3BR house in Sydney" className="bg-input" value={newLead.propertyInterest} onChange={(e) => setNewLead({ ...newLead, propertyInterest: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setLeadDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLead} disabled={createLead.isPending}>{createLead.isPending ? "Adding..." : "Add Lead"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={appointmentDialogOpen} onOpenChange={setAppointmentDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-popover border-border" aria-describedby="schedule-appt-desc">
          <DialogHeader>
            <DialogTitle>Schedule Appointment</DialogTitle>
            <DialogDescription id="schedule-appt-desc">Create an appointment. Optionally sync to Google Calendar from the calendar widget.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2"><Label>Title *</Label><Input placeholder="Meeting with client" className="bg-input" value={newAppointment.title} onChange={(e) => setNewAppointment({ ...newAppointment, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Date *</Label><Input type="date" className="bg-input" value={newAppointment.date} onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Time</Label><Input type="time" className="bg-input" value={newAppointment.time} onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Location</Label><Input placeholder="Office or address" className="bg-input" value={newAppointment.location} onChange={(e) => setNewAppointment({ ...newAppointment, location: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setAppointmentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleScheduleAppointment} disabled={createAppointmentWithGcal.isPending}>{createAppointmentWithGcal.isPending ? "Scheduling..." : "Schedule"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
        <DialogContent className="sm:max-w-[450px] bg-popover border-border" aria-describedby="create-post-desc">
          <DialogHeader>
            <DialogTitle>Create Post</DialogTitle>
            <DialogDescription id="create-post-desc">Create a new marketing post.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2"><Label>Title *</Label><Input placeholder="Post title" className="bg-input" value={newPost.title} onChange={(e) => setNewPost({ ...newPost, title: e.target.value })} /></div>
            <div className="space-y-2"><Label>Content</Label><Textarea placeholder="Write your post content..." className="bg-input min-h-[100px]" value={newPost.content} onChange={(e) => setNewPost({ ...newPost, content: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={newPost.platform} onValueChange={(value) => setNewPost({ ...newPost, platform: value })}>
                  <SelectTrigger className="bg-input"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="twitter">Twitter/X</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Schedule Date</Label><Input type="date" className="bg-input" value={newPost.scheduledDate} onChange={(e) => setNewPost({ ...newPost, scheduledDate: e.target.value })} /></div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setPostDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddPost} disabled={createPost.isPending}>{createPost.isPending ? "Creating..." : "Create Post"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
