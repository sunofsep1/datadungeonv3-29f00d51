import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Phone, Plus, Clock, Trash2, Pencil, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCalls, useCreateCall, useUpdateCall, useDeleteCall, Call } from "@/hooks/useCalls";
import { useContacts } from "@/hooks/useContacts";
import { format, parseISO } from "date-fns";

export function CallsTracker() {
  const { toast } = useToast();
  const { data: calls = [], isLoading } = useCalls();
  const { data: contacts = [] } = useContacts();
  const createCall = useCreateCall();
  const updateCall = useUpdateCall();
  const deleteCall = useDeleteCall();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCall, setEditingCall] = useState<Call | null>(null);
  const [formData, setFormData] = useState({
    contact_id: "",
    contact_name: "",
    call_date: format(new Date(), "yyyy-MM-dd"),
    call_time: format(new Date(), "HH:mm"),
    duration_minutes: 0,
    notes: "",
    outcome: "completed",
  });

  const resetForm = () => {
    setFormData({
      contact_id: "",
      contact_name: "",
      call_date: format(new Date(), "yyyy-MM-dd"),
      call_time: format(new Date(), "HH:mm"),
      duration_minutes: 0,
      notes: "",
      outcome: "completed",
    });
    setEditingCall(null);
  };

  const handleOpenDialog = (call?: Call) => {
    if (call) {
      setEditingCall(call);
      const callDateTime = parseISO(call.call_date);
      setFormData({
        contact_id: call.contact_id || "",
        contact_name: call.contact_name || "",
        call_date: format(callDateTime, "yyyy-MM-dd"),
        call_time: format(callDateTime, "HH:mm"),
        duration_minutes: call.duration_minutes || 0,
        notes: call.notes || "",
        outcome: call.outcome || "completed",
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.contact_name.trim() && !formData.contact_id) {
      toast({ title: "Error", description: "Please enter a contact name", variant: "destructive" });
      return;
    }

    try {
      const callDateTime = `${formData.call_date}T${formData.call_time}:00`;
      const contactName = formData.contact_id 
        ? contacts.find(c => c.id === formData.contact_id)?.name || formData.contact_name
        : formData.contact_name;

      if (editingCall) {
        await updateCall.mutateAsync({
          id: editingCall.id,
          contact_id: formData.contact_id || null,
          contact_name: contactName,
          call_date: callDateTime,
          duration_minutes: formData.duration_minutes || null,
          notes: formData.notes || null,
          outcome: formData.outcome,
        });
        toast({ title: "Success", description: "Call updated!" });
      } else {
        await createCall.mutateAsync({
          contact_id: formData.contact_id || null,
          contact_name: contactName,
          call_date: callDateTime,
          duration_minutes: formData.duration_minutes || null,
          notes: formData.notes || null,
          outcome: formData.outcome,
        });
        toast({ title: "Success", description: "Call logged!" });
      }
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save call", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCall.mutateAsync(id);
      toast({ title: "Deleted", description: "Call removed" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete call", variant: "destructive" });
    }
  };

  // Stats
  const totalCalls = calls.length;
  const completedCalls = calls.filter(c => c.outcome === "completed").length;
  const totalDuration = calls.reduce((sum, c) => sum + (c.duration_minutes || 0), 0);

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Calls Tracker</h3>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1" onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4" /> Log Call
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px] bg-popover border-border">
            <DialogHeader>
              <DialogTitle>{editingCall ? "Edit Call" : "Log Call"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Contact</Label>
                <Select
                  value={formData.contact_id}
                  onValueChange={(value) => {
                    const contact = contacts.find(c => c.id === value);
                    setFormData({ 
                      ...formData, 
                      contact_id: value,
                      contact_name: contact?.name || ""
                    });
                  }}
                >
                  <SelectTrigger className="bg-input">
                    <SelectValue placeholder="Select contact or type name below" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Or type contact name"
                  className="bg-input"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value, contact_id: "" })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    className="bg-input"
                    value={formData.call_date}
                    onChange={(e) => setFormData({ ...formData, call_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    className="bg-input"
                    value={formData.call_time}
                    onChange={(e) => setFormData({ ...formData, call_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    className="bg-input"
                    value={formData.duration_minutes || ""}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Outcome</Label>
                  <Select
                    value={formData.outcome}
                    onValueChange={(value) => setFormData({ ...formData, outcome: value })}
                  >
                    <SelectTrigger className="bg-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="no-answer">No Answer</SelectItem>
                      <SelectItem value="voicemail">Voicemail</SelectItem>
                      <SelectItem value="callback">Callback Requested</SelectItem>
                      <SelectItem value="not-interested">Not Interested</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Call notes..."
                  className="bg-input min-h-[80px]"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={createCall.isPending || updateCall.isPending}>
                {(createCall.isPending || updateCall.isPending) ? "Saving..." : editingCall ? "Update" : "Log Call"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-3 bg-secondary rounded-lg text-center">
          <p className="text-2xl font-bold text-foreground">{totalCalls}</p>
          <p className="text-xs text-muted-foreground">Total Calls</p>
        </div>
        <div className="p-3 bg-secondary rounded-lg text-center">
          <p className="text-2xl font-bold text-success">{completedCalls}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>
        <div className="p-3 bg-secondary rounded-lg text-center">
          <p className="text-2xl font-bold text-info">{totalDuration}</p>
          <p className="text-xs text-muted-foreground">Minutes</p>
        </div>
      </div>

      {/* Calls List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : calls.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No calls logged yet</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {calls.map((call) => (
            <div key={call.id} className="flex items-start gap-3 p-3 bg-secondary rounded-lg">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground truncate">{call.contact_name || "Unknown"}</p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenDialog(call)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Call</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this call record?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(call.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>{format(parseISO(call.call_date), "MMM d, yyyy h:mm a")}</span>
                  {call.duration_minutes && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {call.duration_minutes}m
                    </span>
                  )}
                  <span className="capitalize">{call.outcome?.replace("-", " ")}</span>
                </div>
                {call.notes && (
                  <p className="text-sm text-muted-foreground mt-1 truncate">{call.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
