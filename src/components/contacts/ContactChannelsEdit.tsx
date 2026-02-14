import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Phone, Mail, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useContactChannels,
  useCreateContactChannel,
  useUpdateContactChannel,
  useDeleteContactChannel,
  type ContactChannel,
  type ContactChannelInsert,
} from "@/hooks/useContactChannels";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const CHANNEL_TYPES = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "mobile", label: "Mobile" },
  { value: "other", label: "Other" },
] as const;

interface ContactChannelsEditProps {
  contactId: string;
  onClose?: () => void;
}

export function ContactChannelsEdit({ contactId, onClose }: ContactChannelsEditProps) {
  const { toast } = useToast();
  const { data: channels = [], isLoading } = useContactChannels(contactId);
  const createChannel = useCreateContactChannel();
  const updateChannel = useUpdateContactChannel();
  const deleteChannel = useDeleteContactChannel();

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ContactChannel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactChannel | null>(null);
  const [form, setForm] = useState({
    channel_type: "email" as ContactChannelInsert["channel_type"],
    value: "",
    label: "",
    is_primary: false,
  });

  const resetForm = () => {
    setForm({
      channel_type: "email",
      value: "",
      label: "",
      is_primary: false,
    });
    setAddOpen(false);
    setEditing(null);
  };

  const handleAdd = async () => {
    if (!form.value.trim()) {
      toast({ title: "Value required", variant: "destructive" });
      return;
    }
    try {
      await createChannel.mutateAsync({
        contact_id: contactId,
        channel_type: form.channel_type,
        value: form.value.trim(),
        label: form.label.trim() || null,
        is_primary: form.is_primary,
      });
      toast({ title: "Channel added" });
      resetForm();
    } catch (e: any) {
      toast({ title: "Failed to add", description: e?.message, variant: "destructive" });
    }
  };

  const handleUpdate = async () => {
    if (!editing || !form.value.trim()) return;
    try {
      await updateChannel.mutateAsync({
        id: editing.id,
        contact_id: contactId,
        channel_type: form.channel_type,
        value: form.value.trim(),
        label: form.label.trim() || null,
        is_primary: form.is_primary,
      });
      toast({ title: "Channel updated" });
      resetForm();
    } catch (e: any) {
      toast({ title: "Failed to update", description: e?.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteChannel.mutateAsync({ id: deleteTarget.id, contact_id: contactId });
      toast({ title: "Channel removed" });
      setDeleteTarget(null);
    } catch (e: any) {
      toast({ title: "Failed to delete", description: e?.message, variant: "destructive" });
    }
  };

  const openEdit = (ch: ContactChannel) => {
    setEditing(ch);
    setForm({
      channel_type: ch.channel_type,
      value: ch.value,
      label: (ch as { label?: string | null }).label ?? "",
      is_primary: !!ch.is_primary,
    });
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading channels…</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Phones & emails</span>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setAddOpen(true); setForm({ channel_type: "email", value: "", label: "", is_primary: false }); }}>
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>
      <ul className="space-y-2">
        {channels.map((ch) => (
          <li key={ch.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
            <span className="flex items-center gap-2">
              {ch.channel_type === "email" ? <Mail className="w-4 h-4 text-muted-foreground" /> : <Phone className="w-4 h-4 text-muted-foreground" />}
              <span>{(ch as { label?: string | null }).label || ch.channel_type}</span>
              <span className="text-muted-foreground">{ch.value}</span>
              {ch.is_primary && <span className="text-xs text-muted-foreground">(primary)</span>}
            </span>
            <span className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(ch)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(ch)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </span>
          </li>
        ))}
      </ul>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add phone or email</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select
                value={form.channel_type}
                onValueChange={(v: ContactChannelInsert["channel_type"]) => setForm((f) => ({ ...f, channel_type: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNEL_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Label (optional)</Label>
              <Input
                placeholder="e.g. Work, Home"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Value</Label>
              <Input
                type={form.channel_type === "email" ? "email" : "tel"}
                placeholder={form.channel_type === "email" ? "email@example.com" : "Phone number"}
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_primary}
                onChange={(e) => setForm((f) => ({ ...f, is_primary: e.target.checked }))}
              />
              <span className="text-sm">Primary</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createChannel.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit channel</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select
                value={form.channel_type}
                onValueChange={(v: ContactChannelInsert["channel_type"]) => setForm((f) => ({ ...f, channel_type: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNEL_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Label (optional)</Label>
              <Input
                placeholder="e.g. Work, Home"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Value</Label>
              <Input
                type={form.channel_type === "email" ? "email" : "tel"}
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_primary}
                onChange={(e) => setForm((f) => ({ ...f, is_primary: e.target.checked }))}
              />
              <span className="text-sm">Primary</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateChannel.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this number/email?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {deleteTarget?.value} from the contact. You can add it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
