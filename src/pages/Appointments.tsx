import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, Clock, MapPin, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppointments, useCreateAppointment, useUpdateAppointment, useDeleteAppointment, Appointment } from "@/hooks/useAppointments";
import { useContacts } from "@/hooks/useContacts";
import { useProperties } from "@/hooks/useProperties";
import { useListings } from "@/hooks/useListings";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, addHours } from "date-fns";

type AppointmentType = "valuation" | "meeting" | "call" | "inspection";

const GCAL_URL = "https://agflprqqvsndkwlpscvt.supabase.co/functions/v1/google-calendar";

const createEmptyAppointment = () => ({
  title: "",
  date: "",
  startTime: "",
  endTime: "",
  location: "",
  type: "meeting" as AppointmentType,
  notes: "",
  status: "scheduled",
  description: "",
  contact_id: "",
  property_id: "",
  listing_id: "",
  agenda: "",
  follow_up_tasks: "",
  reminders: "",
  meeting_outcome: "",
  next_steps: "",
  action_items: "",
  syncToGoogle: true,
});

export default function Appointments() {
  const { user } = useAuth();
  const { data: appointments, isLoading } = useAppointments();
  const { data: contacts = [] } = useContacts();
  const { data: properties = [] } = useProperties();
  const { data: listings = [] } = useListings();
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const deleteAppointment = useDeleteAppointment();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [formData, setFormData] = useState(createEmptyAppointment());
  const [gcalNeedsAuth, setGcalNeedsAuth] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const { toast } = useToast();

  // Check Google Calendar connection status
  const checkGcalConnection = useCallback(async () => {
    if (!user) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${GCAL_URL}?action=events`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (data?.needsAuth || data?.error === "Not connected") {
        setGcalNeedsAuth(true);
      } else {
        setGcalNeedsAuth(false);
      }
    } catch (e) {
      setGcalNeedsAuth(true);
    }
  }, [user]);

  useEffect(() => {
    checkGcalConnection();
  }, [checkGcalConnection]);

  const handleOpenDialog = (appointment?: Appointment) => {
    if (appointment) {
      const date = appointment.date ? new Date(appointment.date) : new Date();
      setEditingAppointment(appointment);
      setFormData({
        title: appointment.title,
        date: format(date, "yyyy-MM-dd"),
        startTime: format(date, "HH:mm"),
        endTime: "",
        location: appointment.location || "",
        type: (appointment.type as AppointmentType) || "meeting",
        notes: appointment.notes || "",
        status: appointment.status || "scheduled",
        description: "",
        contact_id: "",
        property_id: "",
        listing_id: "",
        agenda: "",
        follow_up_tasks: "",
        reminders: "",
        meeting_outcome: "",
        next_steps: "",
        action_items: "",
        syncToGoogle: false, // Don't sync when editing
      });
    } else {
      setEditingAppointment(null);
      setFormData(createEmptyAppointment());
      checkGcalConnection(); // Check connection when opening new appointment
    }
    setIsDialogOpen(true);
  };

  const handleSaveAppointment = async () => {
    if (!formData.title.trim()) {
      toast({ title: "Error", description: "Please enter a title", variant: "destructive" });
      return;
    }
    if (!formData.date) {
      toast({ title: "Error", description: "Please select a date", variant: "destructive" });
      return;
    }
    if (!formData.startTime) {
      toast({ title: "Error", description: "Please enter a start time", variant: "destructive" });
      return;
    }

    try {
      const dateTime = `${formData.date}T${formData.startTime}:00`;
      const endDateTime = formData.endTime ? `${formData.date}T${formData.endTime}:00` : null;
      
      // Combine all rich data into notes
      const combinedNotes = [
        formData.description && `Description: ${formData.description}`,
        formData.agenda && `Agenda: ${formData.agenda}`,
        formData.notes && `Notes: ${formData.notes}`,
        formData.follow_up_tasks && `Follow-up: ${formData.follow_up_tasks}`,
        formData.reminders && `Reminders: ${formData.reminders}`,
        formData.meeting_outcome && `Outcome: ${formData.meeting_outcome}`,
        formData.next_steps && `Next Steps: ${formData.next_steps}`,
        formData.action_items && `Action Items: ${formData.action_items}`,
      ]
        .filter(Boolean)
        .join("\n\n");

      const appointmentData = {
        title: formData.title,
        date: dateTime,
        location: formData.location || null,
        type: formData.type,
        notes: combinedNotes || null,
        status: formData.status,
        contact_id: formData.contact_id || null,
      };

      let appointment: Appointment;
      if (editingAppointment) {
        appointment = await updateAppointment.mutateAsync({ id: editingAppointment.id, ...appointmentData });
        toast({ title: "Success", description: "Appointment updated!" });
      } else {
        appointment = await createAppointment.mutateAsync(appointmentData);
        toast({ title: "Success", description: "Appointment scheduled!" });

        // Sync to Google Calendar if enabled and connected
        if (formData.syncToGoogle && !gcalNeedsAuth && user) {
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
                  summary: formData.title,
                  description: combinedNotes || formData.description || "",
                  start: dateTime,
                  end: endDateTime || addHours(new Date(dateTime), 1).toISOString(),
                  location: formData.location || "",
                }),
              });
              toast({ title: "Synced", description: "Appointment added to Google Calendar" });
            }
          } catch (e) {
            console.error("Google Calendar sync failed:", e);
            toast({
              title: "Warning",
              description: "Appointment created but Google Calendar sync failed",
              variant: "default",
            });
          }
        }
      }
      setIsDialogOpen(false);
      setFormData(createEmptyAppointment());
      setEditingAppointment(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save appointment", variant: "destructive" });
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    try {
      await deleteAppointment.mutateAsync(id);
      toast({ title: "Deleted", description: "Appointment removed" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete appointment", variant: "destructive" });
    }
  };

  const getTypeColor = (type: string | null) => {
    switch (type) {
      case "valuation": return "bg-primary/20 text-primary";
      case "meeting": return "bg-info/20 text-info";
      case "call": return "bg-success/20 text-success";
      case "inspection": return "bg-warning/20 text-warning";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  // Pagination
  const paginatedAppointments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return (appointments ?? []).slice(startIndex, startIndex + itemsPerPage);
  }, [appointments, currentPage, itemsPerPage]);

  const totalPages = Math.ceil((appointments?.length ?? 0) / itemsPerPage);

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Appointments" description="Manage your schedule and meetings" />
        <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Appointments"
        description="Manage your schedule and meetings"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setFormData(createEmptyAppointment()); setEditingAppointment(null); } }}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => handleOpenDialog()}><Plus className="w-4 h-4" />New Appointment</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-popover border-border max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>{editingAppointment ? "Edit Appointment" : "New Appointment"}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="flex-1 pr-4">
                <Tabs defaultValue="basic" className="mt-4">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="basic">Basic</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="followup">Follow-up</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>
                  <TabsContent value="basic" className="space-y-4 mt-4">
                    <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      placeholder="Appointment title"
                      className="bg-input"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date *</Label>
                      <Input
                        type="date"
                        className="bg-input"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: AppointmentType) =>
                          setFormData({ ...formData, type: value })
                        }
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
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        className="bg-input"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      placeholder="Meeting location"
                      className="bg-input"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>

                  {/* Related Entities */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Related Contact</Label>
                      <Select
                        value={formData.contact_id}
                        onValueChange={(value) => setFormData({ ...formData, contact_id: value })}
                      >
                        <SelectTrigger className="bg-input">
                          <SelectValue placeholder="Select contact" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {contacts.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Related Property</Label>
                      <Select
                        value={formData.property_id}
                        onValueChange={(value) => setFormData({ ...formData, property_id: value })}
                      >
                        <SelectTrigger className="bg-input">
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {properties.slice(0, 50).map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.address_line1 || "Property"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Related Listing</Label>
                      <Select
                        value={formData.listing_id}
                        onValueChange={(value) => setFormData({ ...formData, listing_id: value })}
                      >
                        <SelectTrigger className="bg-input">
                          <SelectValue placeholder="Select listing" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {listings.slice(0, 50).map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.address}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  </TabsContent>
                  <TabsContent value="details" className="space-y-4 mt-4">
                    <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Appointment description..."
                      className="bg-input min-h-[80px]"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Agenda</Label>
                    <Textarea
                      placeholder="Meeting agenda, topics to discuss..."
                      className="bg-input min-h-[80px]"
                      value={formData.agenda}
                      onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      placeholder="Additional notes..."
                      className="bg-input min-h-[80px]"
                      value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                  </div>
                  </TabsContent>
                  <TabsContent value="followup" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Follow-up Tasks</Label>
                    <Textarea
                      placeholder="Tasks to follow up on..."
                      className="bg-input min-h-[60px]"
                      value={formData.follow_up_tasks}
                      onChange={(e) => setFormData({ ...formData, follow_up_tasks: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reminders</Label>
                    <Textarea
                      placeholder="Reminder notes..."
                      className="bg-input min-h-[60px]"
                      value={formData.reminders}
                      onChange={(e) => setFormData({ ...formData, reminders: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Meeting Outcome</Label>
                    <Textarea
                      placeholder="What was discussed/decided..."
                      className="bg-input min-h-[80px]"
                      value={formData.meeting_outcome}
                      onChange={(e) => setFormData({ ...formData, meeting_outcome: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Next Steps</Label>
                    <Textarea
                      placeholder="What happens next..."
                      className="bg-input min-h-[80px]"
                      value={formData.next_steps}
                      onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Action Items</Label>
                    <Textarea
                      placeholder="Action items, who does what..."
                      className="bg-input min-h-[80px]"
                      value={formData.action_items}
                        onChange={(e) => setFormData({ ...formData, action_items: e.target.value })}
                      />
                  </div>
                  </TabsContent>
                  <TabsContent value="settings" className="space-y-4 mt-4">
                    {!editingAppointment ? (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="sync-google"
                          checked={formData.syncToGoogle && !gcalNeedsAuth}
                          disabled={gcalNeedsAuth}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, syncToGoogle: checked as boolean })
                          }
                        />
                        <Label
                          htmlFor="sync-google"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Sync to Google Calendar
                          {gcalNeedsAuth && " (Connect Google Calendar first)"}
                        </Label>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Settings cannot be changed when editing an appointment.</p>
                    )}
                  </TabsContent>
                </Tabs>
              </ScrollArea>
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveAppointment}
                  disabled={createAppointment.isPending || updateAppointment.isPending}
                >
                  {(createAppointment.isPending || updateAppointment.isPending)
                    ? "Saving..."
                    : editingAppointment
                      ? "Update"
                      : "Schedule"}{" "}
                  Appointment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {appointments && appointments.length > 0 ? (
        <>
          <div className="space-y-4">
            {paginatedAppointments.map((appointment) => (
            <Card key={appointment.id} className="p-4 bg-card border-border">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-foreground">{appointment.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(appointment.type)}`}>{appointment.type || "meeting"}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{format(new Date(appointment.date), "MMM d, yyyy")}</span>
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{format(new Date(appointment.date), "h:mm a")}</span>
                    {appointment.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{appointment.location}</span>}
                  </div>
                  {appointment.notes && <p className="mt-2 text-sm text-muted-foreground">{appointment.notes}</p>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(appointment)}><Pencil className="w-4 h-4" /></Button>
                  <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Appointment</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete this appointment?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteAppointment(appointment.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                </div>
              </div>
            </Card>
            ))}
          </div>
          {totalPages > 1 && (
            <Pagination className="mt-6">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  return null;
                })}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground"><Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>No appointments scheduled. Create your first appointment!</p></div>
      )}
    </div>
  );
}
