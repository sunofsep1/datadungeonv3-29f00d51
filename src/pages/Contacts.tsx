import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { AvatarCircle } from "@/components/ui/avatar-circle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Phone,
  Mail,
  Trash2,
  Pencil,
  Users,
  Download,
  ChevronRight,
  Upload,
  ArrowUpDown,
  Tag,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useContacts,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  type ContactWithMeta,
  getPrimaryEmail,
  getPrimaryPhone,
  getTagNames,
  getLinkedPropertyAddress,
} from "@/hooks/useContacts";
import { useTags, useCreateTag } from "@/hooks/useTags";
import { useAddContactTag, useRemoveContactTag } from "@/hooks/useContactTags";
import { Skeleton } from "@/components/ui/skeleton";
import { CSVImportDialog } from "@/components/contacts/CSVImportDialog";
import { getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ContactStatus = "hot" | "warm" | "cold" | "lead";
type SortOption = "name-asc" | "name-desc" | "status-asc" | "status-desc";

const createEmptyContact = () => ({
  name: "",
  phone: "",
  email: "",
  source: "",
  notes: "",
  status: "lead" as ContactStatus,
  story: "",
  selling_intentions: "",
  pain_points: "",
  pleasure_points: "",
  pipeline_stage: "",
  current_situation_notes: "",
});

export default function Contacts() {
  const navigate = useNavigate();
  const { data: contacts, isLoading, isError, refetch } = useContacts();
  const { data: tags } = useTags();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const createTag = useCreateTag();
  const addContactTag = useAddContactTag();
  const removeContactTag = useRemoveContactTag();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [filterSource, setFilterSource] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactWithMeta | null>(null);
  const [formData, setFormData] = useState(createEmptyContact());
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const { toast } = useToast();

  const filteredAndSortedContacts = useMemo(() => {
    let list = (contacts ?? []) as ContactWithMeta[];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => {
        const email = getPrimaryEmail(c);
        const phone = getPrimaryPhone(c);
        const tagNames = getTagNames(c);
        return (
          c.name.toLowerCase().includes(q) ||
          (email?.toLowerCase().includes(q)) ||
          (phone?.toLowerCase().includes(q)) ||
          (c.source?.toLowerCase().includes(q)) ||
          tagNames.some((t) => t.toLowerCase().includes(q))
        );
      });
    }
    if (filterStatus && filterStatus !== "all") {
      list = list.filter((c) => (c.status ?? "lead") === filterStatus);
    }
    if (filterTagIds.length > 0) {
      list = list.filter((c) => {
        const ctTagIds = (c.contact_tags ?? []).map((ct) => ct.tag_id);
        return filterTagIds.some((tid) => ctTagIds.includes(tid));
      });
    }
    if (filterSource && filterSource !== "all") {
      list = list.filter((c) => (c.source ?? "") === filterSource);
    }
    const sorted = [...list].sort((a, b) => {
      if (sortBy === "name-asc") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "name-desc") return (b.name || "").localeCompare(a.name || "");
      if (sortBy === "status-asc") {
        const sa = a.status ?? "lead";
        const sb = b.status ?? "lead";
        return sa.localeCompare(sb) || (a.name || "").localeCompare(b.name || "");
      }
      const sa = a.status ?? "lead";
      const sb = b.status ?? "lead";
      return sb.localeCompare(sa) || (a.name || "").localeCompare(b.name || "");
    });
    return sorted;
  }, [contacts, searchQuery, filterStatus, filterTagIds, filterSource, sortBy]);

  const distinctSources = useMemo(() => {
    const set = new Set<string>();
    (contacts ?? []).forEach((c) => {
      if (c.source?.trim()) set.add(c.source.trim());
    });
    return Array.from(set).sort();
  }, [contacts]);

  const handleExportCSV = () => {
    if (filteredAndSortedContacts.length === 0) {
      toast({
        title: "No data",
        description: "No contacts to export (maybe filters hide all)",
        variant: "destructive",
      });
      return;
    }
    const headers = [
      "Name",
      "Phones",
      "Emails",
      "Status",
      "Source",
      "Tags",
      "Linked property address",
      "Created At",
    ];
    const rows = filteredAndSortedContacts.map((c) => {
      const phones = (c.contact_channels ?? [])
        .filter((ch) => ch.channel_type === "phone" || ch.channel_type === "mobile")
        .map((ch) => ch.value)
        .join("; ");
      const emails = (c.contact_channels ?? [])
        .filter((ch) => ch.channel_type === "email")
        .map((ch) => ch.value)
        .join("; ");
      const fallbackPhone = phones || c.phone || "";
      const fallbackEmail = emails || c.email || "";
      const tagNames = getTagNames(c).join("; ");
      const linkedProperty = getLinkedPropertyAddress(c);
      return [
        c.name,
        fallbackPhone,
        fallbackEmail,
        c.status ?? "lead",
        c.source ?? "",
        tagNames,
        linkedProperty,
        c.created_at ? new Date(c.created_at).toLocaleDateString() : "",
      ];
    });
    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${rows.length} contacts exported to CSV` });
  };

  const stats = {
    total: contacts?.length ?? 0,
    hot: contacts?.filter((c) => c.status === "hot").length ?? 0,
    warm: contacts?.filter((c) => c.status === "warm").length ?? 0,
    cold: contacts?.filter((c) => c.status === "cold").length ?? 0,
  };

  const handleOpenDialog = (contact?: ContactWithMeta) => {
    if (contact) {
      setEditingContact(contact);
      setFormData({
        name: contact.name,
        phone: getPrimaryPhone(contact) ?? contact.phone ?? "",
        email: getPrimaryEmail(contact) ?? contact.email ?? "",
        source: contact.source ?? "",
        notes: contact.notes ?? "",
        status: (contact.status as ContactStatus) ?? "lead",
        story: contact.story ?? "",
        selling_intentions: contact.selling_intentions ?? "",
        pain_points: contact.pain_points ?? "",
        pleasure_points: contact.pleasure_points ?? "",
        pipeline_stage: contact.pipeline_stage ?? "",
        current_situation_notes: contact.current_situation_notes ?? "",
      });
      const tagIds = (contact.contact_tags ?? []).map((ct) => ct.tag_id);
      setSelectedTagIds(tagIds);
    } else {
      setEditingContact(null);
      setFormData(createEmptyContact());
      setSelectedTagIds([]);
    }
    setNewTagName("");
    setIsDialogOpen(true);
  };

  const handleSaveContact = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a contact name",
        variant: "destructive",
      });
      return;
    }
    try {
      let contactId: string;
      if (editingContact) {
        const updated = await updateContact.mutateAsync({
          id: editingContact.id,
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          source: formData.source || null,
          notes: formData.notes || null,
          status: formData.status,
          story: formData.story || null,
          selling_intentions: formData.selling_intentions || null,
          pain_points: formData.pain_points || null,
          pleasure_points: formData.pleasure_points || null,
          pipeline_stage: formData.pipeline_stage || null,
          current_situation_notes: formData.current_situation_notes || null,
        });
        contactId = updated.id;
        toast({ title: "Success", description: "Contact updated!" });
      } else {
        const created = await createContact.mutateAsync({
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          source: formData.source || null,
          notes: formData.notes || null,
          status: formData.status,
          story: formData.story || null,
          selling_intentions: formData.selling_intentions || null,
          pain_points: formData.pain_points || null,
          pleasure_points: formData.pleasure_points || null,
          pipeline_stage: formData.pipeline_stage || null,
          current_situation_notes: formData.current_situation_notes || null,
        });
        contactId = created.id;
        toast({ title: "Success", description: "Contact added!" });
      }

      // Handle tags: sync selected tags with contact
      if (editingContact) {
        const existingTagIds = (editingContact.contact_tags ?? []).map((ct) => ct.tag_id);
        const toRemove = existingTagIds.filter((tid) => !selectedTagIds.includes(tid));
        const toAdd = selectedTagIds.filter((tid) => !existingTagIds.includes(tid));
        for (const tagId of toRemove) {
          await removeContactTag.mutateAsync({ contact_id: contactId, tag_id: tagId });
        }
        for (const tagId of toAdd) {
          await addContactTag.mutateAsync({ contact_id: contactId, tag_id: tagId });
        }
      } else {
        // For new contacts, add all selected tags
        for (const tagId of selectedTagIds) {
          await addContactTag.mutateAsync({ contact_id: contactId, tag_id: tagId });
        }
      }

      setIsDialogOpen(false);
      setFormData(createEmptyContact());
      setSelectedTagIds([]);
      setEditingContact(null);
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: (e as Error).message || "Failed to save contact",
        variant: "destructive",
      });
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const tag = await createTag.mutateAsync({ name: newTagName.trim() });
      setSelectedTagIds((prev) => [...prev, tag.id]);
      setNewTagName("");
      toast({ title: "Tag created", description: `Tag "${tag.name}" added` });
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: (e as Error).message || "Failed to create tag",
        variant: "destructive",
      });
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      await deleteContact.mutateAsync(id);
      toast({ title: "Deleted", description: "Contact removed" });
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: (e as Error).message || "Failed to delete contact",
        variant: "destructive",
      });
    }
  };

  const toggleTagFilter = (tagId: string) => {
    setFilterTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const getStatusVariant = (status: string | null) => {
    switch (status) {
      case "hot":
        return "hot";
      case "warm":
        return "warm";
      case "cold":
        return "cold";
      default:
        return "entered";
    }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Contacts" description="Manage your contacts and leads" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Contacts" description="Manage your contacts and leads" />
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium text-foreground mb-2">Couldn&apos;t load contacts</p>
          <p className="text-sm mb-4">Check your connection and migrations, then retry.</p>
          <Button onClick={() => refetch()} variant="outline">
            Retry
          </Button>
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
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setIsImportOpen(true)}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import CSV</span>
            </Button>
            <Button variant="outline" onClick={handleExportCSV} className="gap-2">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) {
                  setFormData(createEmptyContact());
                  setSelectedTagIds([]);
                  setNewTagName("");
                  setEditingContact(null);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Contact</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] bg-popover border-border max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>
                    {editingContact ? "Edit Contact" : "Add New Contact"}
                  </DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-4 mt-4 pb-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input
                          placeholder="Contact name"
                          className="bg-input"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={formData.status}
                          onValueChange={(value: ContactStatus) =>
                            setFormData({ ...formData, status: value })
                          }
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
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          placeholder="0400 000 000"
                          className="bg-input"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          placeholder="email@example.com"
                          className="bg-input"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Source</Label>
                      <Input
                        placeholder="How did you meet?"
                        className="bg-input"
                        value={formData.source}
                        onChange={(e) =>
                          setFormData({ ...formData, source: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Pipeline Stage</Label>
                      <Input
                        placeholder="e.g. New, Contacted, Qualified..."
                        className="bg-input"
                        value={formData.pipeline_stage}
                        onChange={(e) =>
                          setFormData({ ...formData, pipeline_stage: e.target.value })
                        }
                      />
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                      <Label>Tags</Label>
                      <div className="border border-border rounded-md p-3 bg-input min-h-[100px] max-h-[150px] overflow-y-auto">
                        {tags && tags.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {tags.map((tag) => (
                              <div key={tag.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`tag-${tag.id}`}
                                  checked={selectedTagIds.includes(tag.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedTagIds((prev) => [...prev, tag.id]);
                                    } else {
                                      setSelectedTagIds((prev) => prev.filter((id) => id !== tag.id));
                                    }
                                  }}
                                />
                                <Label
                                  htmlFor={`tag-${tag.id}`}
                                  className="text-sm font-normal cursor-pointer"
                                >
                                  {tag.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No tags yet. Create one below.</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Create new tag..."
                          className="bg-input flex-1"
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleCreateTag();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCreateTag}
                          disabled={!newTagName.trim() || createTag.isPending}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Detailed Conversation Data */}
                    <div className="space-y-2">
                      <Label>Story</Label>
                      <Textarea
                        placeholder="Their story, background, situation..."
                        className="bg-input min-h-[80px]"
                        value={formData.story}
                        onChange={(e) =>
                          setFormData({ ...formData, story: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Selling Intentions</Label>
                      <Textarea
                        placeholder="What are they looking to sell? Timeline? Motivation?"
                        className="bg-input min-h-[80px]"
                        value={formData.selling_intentions}
                        onChange={(e) =>
                          setFormData({ ...formData, selling_intentions: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Current Situation Notes</Label>
                      <Textarea
                        placeholder="Current living situation, property details, timeline..."
                        className="bg-input min-h-[80px]"
                        value={formData.current_situation_notes}
                        onChange={(e) =>
                          setFormData({ ...formData, current_situation_notes: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Pain Points</Label>
                        <Textarea
                          placeholder="What problems or challenges do they face?"
                          className="bg-input min-h-[80px]"
                          value={formData.pain_points}
                          onChange={(e) =>
                            setFormData({ ...formData, pain_points: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Pleasure Points</Label>
                        <Textarea
                          placeholder="What excites them? What do they value?"
                          className="bg-input min-h-[80px]"
                          value={formData.pleasure_points}
                          onChange={(e) =>
                            setFormData({ ...formData, pleasure_points: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        placeholder="Additional notes, reminders, follow-ups..."
                        className="bg-input min-h-[80px]"
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </ScrollArea>
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveContact}
                    disabled={createContact.isPending || updateContact.isPending}
                  >
                    {createContact.isPending || updateContact.isPending
                      ? "Saving..."
                      : editingContact
                        ? "Update"
                        : "Add"}{" "}
                    Contact
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard value={stats.total} label="Total Contacts" variant="total" />
        <StatCard value={stats.hot} label="Hot Leads" variant="cancelled" />
        <StatCard value={stats.warm} label="Warm Leads" variant="planning" />
        <StatCard value={stats.cold} label="Cold Leads" variant="active" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, source, tags..."
            className="pl-10 bg-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px] bg-input">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="hot">Hot</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="cold">Cold</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-[140px] bg-input">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {distinctSources.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Tag className="w-4 h-4" />
                Tags {filterTagIds.length ? `(${filterTagIds.length})` : ""}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
              {(tags ?? []).map((t) => (
                <DropdownMenuCheckboxItem
                  key={t.id}
                  checked={filterTagIds.includes(t.id)}
                  onCheckedChange={() => toggleTagFilter(t.id)}
                >
                  {t.name}
                </DropdownMenuCheckboxItem>
              ))}
              {(!tags || tags.length === 0) && (
                <div className="px-2 py-4 text-sm text-muted-foreground">
                  No tags yet
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as SortOption)}
          >
            <SelectTrigger className="w-[150px] bg-input">
              <ArrowUpDown className="w-4 h-4 mr-1" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name A–Z</SelectItem>
              <SelectItem value="name-desc">Name Z–A</SelectItem>
              <SelectItem value="status-asc">Status A–Z</SelectItem>
              <SelectItem value="status-desc">Status Z–A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredAndSortedContacts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>
            {!contacts?.length
              ? "No contacts yet. Add your first contact!"
              : "No contacts match your search or filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAndSortedContacts.map((contact) => {
            const primaryEmail = getPrimaryEmail(contact);
            const primaryPhone = getPrimaryPhone(contact);
            const tagNames = getTagNames(contact);
            const initials = getInitials(
              contact.first_name,
              contact.last_name,
              contact.name
            );
            return (
              <div
                key={contact.id}
                className="flex flex-wrap items-center gap-4 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/contacts/${contact.id}`)}
              >
                <AvatarCircle
                  name={contact.name}
                  initials={initials}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">
                      {contact.name}
                    </span>
                    <StatusBadge variant={getStatusVariant(contact.status)}>
                      {contact.status ?? "lead"}
                    </StatusBadge>
                    {tagNames.length > 0 && (
                      <span className="flex flex-wrap gap-1">
                        {tagNames.map((t) => (
                          <Badge
                            key={t}
                            variant="secondary"
                            className="text-xs font-normal"
                          >
                            {t}
                          </Badge>
                        ))}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-muted-foreground">
                    {primaryPhone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {primaryPhone}
                      </span>
                    )}
                    {primaryEmail && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {primaryEmail}
                      </span>
                    )}
                    {contact.source && (
                      <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                        {contact.source}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className="flex gap-1 items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleOpenDialog(contact)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {contact.name}? This
                          action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteContact(contact.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CSVImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
    </div>
  );
}
