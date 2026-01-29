import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ContactDetailPanel } from "@/components/contacts/ContactDetailPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { AvatarCircle } from "@/components/ui/avatar-circle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  CheckSquare,
  Square,
  Building2,
  Clock,
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
import { useLogContactStatusChange } from "@/hooks/useEvents";
import { useTags, useCreateTag } from "@/hooks/useTags";
import { useAddContactTag, useRemoveContactTag } from "@/hooks/useContactTags";
import { useCreateProperty } from "@/hooks/useProperties";
import { useCreateContactPropertyLink } from "@/hooks/useContactPropertyLinks";
import { Skeleton } from "@/components/ui/skeleton";
import { CSVImportDialog } from "@/components/contacts/CSVImportDialog";
import { getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type ContactStatus = "hot" | "warm" | "cold" | "lead";
type SortOption = "name-asc" | "name-desc" | "status-asc" | "status-desc";

const AUSTRALIAN_STATES = [
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "QLD", label: "Queensland" },
  { value: "SA", label: "South Australia" },
  { value: "WA", label: "Western Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "NT", label: "Northern Territory" },
  { value: "ACT", label: "Australian Capital Territory" },
];

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
  // Address fields
  address_line1: "",
  address_line2: "",
  city: "", // Used as suburb
  state: "",
  postcode: "",
  country: "Australia",
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
  const { logStatusChange } = useLogContactStatusChange();
  const createProperty = useCreateProperty();
  const createPropertyLink = useCreateContactPropertyLink();

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
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [filterHasProperty, setFilterHasProperty] = useState<boolean | null>(null);
  const [filterLastTouched, setFilterLastTouched] = useState<string>("all");
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const { toast } = useToast();

  const filteredAndSortedContacts = useMemo(() => {
    let list = (contacts ?? []) as ContactWithMeta[];
    const now = new Date();
    
    // Real-time search
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
    
    // Status filter
    if (filterStatus && filterStatus !== "all") {
      list = list.filter((c) => (c.status ?? "lead") === filterStatus);
    }
    
    // Tag filter
    if (filterTagIds.length > 0) {
      list = list.filter((c) => {
        const ctTagIds = (c.contact_tags ?? []).map((ct) => ct.tag_id);
        return filterTagIds.some((tid) => ctTagIds.includes(tid));
      });
    }
    
    // Source filter
    if (filterSource && filterSource !== "all") {
      list = list.filter((c) => (c.source ?? "") === filterSource);
    }
    
    // Has property filter
    if (filterHasProperty !== null) {
      list = list.filter((c) => {
        const hasProperty = (c.contact_property_links ?? []).length > 0;
        return filterHasProperty ? hasProperty : !hasProperty;
      });
    }
    
    // Last touched filter
    if (filterLastTouched !== "all") {
      list = list.filter((c) => {
        if (!c.updated_at) return false;
        const updated = new Date(c.updated_at);
        const daysDiff = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (filterLastTouched) {
          case "today":
            return daysDiff === 0;
          case "7days":
            return daysDiff <= 7;
          case "30days":
            return daysDiff <= 30;
          case "overdue":
            // Consider overdue if not touched in 30+ days and status is hot/warm
            return daysDiff > 30 && (c.status === "hot" || c.status === "warm");
          default:
            return true;
        }
      });
    }
    
    // Sorting
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
  }, [contacts, searchQuery, filterStatus, filterTagIds, filterSource, filterHasProperty, filterLastTouched, sortBy]);

  // Pagination
  const paginatedContacts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedContacts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedContacts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedContacts.length / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterTagIds, filterSource, filterHasProperty, filterLastTouched, sortBy]);

  const distinctSources = useMemo(() => {
    const set = new Set<string>();
    (contacts ?? []).forEach((c) => {
      if (c.source?.trim()) set.add(c.source.trim());
    });
    return Array.from(set).sort();
  }, [contacts]);

  const handleExportCSV = (contactsToExport?: ContactWithMeta[]) => {
    const contactsList = contactsToExport || filteredAndSortedContacts;
    if (contactsList.length === 0) {
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
    const rows = contactsList.map((c) => {
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
        // Address fields from contact
        address_line1: (contact as any).address_line1 ?? "",
        address_line2: (contact as any).address_line2 ?? "",
        city: (contact as any).city ?? "",
        state: (contact as any).state ?? "",
        postcode: (contact as any).postcode ?? "",
        country: (contact as any).country ?? "Australia",
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
        const oldStatus = editingContact.status;
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
          // Store address directly on contact
          address_line1: formData.address_line1?.trim() || null,
          address_line2: formData.address_line2?.trim() || null,
          city: formData.city?.trim() || null,
          state: formData.state || null,
          postcode: formData.postcode?.trim() || null,
          country: formData.country || "Australia",
        });
        contactId = updated.id;
        
        // Log status change event if status changed
        if (oldStatus !== formData.status) {
          try {
            await logStatusChange(contactId, oldStatus, formData.status);
          } catch (err) {
            // Don't fail the update if event logging fails
            console.error("Failed to log status change:", err);
          }
        }
        
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
          // Store address directly on contact
          address_line1: formData.address_line1?.trim() || null,
          address_line2: formData.address_line2?.trim() || null,
          city: formData.city?.trim() || null,
          state: formData.state || null,
          postcode: formData.postcode?.trim() || null,
          country: formData.country || "Australia",
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
        <div className="text-center py-12 text-white/60">
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
                  <DialogDescription className="sr-only">
                    {editingContact ? "Edit contact details and information" : "Add a new contact to your CRM"}
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 pr-4">
                  <Tabs defaultValue="basic" className="mt-4">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="basic">Basic</TabsTrigger>
                      <TabsTrigger value="address">Address</TabsTrigger>
                      <TabsTrigger value="tags">Tags</TabsTrigger>
                      <TabsTrigger value="details">Details</TabsTrigger>
                    </TabsList>
                    <TabsContent value="basic" className="space-y-4 mt-4">
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
                    </TabsContent>
                    <TabsContent value="address" className="space-y-4 mt-4">
                      <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Address Line 1</Label>
                        <Input
                          placeholder="Street address"
                          className="bg-input"
                          value={formData.address_line1}
                          onChange={(e) =>
                            setFormData({ ...formData, address_line1: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Address Line 2 (Unit/Apartment)</Label>
                        <Input
                          placeholder="Unit, apartment, etc."
                          className="bg-input"
                          value={formData.address_line2}
                          onChange={(e) =>
                            setFormData({ ...formData, address_line2: e.target.value })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Suburb</Label>
                          <Input
                            placeholder="Suburb"
                            className="bg-input"
                            value={formData.city}
                            onChange={(e) =>
                              setFormData({ ...formData, city: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>State</Label>
                          <Select
                            value={formData.state}
                            onValueChange={(value) =>
                              setFormData({ ...formData, state: value })
                            }
                          >
                            <SelectTrigger className="bg-input">
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent>
                              {AUSTRALIAN_STATES.map((state) => (
                                <SelectItem key={state.value} value={state.value}>
                                  {state.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Postcode</Label>
                          <Input
                            placeholder="2000"
                            className="bg-input"
                            value={formData.postcode}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                              setFormData({ ...formData, postcode: value });
                            }}
                            maxLength={4}
                          />
                        </div>
                      </div>
                    </div>
                    </TabsContent>
                    <TabsContent value="tags" className="space-y-4 mt-4">
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
                    </TabsContent>
                    <TabsContent value="details" className="space-y-4 mt-4">
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
                    </TabsContent>
                  </Tabs>
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
        <StatCard value={stats.total} label="Total Contacts" variant="total" className="zoho-card" />
        <StatCard value={stats.hot} label="Hot Leads" variant="cancelled" className="zoho-card" />
        <StatCard value={stats.warm} label="Warm Leads" variant="planning" className="zoho-card" />
        <StatCard value={stats.cold} label="Cold Leads" variant="active" className="zoho-card" />
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
            value={filterHasProperty === null ? "all" : filterHasProperty ? "has" : "none"}
            onValueChange={(v) => {
              if (v === "all") setFilterHasProperty(null);
              else setFilterHasProperty(v === "has");
            }}
          >
            <SelectTrigger className="w-[140px] bg-input">
              <Building2 className="w-4 h-4 mr-1" />
              <SelectValue placeholder="Property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All contacts</SelectItem>
              <SelectItem value="has">Has property</SelectItem>
              <SelectItem value="none">No property</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filterLastTouched}
            onValueChange={setFilterLastTouched}
          >
            <SelectTrigger className="w-[140px] bg-input">
              <Clock className="w-4 h-4 mr-1" />
              <SelectValue placeholder="Last touched" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="overdue">Overdue follow-up</SelectItem>
            </SelectContent>
          </Select>
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

      {/* Bulk Actions */}
      {selectedContactIds.size > 0 && (
        <div className="mb-4 p-3 zoho-card rounded-lg flex items-center justify-between">
          <span className="text-sm text-white">
            {selectedContactIds.size} contact{selectedContactIds.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <Select
              onValueChange={async (status) => {
                // Bulk status update
                try {
                  const contactsToUpdate = filteredAndSortedContacts.filter((c) =>
                    selectedContactIds.has(c.id)
                  );
                  const promises = contactsToUpdate.map(async (contact) => {
                    const oldStatus = contact.status;
                    await updateContact.mutateAsync({
                      id: contact.id,
                      status: status as ContactStatus,
                    });
                    // Log status change
                    if (oldStatus !== status) {
                      try {
                        await logStatusChange(contact.id, oldStatus, status);
                      } catch (err) {
                        console.error("Failed to log status change:", err);
                      }
                    }
                  });
                  await Promise.all(promises);
                  toast({
                    title: "Success",
                    description: `Updated ${selectedContactIds.size} contacts`,
                  });
                  setSelectedContactIds(new Set());
                } catch (error: any) {
                  toast({
                    title: "Error",
                    description: error.message || "Failed to update contacts",
                    variant: "destructive",
                  });
                }
              }}
            >
              <SelectTrigger className="w-[140px] bg-input">
                <SelectValue placeholder="Change status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hot">Set to Hot</SelectItem>
                <SelectItem value="warm">Set to Warm</SelectItem>
                <SelectItem value="cold">Set to Cold</SelectItem>
                <SelectItem value="lead">Set to Lead</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Bulk tag - would need a dialog for tag selection
                toast({ title: "Info", description: "Bulk tagging coming soon" });
              }}
            >
              <Tag className="w-4 h-4 mr-1" />
              Tag
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const selectedContacts = filteredAndSortedContacts.filter((c) =>
                  selectedContactIds.has(c.id)
                );
                handleExportCSV(selectedContacts);
                setSelectedContactIds(new Set());
              }}
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedContactIds(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {filteredAndSortedContacts.length === 0 ? (
        <div className="text-center py-12 text-white/60">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>
            {!contacts?.length
              ? "No contacts yet. Add your first contact!"
              : "No contacts match your search or filters."}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginatedContacts.map((contact) => {
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
                className="flex flex-wrap items-center gap-4 p-3 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer zoho-card"
                onClick={() => setSelectedContactId(contact.id)}
              >
                <AvatarCircle
                  name={contact.name}
                  initials={initials}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white">
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
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedContactIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(contact.id)) {
                          next.delete(contact.id);
                        } else {
                          next.add(contact.id);
                        }
                        return next;
                      });
                    }}
                  >
                    {selectedContactIds.has(contact.id) ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDialog(contact);
                    }}
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
                  <ChevronRight className="w-4 h-4 text-white/50" />
                </div>
              </div>
            );
          })}
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
      )}

      <CSVImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
      
      {/* Contact Detail Slide-over Panel */}
      <ContactDetailPanel
        contactId={selectedContactId}
        open={selectedContactId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedContactId(null);
        }}
      />
    </div>
  );
}
