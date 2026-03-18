import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/PageHeader";
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
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
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
import { useContactsDueNow } from "@/hooks/useFollowUpReminders";
import { COMING_TO_MARKET_LABELS, type ComingToMarket } from "@/lib/followUpCadence";
import { useLogContactStatusChange } from "@/hooks/useEvents";
import { useTags, useCreateTag } from "@/hooks/useTags";
import { useAddContactTag, useRemoveContactTag } from "@/hooks/useContactTags";
import { useCreateProperty } from "@/hooks/useProperties";
import { useCreateContactPropertyLink } from "@/hooks/useContactPropertyLinks";
import { Skeleton } from "@/components/ui/skeleton";
import { CSVImportDialog } from "@/components/contacts/CSVImportDialog";
import { getInitials, cn } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/formatPhone";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ChevronDown, SlidersHorizontal, LayoutList, LayoutGrid, Columns } from "lucide-react";
import { ContactsFilterPanel } from "@/components/contacts/ContactsFilterPanel";

type ContactStatus = "hot" | "warm" | "cold" | "lead";
type SortOption =
  | "name-asc"
  | "name-desc"
  | "status-asc"
  | "status-desc"
  | "date-added-asc"
  | "date-added-desc"
  | "property-count-asc"
  | "property-count-desc";

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

export type ContactCategory = "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "gray";

const CONTACT_CATEGORIES: { value: ContactCategory; label: string; bg: string; border: string }[] = [
  { value: "red", label: "Red", bg: "bg-red-500", border: "border-red-500" },
  { value: "orange", label: "Orange", bg: "bg-orange-500", border: "border-orange-500" },
  { value: "yellow", label: "Yellow", bg: "bg-amber-400", border: "border-amber-400" },
  { value: "green", label: "Green", bg: "bg-emerald-500", border: "border-emerald-500" },
  { value: "blue", label: "Blue", bg: "bg-blue-500", border: "border-blue-500" },
  { value: "purple", label: "Purple", bg: "bg-violet-500", border: "border-violet-500" },
  { value: "pink", label: "Pink", bg: "bg-pink-500", border: "border-pink-500" },
  { value: "gray", label: "Gray", bg: "bg-slate-500", border: "border-slate-500" },
];

/** Display/filter status (DataDungeon schema) */
function getContactStatus(c: ContactWithMeta | { status?: string | null }): string {
  return c.status ?? "lead";
}

/** Display name (DataDungeon schema) */
function getContactDisplayName(c: ContactWithMeta): string {
  return c.name?.trim() || "—";
}

/** Map status to kanban column (hot, warm, cold, lead) */
function getKanbanStatus(c: ContactWithMeta): "hot" | "warm" | "cold" | "lead" {
  const s = getContactStatus(c);
  if (s === "hot" || s === "qualified" || s === "customer") return "hot";
  if (s === "warm" || s === "contacted" || s === "nurture") return "warm";
  if (s === "cold" || s === "new") return "cold";
  return "lead";
}

const createEmptyContact = () => ({
  name: "",
  phone: "",
  email: "",
  source: "",
  notes: "",
  status: "lead" as ContactStatus,
  category: "",
  coming_to_market: "",
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
  const [filterHasProperty, setFilterHasProperty] = useState<boolean | null>(null);
  const [filterLastTouched, setFilterLastTouched] = useState<string>("all");
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [filterPanelOpen, setFilterPanelOpen] = useState(true);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [actionsPopoverOpen, setActionsPopoverOpen] = useState(false);
  const [contactView, setContactView] = useState<"list" | "grid" | "kanban">("list");
  const { toast } = useToast();
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const contactsDueNow = useContactsDueNow(contacts);
  const dueForFollowUpIds = useMemo(() => new Set(contactsDueNow.map((c) => c.id)), [contactsDueNow]);

  const filteredAndSortedContacts = useMemo(() => {
    let list = (contacts ?? []) as ContactWithMeta[];
    const now = new Date();

    // Due for follow-up filter (reminder cadence: hot=weekly, warm=2w, cold=3m)
    if (filterLastTouched === "due") {
      list = list.filter((c) => dueForFollowUpIds.has(c.id));
    }

    // Debounced search
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((c) => {
        const email = getPrimaryEmail(c);
        const phone = getPrimaryPhone(c);
        const tagNames = getTagNames(c);
        return (
          (c.name ?? "").toLowerCase().includes(q) ||
          (email?.toLowerCase().includes(q)) ||
          (phone?.toLowerCase().includes(q)) ||
          (c.source?.toLowerCase().includes(q)) ||
          tagNames.some((t) => t.toLowerCase().includes(q))
        );
      });
    }
    
    // Status filter
    if (filterStatus && filterStatus !== "all") {
      list = list.filter((c) => (getContactStatus(c) === filterStatus));
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
    
    // Last touched filter (skip when already filtered by "due for follow-up")
    if (filterLastTouched !== "all" && filterLastTouched !== "due") {
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
            return daysDiff > 30 && (getKanbanStatus(c) === "hot" || getKanbanStatus(c) === "warm");
          default:
            return true;
        }
      });
    }
    
    // Sorting: derive last name from full name (last word = surname)
    const getLastNameForSort = (c: ContactWithMeta): string => {
      const name = (c.name || "").trim();
      if (!name) return "";
      const parts = name.split(/\s+/);
      return parts.length > 1 ? parts[parts.length - 1] : parts[0];
    };
    const sorted = [...list].sort((a, b) => {
      if (sortBy === "name-asc") return getLastNameForSort(a).localeCompare(getLastNameForSort(b)) || (a.name || "").localeCompare(b.name || "");
      if (sortBy === "name-desc") return getLastNameForSort(b).localeCompare(getLastNameForSort(a)) || (a.name || "").localeCompare(b.name || "");
      if (sortBy === "status-asc") {
        const sa = getContactStatus(a);
        const sb = getContactStatus(b);
        return sa.localeCompare(sb) || (a.name || "").localeCompare(b.name || "");
      }
      if (sortBy === "status-desc") {
        const sa = getContactStatus(a);
        const sb = getContactStatus(b);
        return sb.localeCompare(sa) || (a.name || "").localeCompare(b.name || "");
      }
      if (sortBy === "date-added-asc") {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return ta - tb || (a.name || "").localeCompare(b.name || "");
      }
      if (sortBy === "date-added-desc") {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta || (a.name || "").localeCompare(b.name || "");
      }
      if (sortBy === "property-count-asc") {
        const na = (a.contact_property_links ?? []).length;
        const nb = (b.contact_property_links ?? []).length;
        return na - nb || (a.name || "").localeCompare(b.name || "");
      }
      if (sortBy === "property-count-desc") {
        const na = (a.contact_property_links ?? []).length;
        const nb = (b.contact_property_links ?? []).length;
        return nb - na || (a.name || "").localeCompare(b.name || "");
      }
      const sa = getContactStatus(a);
      const sb = getContactStatus(b);
      return sb.localeCompare(sa) || (a.name || "").localeCompare(b.name || "");
    });
    return sorted;
  }, [contacts, debouncedSearch, filterStatus, filterTagIds, filterSource, filterHasProperty, filterLastTouched, sortBy]);

  // Pagination
  const paginatedContacts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedContacts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedContacts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedContacts.length / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterStatus, filterTagIds, filterSource, filterHasProperty, filterLastTouched, sortBy]);

  const hasActiveFilters =
    debouncedSearch.trim() !== "" ||
    filterStatus !== "all" ||
    filterTagIds.length > 0 ||
    filterSource !== "all" ||
    filterHasProperty !== null ||
    filterLastTouched !== "all";

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setFilterTagIds([]);
    setFilterSource("all");
    setFilterHasProperty(null);
    setFilterLastTouched("all");
    setCurrentPage(1);
  };

  const distinctSources = useMemo(() => {
    const set = new Set<string>();
    (contacts ?? []).forEach((c) => {
      if (c.source?.trim()) set.add(c.source.trim());
    });
    return Array.from(set).sort();
  }, [contacts]);

  const handleExportCSV = (selectedOnly?: boolean) => {
    const contactsList =
      selectedOnly && selectedContactIds.size > 0
        ? filteredAndSortedContacts.filter((c) => selectedContactIds.has(c.id))
        : filteredAndSortedContacts;
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
        getContactDisplayName(c),
        fallbackPhone,
        fallbackEmail,
        getContactStatus(c),
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
    hot: contacts?.filter((c) => getKanbanStatus(c) === "hot").length ?? 0,
    warm: contacts?.filter((c) => getKanbanStatus(c) === "warm").length ?? 0,
    cold: contacts?.filter((c) => getKanbanStatus(c) === "cold").length ?? 0,
  };

  const handleOpenDialog = (contact?: ContactWithMeta) => {
    if (contact) {
      setEditingContact(contact);
      setFormData({
        name: contact.name ?? getContactDisplayName(contact),
        phone: getPrimaryPhone(contact) ?? contact.phone ?? "",
        email: getPrimaryEmail(contact) ?? contact.email ?? "",
        source: contact.source ?? "",
        notes: contact.notes ?? "",
        status: (contact.status as ContactStatus) ?? "lead",
        category: (contact as { category?: string | null }).category ?? "",
        coming_to_market: (contact as { coming_to_market?: string | null }).coming_to_market ?? "",
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
        const oldStatus = getContactStatus(editingContact);
        const updated = await updateContact.mutateAsync({
          id: editingContact.id,
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          source: formData.source || null,
          notes: formData.notes || null,
          status: formData.status,
          coming_to_market: formData.coming_to_market?.trim() || null,
          pipeline_stage: formData.pipeline_stage || null,
          story: formData.story || null,
          selling_intentions: formData.selling_intentions || null,
          pain_points: formData.pain_points || null,
          pleasure_points: formData.pleasure_points || null,
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
          coming_to_market: formData.coming_to_market?.trim() || null,
          pipeline_stage: formData.pipeline_stage || null,
          story: formData.story || null,
          selling_intentions: formData.selling_intentions || null,
          pain_points: formData.pain_points || null,
          pleasure_points: formData.pleasure_points || null,
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

      // If contact has an address, create a property from it and link to this contact (owner)
      const hasAddress = Boolean(formData.address_line1?.trim());
      if (hasAddress && contactId) {
        try {
          const newProperty = await createProperty.mutateAsync({
            address_line1: formData.address_line1?.trim() || null,
            address_line2: formData.address_line2?.trim() || null,
            city: formData.city?.trim() || null,
            state: formData.state || null,
            postcode: formData.postcode?.trim() || null,
            country: formData.country || "Australia",
          });
          await createPropertyLink.mutateAsync({
            contact_id: contactId,
            property_id: newProperty.id,
            role: "owner",
            notes: "Added from contact address",
          });
          toast({ title: "Property created", description: "A property was created from the address and linked to this contact." });
        } catch (propErr) {
          console.error("Auto-create property from address:", propErr);
          toast({
            title: "Contact saved",
            description: "Contact saved, but property could not be created from address. You can link a property manually.",
            variant: "destructive",
          });
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
      case "qualified":
      case "customer":
        return "hot";
      case "contacted":
      case "nurture":
        return "warm";
      case "new":
      case "unqualified":
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

  const filterPanelProps = {
    searchQuery,
    onSearchChange: setSearchQuery,
    filterStatus,
    onFilterStatusChange: setFilterStatus,
    filterTagIds,
    onToggleTagFilter: toggleTagFilter,
    tags,
    filterSource,
    onFilterSourceChange: setFilterSource,
    distinctSources,
    filterHasProperty,
    onFilterHasPropertyChange: setFilterHasProperty,
    filterLastTouched,
    onFilterLastTouchedChange: setFilterLastTouched,
    sortBy,
    onSortChange: setSortBy,
    hasActiveFilters,
    onClearFilters: clearAllFilters,
  };

  const listGridCols = "grid-cols-[auto_1fr_auto_auto] md:grid-cols-[auto_1fr_auto_120px_1fr_100px_minmax(0,1fr)_auto]";

  const listActionButtons = (contact: ContactWithMeta) => (
    <div className="flex gap-0.5 items-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto" onClick={(e) => e.stopPropagation()}>
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={(e) => { e.stopPropagation(); handleOpenDialog(contact); }}>
        <Pencil className="w-4 h-4" />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0">
            <Trash2 className="w-4 h-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete {getContactDisplayName(contact)}? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteContact(contact.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </div>
  );

  function renderContactListRow(contact: ContactWithMeta) {
    if (!contact?.id) return null;
    const primaryEmail = getPrimaryEmail(contact);
    const primaryPhone = getPrimaryPhone(contact);
    const tagNames = getTagNames(contact);
    const linkedProperty = getLinkedPropertyAddress(contact);
    const initials = getInitials(undefined, undefined, getContactDisplayName(contact));
    return (
      <>
        <td className="w-10 py-2 px-2 md:px-3 align-middle" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedContactIds((prev) => {
              const next = new Set(prev);
              if (next.has(contact.id)) next.delete(contact.id);
              else next.add(contact.id);
              return next;
            })}
            aria-label={selectedContactIds.has(contact.id) ? "Deselect" : "Select"}
          >
            {selectedContactIds.has(contact.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </Button>
        </td>
        <td className="py-2 px-3 md:py-2 md:px-4 align-middle">
          <div className="flex items-center gap-2.5 min-w-0">
            <AvatarCircle name={getContactDisplayName(contact)} initials={initials} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {(contact as { category?: string | null }).category && CONTACT_CATEGORIES.some((c) => c.value === (contact as { category?: string | null }).category) && (
                  <span
                    className={cn("w-2.5 h-2.5 rounded-full shrink-0", CONTACT_CATEGORIES.find((c) => c.value === (contact as { category?: string | null }).category)?.bg)}
                    title={CONTACT_CATEGORIES.find((c) => c.value === (contact as { category?: string | null }).category)?.label}
                  />
                )}
                <span className="font-medium text-foreground text-sm truncate block">{getContactDisplayName(contact)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5 md:hidden text-muted-foreground text-xs">
                {primaryPhone && <span className="flex items-center gap-1 truncate"><Phone className="w-3 h-3 shrink-0" />{formatPhoneDisplay(primaryPhone)}</span>}
                {primaryEmail && <span className="truncate">{primaryEmail}</span>}
              </div>
              {tagNames.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {tagNames.slice(0, 3).map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px] font-normal py-0 px-1.5">
                      {t}
                    </Badge>
                  ))}
                  {tagNames.length > 3 && <span className="text-[10px] text-muted-foreground">+{tagNames.length - 3}</span>}
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="py-2 px-3 md:py-2 md:px-4 align-middle hidden md:table-cell">
          <StatusBadge variant={getStatusVariant(getContactStatus(contact))} className="text-xs w-fit">{getContactStatus(contact)}</StatusBadge>
        </td>
        <td className="py-2 px-3 md:py-2 md:px-4 align-middle text-muted-foreground text-sm hidden md:table-cell max-w-[120px]" title={primaryPhone ?? ""}>
          <span className="truncate block">{primaryPhone ? formatPhoneDisplay(primaryPhone) : "—"}</span>
        </td>
        <td className="py-2 px-3 md:py-2 md:px-4 align-middle text-muted-foreground text-sm hidden md:table-cell min-w-0 max-w-[200px]" title={primaryEmail ?? ""}>
          <span className="truncate block">{primaryEmail ?? "—"}</span>
        </td>
        <td className="py-2 px-3 md:py-2 md:px-4 align-middle hidden md:table-cell max-w-[100px]">
          {contact.source ? <span className="text-xs bg-secondary px-2 py-0.5 rounded truncate block" title={contact.source}>{contact.source}</span> : <span className="text-muted-foreground/60">—</span>}
        </td>
        <td className="py-2 px-3 md:py-2 md:px-4 align-middle text-muted-foreground text-sm hidden md:table-cell min-w-0" title={linkedProperty || ""}>
          <span className="truncate block">{linkedProperty || "—"}</span>
        </td>
        <td className="py-2 px-3 md:py-2 md:px-4 align-middle text-muted-foreground text-sm hidden lg:table-cell whitespace-nowrap" title={contact.updated_at ? new Date(contact.updated_at).toLocaleString() : ""}>
          {contact.updated_at ? format(new Date(contact.updated_at), "d MMM yyyy") : "—"}
        </td>
        <td className="py-2 px-3 md:py-2 md:px-4 align-middle w-[1%] whitespace-nowrap">
          {listActionButtons(contact)}
        </td>
      </>
    );
  }

  function renderContactCard(contact: ContactWithMeta, _layout: "list" | "grid" | "kanban") {
    if (!contact?.id) return null;
    const primaryEmail = getPrimaryEmail(contact);
    const primaryPhone = getPrimaryPhone(contact);
    const tagNames = getTagNames(contact);
    const linkedProperty = getLinkedPropertyAddress(contact);
    const initials = getInitials(undefined, undefined, getContactDisplayName(contact));
    const isCompact = _layout === "list" || _layout === "grid";

    const actionButtons = listActionButtons(contact);

    const cardClass =
      _layout === "kanban"
        ? "group flex flex-wrap items-center gap-2 p-2.5 rounded-lg border border-border hover:bg-accent/50 transition-all duration-200 cursor-pointer zoho-card text-sm"
        : "group flex flex-wrap items-center gap-2.5 p-3 rounded-lg border border-border hover:bg-accent/50 transition-all duration-200 cursor-pointer zoho-card";
    return (
      <div key={contact.id} className={cardClass} onClick={() => navigate(`/contacts/${contact.id}`)}>
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <AvatarCircle name={getContactDisplayName(contact)} initials={initials} size={isCompact ? "sm" : "md"} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("font-medium text-foreground", isCompact && "text-sm")}>{getContactDisplayName(contact)}</span>
              <StatusBadge variant={getStatusVariant(getContactStatus(contact))} className="text-xs">{getContactStatus(contact)}</StatusBadge>
              {tagNames.length > 0 && (
                <span className="flex flex-wrap gap-1">
                  {tagNames.map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs font-normal">
                      {t}
                    </Badge>
                  ))}
                </span>
              )}
            </div>
            <div className={cn("flex flex-wrap items-center gap-3 mt-0.5 text-muted-foreground", isCompact ? "text-xs" : "text-sm")}>
              {primaryPhone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {formatPhoneDisplay(primaryPhone)}
                </span>
              )}
              {primaryEmail && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {primaryEmail}
                </span>
              )}
              {contact.source && (
                <span className="text-xs bg-secondary px-2 py-0.5 rounded">{contact.source}</span>
              )}
            </div>
          </div>
        </div>
        {actionButtons}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Contacts"
        description="Manage your contacts and leads"
      />

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
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                          value={formData.category || "none"}
                          onValueChange={(value) =>
                            setFormData({ ...formData, category: value === "none" ? "" : value })
                          }
                        >
                          <SelectTrigger className="bg-input">
                            <SelectValue placeholder="Colour category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {CONTACT_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                <span className="flex items-center gap-2">
                                  <span className={cn("w-3 h-3 rounded-full shrink-0", cat.bg)} />
                                  {cat.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Coming to market</Label>
                        <Select
                          value={formData.coming_to_market || "none"}
                          onValueChange={(v) => setFormData({ ...formData, coming_to_market: v === "none" ? "" : v })}
                        >
                          <SelectTrigger className="bg-input">
                            <SelectValue placeholder="When are they selling?" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Not set</SelectItem>
                            {(Object.keys(COMING_TO_MARKET_LABELS) as ComingToMarket[]).map((k) => (
                              <SelectItem key={k} value={k}>{COMING_TO_MARKET_LABELS[k]}</SelectItem>
                            ))}
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <button
          type="button"
          onClick={() => setFilterStatus("all")}
          className={cn(
            "zoho-card w-full rounded-lg border p-6 text-center transition-colors hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background border-l-4 border-l-primary/60",
            filterStatus === "all" && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
          )}
        >
          <div className="text-3xl font-bold text-foreground">{stats.total}</div>
          <div className="text-sm text-muted-foreground mt-1">Total Contacts</div>
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus("hot")}
          className={cn(
            "zoho-card w-full rounded-lg border p-6 text-center transition-colors hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background border-l-4 border-l-destructive/60",
            filterStatus === "hot" && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
          )}
        >
          <div className="text-3xl font-bold text-foreground">{stats.hot}</div>
          <div className="text-sm text-muted-foreground mt-1">Hot Leads</div>
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus("warm")}
          className={cn(
            "zoho-card w-full rounded-lg border p-6 text-center transition-colors hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background border-l-4 border-l-warning/60",
            filterStatus === "warm" && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
          )}
        >
          <div className="text-3xl font-bold text-foreground">{stats.warm}</div>
          <div className="text-sm text-muted-foreground mt-1">Warm Leads</div>
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus("cold")}
          className={cn(
            "zoho-card w-full rounded-lg border p-6 text-center transition-colors hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background border-l-4 border-l-info/60",
            filterStatus === "cold" && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
          )}
        >
          <div className="text-3xl font-bold text-foreground">{stats.cold}</div>
          <div className="text-sm text-muted-foreground mt-1">Cold Leads</div>
        </button>
      </div>

      <div className="flex gap-8 mt-8">
        {/* Filter panel: collapsible on desktop, sheet on mobile */}
        <div className="hidden lg:block w-[260px] shrink-0">
          <Collapsible open={filterPanelOpen} onOpenChange={setFilterPanelOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between text-foreground/80 hover:text-foreground hover:bg-muted mb-3"
              >
                <span className="font-medium">Filter contacts by</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", filterPanelOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="rounded-lg border border-border bg-card p-4">
                <ContactsFilterPanel {...filterPanelProps} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="flex-1 min-w-0">
          {/* List toolbar: view name, total, view toggle, Create, Actions, Records per page */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4 min-w-0">
              <span className="font-semibold text-foreground truncate">My Contacts</span>
              <span className="text-sm text-muted-foreground shrink-0">
                Total records {filteredAndSortedContacts.length}
              </span>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-[180px] bg-popover border-border text-foreground hover:bg-muted">
                  <ArrowUpDown className="w-4 h-4 mr-2 shrink-0" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Last name A→Z</SelectItem>
                  <SelectItem value="name-desc">Last name Z→A</SelectItem>
                  <SelectItem value="date-added-desc">Date added (newest)</SelectItem>
                  <SelectItem value="date-added-asc">Date added (oldest)</SelectItem>
                  <SelectItem value="status-asc">Status A→Z</SelectItem>
                  <SelectItem value="status-desc">Status Z→A</SelectItem>
                  <SelectItem value="property-count-desc">Properties (most)</SelectItem>
                  <SelectItem value="property-count-asc">Properties (least)</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
                <button
                  type="button"
                  aria-label="List view"
                  onClick={() => setContactView("list")}
                  className={`rounded-md px-3 py-1.5 ${contactView === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <LayoutList className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Grid view"
                  onClick={() => setContactView("grid")}
                  className={`rounded-md px-3 py-1.5 ${contactView === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Kanban view"
                  onClick={() => setContactView("kanban")}
                  className={`rounded-md px-3 py-1.5 ${contactView === "kanban" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Columns className="h-4 w-4" />
                </button>
              </div>
              <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden gap-1.5 text-foreground border-border hover:bg-muted">
                    <SlidersHorizontal className="w-4 h-4" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] bg-card border-border text-foreground overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="text-foreground">Filter contacts by</SheetTitle>
                  </SheetHeader>
                  <div className="pt-6">
                    <ContactsFilterPanel {...filterPanelProps} />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4" />
                Create Contact
              </Button>
              <Popover open={actionsPopoverOpen} onOpenChange={setActionsPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="text-foreground border-border hover:bg-muted">
                    Actions
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-48 p-1 bg-popover border-border text-foreground">
                  <button
                    type="button"
                    className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-foreground hover:bg-muted focus:bg-muted focus:outline-none"
                    onClick={() => { setIsImportOpen(true); setActionsPopoverOpen(false); }}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import CSV
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-foreground hover:bg-muted focus:bg-muted focus:outline-none"
                    onClick={() => { handleExportCSV(); setActionsPopoverOpen(false); }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </button>
                </PopoverContent>
              </Popover>
              <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-[100px] bg-popover border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

      {/* Bulk Actions */}
      {selectedContactIds.size > 0 && (
        <div className="mb-4 p-3 zoho-card rounded-lg flex items-center justify-between">
          <span className="text-sm text-foreground">
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
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Tag className="w-4 h-4 mr-1" />
                  Add tag
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="end">
                <p className="text-xs text-muted-foreground px-2 py-1">Select a tag to add to {selectedContactIds.size} contact(s)</p>
                {tags && tags.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto space-y-0.5 mt-2">
                    {tags.map((tag) => (
                      <Button
                        key={tag.id}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start font-normal"
                        onClick={async () => {
                          const toUpdate = filteredAndSortedContacts.filter((c) => selectedContactIds.has(c.id));
                          const existingTagIds = (c: ContactWithMeta) => (c.contact_tags ?? []).map((ct) => ct.tag_id);
                          let added = 0;
                          for (const c of toUpdate) {
                            if (existingTagIds(c).includes(tag.id)) continue;
                            try {
                              await addContactTag.mutateAsync({ contact_id: c.id, tag_id: tag.id });
                              added++;
                            } catch {
                              // skip duplicate or error
                            }
                          }
                          toast({ title: "Tags added", description: `Added "${tag.name}" to ${added} contact(s)` });
                          setSelectedContactIds(new Set());
                        }}
                      >
                        {tag.name}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground px-2 py-2">No tags. Create one in a contact.</p>
                )}
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground/30 mr-1.5" />
                  Categorise
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="end">
                <p className="text-xs text-muted-foreground mb-2">Assign colour to {selectedContactIds.size} contact(s)</p>
                <div className="flex flex-wrap gap-1.5">
                  {CONTACT_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors hover:opacity-90", cat.bg, "border-transparent text-white")}
                      onClick={async () => {
                        const toUpdate = filteredAndSortedContacts.filter((c) => selectedContactIds.has(c.id));
                        try {
                          for (const c of toUpdate) {
                            await updateContact.mutateAsync({ id: c.id, status: cat.value });
                          }
                          toast({ title: "Category set", description: `Set ${toUpdate.length} contact(s) to ${cat.label}` });
                          setSelectedContactIds(new Set());
                        } catch (e: unknown) {
                          toast({ title: "Error", description: (e as Error).message || "Failed to update", variant: "destructive" });
                        }
                      }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-white/30" />
                      {cat.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/80"
                    onClick={async () => {
                      const toUpdate = filteredAndSortedContacts.filter((c) => selectedContactIds.has(c.id));
                      try {
                        for (const c of toUpdate) {
                          await updateContact.mutateAsync({ id: c.id, status: null });
                        }
                        toast({ title: "Category cleared", description: `Cleared category for ${toUpdate.length} contact(s)` });
                        setSelectedContactIds(new Set());
                      } catch (e: unknown) {
                        toast({ title: "Error", description: (e as Error).message || "Failed to update", variant: "destructive" });
                      }
                    }}
                  >
                    Clear category
                  </button>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handleExportCSV(true);
                setSelectedContactIds(new Set());
              }}
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {selectedContactIds.size} contact{selectedContactIds.size !== 1 ? "s" : ""}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. The selected contact{selectedContactIds.size !== 1 ? "s will" : " will"} be permanently removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async () => {
                      try {
                        for (const id of selectedContactIds) {
                          await deleteContact.mutateAsync(id);
                        }
                        toast({ title: "Deleted", description: `${selectedContactIds.size} contact(s) removed` });
                        setSelectedContactIds(new Set());
                      } catch (e: unknown) {
                        toast({
                          title: "Error",
                          description: (e as Error).message || "Failed to delete contacts",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-6 opacity-50" />
          <p className="mb-6 text-base">
            {!contacts?.length
              ? "No contacts yet. Add your first contact!"
              : "No contacts match your search or filters."}
          </p>
          <Button onClick={() => handleOpenDialog()} variant="default">
            <Plus className="w-4 h-4 mr-2" />
            Add contact
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            Showing {(currentPage - 1) * itemsPerPage + 1}–
            {Math.min(currentPage * itemsPerPage, filteredAndSortedContacts.length)} of{" "}
            {filteredAndSortedContacts.length} contacts
          </p>
          {contactView === "kanban" ? (
            <div className="flex gap-4 overflow-x-auto pb-2 min-h-[420px]">
              {(["hot", "warm", "cold", "lead"] as const).map((status) => {
                const columnContacts = paginatedContacts.filter((c) => getKanbanStatus(c) === status);
                return (
                  <div key={status} className="flex-shrink-0 w-[280px] rounded-lg border border-border bg-card/80 p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <StatusBadge variant={getStatusVariant(status)}>{status}</StatusBadge>
                      <span className="text-muted-foreground">({columnContacts.length})</span>
                    </h3>
                    <div className="space-y-3">
                      {columnContacts.map((contact) => renderContactCard(contact, "kanban"))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : contactView === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {paginatedContacts.map((contact) => renderContactCard(contact, "grid"))}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <th className="w-10 py-2.5 px-2 md:px-3 font-medium align-middle">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            const pageIds = new Set(paginatedContacts.map((c) => c.id));
                            const allOnPageSelected = pageIds.size > 0 && [...pageIds].every((id) => selectedContactIds.has(id));
                            setSelectedContactIds((prev) => {
                              const next = new Set(prev);
                              if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
                              else pageIds.forEach((id) => next.add(id));
                              return next;
                            });
                          }}
                          aria-label={paginatedContacts.every((c) => selectedContactIds.has(c.id)) ? "Deselect all on page" : "Select all on page"}
                        >
                          {paginatedContacts.length > 0 && paginatedContacts.every((c) => selectedContactIds.has(c.id)) ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </Button>
                      </th>
                      <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium">Name</th>
                      <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium hidden md:table-cell w-[100px]">Status</th>
                      <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium hidden md:table-cell w-[120px]">Phone</th>
                      <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium hidden md:table-cell">Email</th>
                      <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium hidden md:table-cell w-[100px]">Source</th>
                      <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium hidden md:table-cell">Property</th>
                      <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium hidden lg:table-cell w-[120px]">Last Activity</th>
                      <th className="w-[1%] py-2.5 px-3 md:py-2 md:px-4" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedContacts.map((contact) => (
                      <tr
                        key={contact.id}
                        className="group border-b border-border/60 last:border-b-0 hover:bg-muted/40 transition-colors cursor-pointer"
                        onClick={() => navigate(`/contacts/${contact.id}`)}
                      >
                        {renderContactListRow(contact)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {totalPages > 1 && contactView !== "kanban" && (
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

        </div>
      </div>

      <CSVImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
    </div>
  );
}
