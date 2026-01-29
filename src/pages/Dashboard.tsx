import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, TrendingUp, Megaphone, Calendar, Clock, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useContacts, useCreateContact } from "@/hooks/useContacts";
import { useAppointments, useCreateAppointment } from "@/hooks/useAppointments";
import { useLeads, useCreateLead } from "@/hooks/useLeads";
import { usePosts, useCreatePost } from "@/hooks/usePosts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { addHours } from "date-fns";
import { formatDistanceToNow } from "date-fns";
import { VisionBoard } from "@/components/dashboard/VisionBoard";
import { AffirmationsWidget } from "@/components/dashboard/AffirmationsWidget";
import { KPISnapshot } from "@/components/dashboard/KPISnapshot";
import { DashboardCalendarWidget } from "@/components/dashboard/DashboardCalendarWidget";

const GCAL_URL = "https://agflprqqvsndkwlpscvt.supabase.co/functions/v1/google-calendar";

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [postDialogOpen, setPostDialogOpen] = useState(false);

  const [newContact, setNewContact] = useState({ name: "", email: "", phone: "" });
  const [newAppointment, setNewAppointment] = useState({ title: "", date: "", time: "", location: "" });
  const [newLead, setNewLead] = useState({ name: "", email: "", phone: "", source: "", propertyInterest: "" });
  const [newPost, setNewPost] = useState({ title: "", content: "", platform: "facebook", scheduledDate: "" });

  const { data: contacts = [] } = useContacts();
  const { data: appointments = [] } = useAppointments();
  const { data: leads = [] } = useLeads();
  const { data: posts = [] } = usePosts();

  const createContact = useCreateContact();
  const createAppointment = useCreateAppointment();
  const createLead = useCreateLead();
  const createPost = useCreatePost();

  const stats = [
    { label: "Contacts", value: contacts.length, icon: Users },
    { label: "Leads", value: leads.length, icon: Megaphone },
    { label: "Appointments", value: appointments.length, icon: Calendar },
    { label: "Posts", value: posts.length, icon: TrendingUp },
  ];

  const recentActivity = useMemo(() => {
    const activities: { type: string; message: string; time: string; date: Date }[] = [];

    contacts.slice(0, 3).forEach((contact) => {
      activities.push({
        type: "contact",
        message: `New contact: ${contact.name}`,
        time: formatDistanceToNow(new Date(contact.created_at), { addSuffix: true }),
        date: new Date(contact.created_at),
      });
    });

    appointments.slice(0, 3).forEach((apt) => {
      activities.push({
        type: "appointment",
        message: `Appointment: ${apt.title}`,
        time: formatDistanceToNow(new Date(apt.created_at), { addSuffix: true }),
        date: new Date(apt.created_at),
      });
    });

    return activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
  }, [contacts, appointments]);

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
      
      const appointment = await createAppointment.mutateAsync({
        title: newAppointment.title,
        date: dateTime,
        location: newAppointment.location || null,
        type: "meeting",
      });
      
      // Try to sync to Google Calendar if connected
      if (user) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            // Check if Google Calendar is connected
            const checkRes = await fetch(`${GCAL_URL}?action=events`, {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                "Content-Type": "application/json",
              },
            });
            const checkData = await checkRes.json();
            
            if (!checkData?.needsAuth && !checkData?.error) {
              // Connected, create event
              await fetch(`${GCAL_URL}?action=create-event`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  summary: newAppointment.title,
                  description: "",
                  start: dateTime,
                  end: addHours(new Date(dateTime), 1).toISOString(),
                  location: newAppointment.location || "",
                }),
              });
            }
          }
        } catch (e) {
          // Silent fail - appointment is already created
          console.log("Google Calendar sync failed:", e);
        }
      }
      
      toast({ title: "Success", description: "Appointment scheduled!" });
      setNewAppointment({ title: "", date: "", time: "", location: "" });
      setAppointmentDialogOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to schedule appointment", variant: "destructive" });
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Dashboard" description="Welcome back! Here's your command center." />

      {/* Vision & Affirmations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <VisionBoard />
        <AffirmationsWidget />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => (
          <Card key={index} className="zoho-card p-4 md:p-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="p-2 rounded-lg zoho-accent-bg">
                <stat.icon className="w-4 h-4 md:w-5 md:h-5 zoho-accent" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-white/60">{stat.label}</p>
                <p className="text-xl md:text-2xl font-bold text-white">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <KPISnapshot />
          <DashboardCalendarWidget />
        </div>

        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="zoho-card p-4 md:p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setContactDialogOpen(true)}
                className="flex items-center gap-2 p-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-colors min-h-[48px]"
              >
                <Users className="w-4 h-4 zoho-accent" />
                <span className="text-sm font-medium">Add Contact</span>
              </button>
              <button
                onClick={() => setLeadDialogOpen(true)}
                className="flex items-center gap-2 p-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-colors min-h-[48px]"
              >
                <Megaphone className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium">Add Lead</span>
              </button>
              <button
                onClick={() => setAppointmentDialogOpen(true)}
                className="flex items-center gap-2 p-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-colors min-h-[48px]"
              >
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium">Schedule</span>
              </button>
              <button
                onClick={() => setPostDialogOpen(true)}
                className="flex items-center gap-2 p-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-colors col-span-2 min-h-[48px]"
              >
                <Home className="w-4 h-4 zoho-accent" />
                <span className="text-sm font-medium">Create Post</span>
              </button>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="zoho-card p-4 md:p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-white/50">
                <Clock className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No recent activity yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 pb-3 border-b border-white/10 last:border-0">
                    <div className="w-2 h-2 rounded-full zoho-accent bg-[#00BCD4] mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{activity.message}</p>
                      <p className="text-xs text-white/50 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-popover border-border">
          <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
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
        <DialogContent className="sm:max-w-[400px] bg-popover border-border">
          <DialogHeader><DialogTitle>Add Lead</DialogTitle></DialogHeader>
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
        <DialogContent className="sm:max-w-[400px] bg-popover border-border">
          <DialogHeader><DialogTitle>Schedule Appointment</DialogTitle></DialogHeader>
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
            <Button onClick={handleScheduleAppointment} disabled={createAppointment.isPending}>{createAppointment.isPending ? "Scheduling..." : "Schedule"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
        <DialogContent className="sm:max-w-[450px] bg-popover border-border">
          <DialogHeader><DialogTitle>Create Post</DialogTitle></DialogHeader>
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
