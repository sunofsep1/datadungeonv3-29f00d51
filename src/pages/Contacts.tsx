import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { AvatarCircle } from "@/components/ui/avatar-circle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Phone, Mail, Trash2, Pencil, Users, Download, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact, Contact } from "@/hooks/useContacts";
import { Skeleton } from "@/components/ui/skeleton";

type ContactStatus = "hot" | "warm" | "cold" | "lead";

const createEmptyContact = () => ({
  name: "",
  phone: "",
  email: "",
  source: "",
  notes: "",
  status: "lead" as ContactStatus,
});

export default function Contacts() {
  const navigate = useNavigate();
  const { data: contacts, isLoading } = useContacts();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState(createEmptyContact());
  const { toast } = useToast();

  const handleExportCSV = () => {
    if (!contacts || contacts.length === 0) {
      toast({ title: "No data", description: "No contacts to export", variant: "destructive" });
      return;
    }

    const headers = ["Name", "Email", "Phone", "Status", "Source", "Notes", "Created At"];
    const rows = contacts.map((c) => [
      c.name,
      c.email || "",
      c.phone || "",
      c.status || "",
      c.source || "",
      c.notes || "",
      c.created_at ? new Date(c.created_at).toLocaleDateString() : "",
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Contacts exported to CSV" });
  };

  const stats = {
    total: contacts?.length || 0,
    hot: contacts?.filter((c) => c.status === "hot").length || 0,
    warm: contacts?.filter((c) => c.status === "warm").length || 0,
    cold: contacts?.filter((c) => c.status === "cold").length || 0,
  };

  const filteredContacts = contacts?.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (contact.email?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (contact.source?.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  const handleOpenDialog = (contact?: Contact) => {
    if (contact) {
      setEditingContact(contact);
      setFormData({
        name: contact.name,
        phone: contact.phone || "",
        email: contact.email || "",
        source: contact.source || "",
        notes: contact.notes || "",
        status: (contact.status as ContactStatus) || "lead",
      });
    } else {
      setEditingContact(null);
      setFormData(createEmptyContact());
    }
    setIsDialogOpen(true);
  };

  const handleSaveContact = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Please enter a contact name", variant: "destructive" });
      return;
    }

    try {
      if (editingContact) {
        await updateContact.mutateAsync({
          id: editingContact.id,
          ...formData,
        });
        toast({ title: "Success", description: "Contact updated!" });
      } else {
        await createContact.mutateAsync(formData);
        toast({ title: "Success", description: "Contact added!" });
      }
      setIsDialogOpen(false);
      setFormData(createEmptyContact());
      setEditingContact(null);
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save contact", 
        variant: "destructive" 
      });
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      await deleteContact.mutateAsync(id);
      toast({ title: "Deleted", description: "Contact removed" });
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete contact", 
        variant: "destructive" 
      });
    }
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
        <PageHeader title="Contacts" description="Manage your contacts and leads" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Contacts"
        description="Manage your contacts and leads"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV} className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setFormData(createEmptyContact());
                setEditingContact(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4" />
                  Add Contact
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[400px] bg-popover border-border">
              <DialogHeader>
                <DialogTitle>{editingContact ? "Edit Contact" : "Add New Contact"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    placeholder="Contact name"
                    className="bg-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    placeholder="0400 000 000"
                    className="bg-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    placeholder="email@example.com"
                    className="bg-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Input
                    placeholder="How did you meet?"
                    className="bg-input"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: ContactStatus) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="bg-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hot">Hot</SelectItem>
                      <SelectItem value="warm">Warm</SelectItem>
                      <SelectItem value="cold">Cold</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                    </SelectContent>
                  </Select>
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
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button 
                  onClick={handleSaveContact}
                  disabled={createContact.isPending || updateContact.isPending}
                >
                  {(createContact.isPending || updateContact.isPending) ? "Saving..." : editingContact ? "Update" : "Add"} Contact
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard value={stats.total} label="Total Contacts" variant="total" />
        <StatCard value={stats.hot} label="Hot Leads" variant="cancelled" />
        <StatCard value={stats.warm} label="Warm Leads" variant="planning" />
        <StatCard value={stats.cold} label="Cold Leads" variant="active" />
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search contacts..."
          className="pl-10 bg-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Contacts List */}
      {filteredContacts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{contacts?.length === 0 ? "No contacts yet. Add your first contact!" : "No contacts match your search."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredContacts.map((contact) => (
            <div 
              key={contact.id} 
              className="contact-row cursor-pointer hover:bg-secondary/50 transition-colors"
              onClick={() => navigate(`/contacts/${contact.id}`)}
            >
              <AvatarCircle name={contact.name} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{contact.name}</span>
                  <StatusBadge variant={getStatusVariant(contact.status)}>{contact.status || "lead"}</StatusBadge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  {contact.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {contact.phone}
                    </span>
                  )}
                  {contact.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {contact.email}
                    </span>
                  )}
                  {contact.source && (
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                      {contact.source}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 items-center" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(contact)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {contact.name}? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteContact(contact.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
