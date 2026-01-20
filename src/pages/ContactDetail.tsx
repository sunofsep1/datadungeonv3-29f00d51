import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { AvatarCircle } from "@/components/ui/avatar-circle";
import { 
  ArrowLeft, 
  Printer, 
  Phone, 
  Mail, 
  Calendar, 
  MessageSquare, 
  Plus,
  Edit,
  Trash2,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useContact } from "@/hooks/useContact";
import { useUpdateContact } from "@/hooks/useContacts";
import { useInteractions, useCreateInteraction, useDeleteInteraction, Interaction } from "@/hooks/useInteractions";
import { useAppointments } from "@/hooks/useAppointments";
import { format, formatDistanceToNow } from "date-fns";

const INTERACTION_TYPES = ["call", "email", "meeting", "note", "sms", "other"];
const CHANNELS = ["phone", "email", "in-person", "video", "sms", "social"];

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { data: contact, isLoading } = useContact(id);
  const { data: interactions = [] } = useInteractions(id);
  const { data: appointments = [] } = useAppointments();
  const updateContact = useUpdateContact();
  const createInteraction = useCreateInteraction();
  const deleteInteraction = useDeleteInteraction();

  const [isEditing, setIsEditing] = useState(false);
  const [addInteractionOpen, setAddInteractionOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [newInteraction, setNewInteraction] = useState({
    type: "call",
    channel: "phone",
    subject: "",
    body: "",
  });

  const contactAppointments = appointments.filter(
    (apt) => apt.contact_id === id
  );

  const handleStartEdit = () => {
    if (contact) {
      setEditFormData({
        name: contact.name,
        email: contact.email || "",
        phone: contact.phone || "",
        status: contact.status || "lead",
        source: contact.source || "",
        notes: contact.notes || "",
        story: (contact as any).story || "",
        pipeline_stage: (contact as any).pipeline_stage || "",
        selling_intentions: (contact as any).selling_intentions || "",
        current_situation_notes: (contact as any).current_situation_notes || "",
        pain_points: (contact as any).pain_points || "",
        pleasure_points: (contact as any).pleasure_points || "",
      });
      setIsEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!contact) return;
    try {
      await updateContact.mutateAsync({
        id: contact.id,
        ...editFormData,
      });
      toast({ title: "Success", description: "Contact updated!" });
      setIsEditing(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleAddInteraction = async () => {
    if (!id) return;
    if (!newInteraction.subject.trim()) {
      toast({ title: "Error", description: "Please enter a subject", variant: "destructive" });
      return;
    }
    try {
      await createInteraction.mutateAsync({
        contact_id: id,
        type: newInteraction.type,
        channel: newInteraction.channel,
        subject: newInteraction.subject,
        body: newInteraction.body || null,
      });
      toast({ title: "Success", description: "Interaction logged!" });
      setNewInteraction({ type: "call", channel: "phone", subject: "", body: "" });
      setAddInteractionOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteInteraction = async (interactionId: string) => {
    if (!id) return;
    try {
      await deleteInteraction.mutateAsync({ id: interactionId, contactId: id });
      toast({ title: "Deleted", description: "Interaction removed" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusVariant = (status: string | null) => {
    switch (status) {
      case "hot": return "hot";
      case "warm": return "warm";
      case "cold": return "cold";
      default: return "entered";
    }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <Skeleton className="h-10 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="animate-fade-in text-center py-12">
        <p className="text-muted-foreground">Contact not found</p>
        <Button variant="outline" onClick={() => navigate("/contacts")} className="mt-4">
          Back to Contacts
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in print:bg-white print:text-black">
      <div className="flex items-center gap-4 mb-6 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => navigate("/contacts")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{contact.name}</h1>
          <p className="text-muted-foreground">Contact Details</p>
        </div>
        <Button variant="outline" onClick={handlePrint} className="gap-2">
          <Printer className="w-4 h-4" /> Print
        </Button>
        <Button onClick={handleStartEdit} className="gap-2">
          <Edit className="w-4 h-4" /> Edit
        </Button>
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-3xl font-bold">{contact.name}</h1>
        <p className="text-gray-600">Contact Card - Printed {format(new Date(), "PPP")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info Card */}
        <Card className="p-6 lg:col-span-2 print:border print:border-gray-300">
          <div className="flex items-start gap-4 mb-6">
            <AvatarCircle name={contact.name} size="lg" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-semibold">{contact.name}</h2>
                <StatusBadge variant={getStatusVariant(contact.status)}>
                  {contact.status || "lead"}
                </StatusBadge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {contact.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-4 h-4" /> {contact.phone}
                  </span>
                )}
                {contact.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-4 h-4" /> {contact.email}
                  </span>
                )}
              </div>
              {contact.source && (
                <p className="text-sm text-muted-foreground mt-2">Source: {contact.source}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Story</Label>
                <p className="text-foreground">{(contact as any).story || "-"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Pipeline Stage</Label>
                <p className="text-foreground">{(contact as any).pipeline_stage || "-"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Selling Intentions</Label>
                <p className="text-foreground">{(contact as any).selling_intentions || "-"}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Current Situation</Label>
                <p className="text-foreground">{(contact as any).current_situation_notes || "-"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Pain Points</Label>
                <p className="text-foreground">{(contact as any).pain_points || "-"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase">Pleasure Points</Label>
                <p className="text-foreground">{(contact as any).pleasure_points || "-"}</p>
              </div>
            </div>
          </div>

          {contact.notes && (
            <div className="mt-4 pt-4 border-t border-border">
              <Label className="text-muted-foreground text-xs uppercase">Notes</Label>
              <p className="text-foreground whitespace-pre-wrap">{contact.notes}</p>
            </div>
          )}
        </Card>

        {/* Activity Timeline */}
        <Card className="p-6 print:border print:border-gray-300">
          <div className="flex items-center justify-between mb-4 print:hidden">
            <h3 className="font-semibold text-foreground">Activity Timeline</h3>
            <Button size="sm" onClick={() => setAddInteractionOpen(true)} className="gap-1">
              <Plus className="w-4 h-4" /> Log
            </Button>
          </div>
          <h3 className="font-semibold hidden print:block mb-4">Activity Timeline</h3>

          <div className="space-y-4 max-h-[600px] overflow-y-auto print:max-h-none">
            {/* Appointments */}
            {contactAppointments.map((apt) => (
              <div key={apt.id} className="flex gap-3 pb-4 border-b border-border last:border-0">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{apt.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(apt.date), "PPp")}
                  </p>
                  {apt.location && (
                    <p className="text-xs text-muted-foreground">{apt.location}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Interactions */}
            {interactions.map((interaction: Interaction) => (
              <div key={interaction.id} className="flex gap-3 pb-4 border-b border-border last:border-0 group">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm capitalize">{interaction.type}</p>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 print:hidden"
                      onClick={() => handleDeleteInteraction(interaction.id)}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                  {interaction.subject && (
                    <p className="text-sm text-foreground">{interaction.subject}</p>
                  )}
                  {interaction.body && (
                    <p className="text-xs text-muted-foreground mt-1">{interaction.body}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(interaction.timestamp), { addSuffix: true })}
                    </span>
                    {interaction.channel && (
                      <span className="text-xs bg-secondary px-1.5 py-0.5 rounded capitalize">
                        {interaction.channel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {interactions.length === 0 && contactAppointments.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">
                No activity yet. Log your first interaction!
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[600px] bg-popover border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                className="bg-input"
                value={editFormData.name || ""}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editFormData.status}
                onValueChange={(v) => setEditFormData({ ...editFormData, status: v })}
              >
                <SelectTrigger className="bg-input"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                className="bg-input"
                value={editFormData.phone || ""}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                className="bg-input"
                value={editFormData.email || ""}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Input
                className="bg-input"
                value={editFormData.source || ""}
                onChange={(e) => setEditFormData({ ...editFormData, source: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Pipeline Stage</Label>
              <Input
                className="bg-input"
                value={editFormData.pipeline_stage || ""}
                onChange={(e) => setEditFormData({ ...editFormData, pipeline_stage: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Story</Label>
              <Textarea
                className="bg-input min-h-[60px]"
                value={editFormData.story || ""}
                onChange={(e) => setEditFormData({ ...editFormData, story: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Selling Intentions</Label>
              <Textarea
                className="bg-input min-h-[60px]"
                value={editFormData.selling_intentions || ""}
                onChange={(e) => setEditFormData({ ...editFormData, selling_intentions: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Current Situation Notes</Label>
              <Textarea
                className="bg-input min-h-[60px]"
                value={editFormData.current_situation_notes || ""}
                onChange={(e) => setEditFormData({ ...editFormData, current_situation_notes: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Pain Points</Label>
              <Textarea
                className="bg-input min-h-[60px]"
                value={editFormData.pain_points || ""}
                onChange={(e) => setEditFormData({ ...editFormData, pain_points: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Pleasure Points</Label>
              <Textarea
                className="bg-input min-h-[60px]"
                value={editFormData.pleasure_points || ""}
                onChange={(e) => setEditFormData({ ...editFormData, pleasure_points: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Notes</Label>
              <Textarea
                className="bg-input min-h-[80px]"
                value={editFormData.notes || ""}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={updateContact.isPending}>
              {updateContact.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Interaction Dialog */}
      <Dialog open={addInteractionOpen} onOpenChange={setAddInteractionOpen}>
        <DialogContent className="sm:max-w-[400px] bg-popover border-border">
          <DialogHeader>
            <DialogTitle>Log Interaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newInteraction.type}
                  onValueChange={(v) => setNewInteraction({ ...newInteraction, type: v })}
                >
                  <SelectTrigger className="bg-input"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INTERACTION_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select
                  value={newInteraction.channel}
                  onValueChange={(v) => setNewInteraction({ ...newInteraction, channel: v })}
                >
                  <SelectTrigger className="bg-input"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Input
                placeholder="Brief summary..."
                className="bg-input"
                value={newInteraction.subject}
                onChange={(e) => setNewInteraction({ ...newInteraction, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Details</Label>
              <Textarea
                placeholder="Additional notes..."
                className="bg-input min-h-[80px]"
                value={newInteraction.body}
                onChange={(e) => setNewInteraction({ ...newInteraction, body: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setAddInteractionOpen(false)}>Cancel</Button>
            <Button onClick={handleAddInteraction} disabled={createInteraction.isPending}>
              {createInteraction.isPending ? "Saving..." : "Log Interaction"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
