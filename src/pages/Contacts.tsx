import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, isValid, parseISO } from "date-fns";
import { PageHeader } from "@/components/layout/PageHeader";
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
  MessageSquare,
  FileText,
  GitMerge,
  X,
  Tags,
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
  getContactDisplayName,
} from "@/hooks/useContacts";
import { useAnnualReviewContactStatusMap } from "@/hooks/useAnnualReviews";
import { isBirthdayWithinDays } from "@/lib/contactBirthday";
import { isAnnualReviewSchedulingCandidate } from "@/lib/annualReviewCandidates";
import { useTags, useCreateTag } from "@/hooks/useTags";
import { useAddContactTag, useRemoveContactTag } from "@/hooks/useContactTags";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { useCreatePropertyFromContactAddress } from "@/hooks/useCreatePropertyFromContactAddress";
import { Skeleton } from "@/components/ui/skeleton";
import { CSVImportDialog } from "@/components/contacts/CSVImportDialog";
import { getInitials, cn, formatContactSaveError } from "@/lib/utils";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal, LayoutList, LayoutGrid } from "lucide-react";
import { ContactsFilterPanel } from "@/components/contacts/ContactsFilterPanel";
import { BulkSmsCampaignDialog } from "@/components/contacts/BulkSmsCampaignDialog";
import { ContactScriptQuickSheet } from "@/components/contacts/ContactScriptQuickSheet";
import { MergeContactsDialog } from "@/components/contacts/MergeContactsDialog";
import { ContactRowQuickActions } from "@/components/contacts/ContactRowQuickActions";
import { SendSmsDialog } from "@/components/contacts/SendSmsDialog";
import { getDaysSinceLastTouch, getLastTouchDate } from "@/lib/contactLastTouch";
import { openLogTouch } from "@/lib/openLogTouch";
import { useCreateContactTask } from "@/hooks/useContactTasks";
import {
  CONTACT_SMART_LISTS,
  parseSmartListParam,
  isClassificationSmartList,
  type ContactClassificationKey,
  type ContactSmartListId,
} from "@/lib/contactSmartLists";
import { isContactUnreachableForAutomation } from "@/lib/contactAutomationReachability";
import { SavedViewsMenu } from "@/components/saved-views/SavedViewsMenus";
import {
  CONTACTS_SAVED_VIEW_V,
  parseContactsSavedViewPayload,
  type ContactsSavedViewPayloadV1,
} from "@/lib/savedViewPayloads";
import { useSavedViews } from "@/hooks/useSavedViews";
import { getContactsOpenDefaultSavedView } from "@/lib/savedViewsClientPrefs";

type SortOption =
  | "name-asc"
  | "name-desc"
  | "date-added-asc"
  | "date-added-desc"
  | "property-count-asc"
  | "property-count-desc";

const SORT_OPTIONS: SortOption[] = [
  "name-asc",
  "name-desc",
  "date-added-asc",
  "date-added-desc",
  "property-count-asc",
  "property-count-desc",
];

function coerceSortOption(raw: string): SortOption {
  return (SORT_OPTIONS as readonly string[]).includes(raw) ? (raw as SortOption) : "name-asc";
}

function formatOptionalIsoDate(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const d = parseISO(`${String(value).trim().slice(0, 10)}T12:00:00`);
  return isValid(d) ? format(d, "d MMM yyyy") : "—";
}

function coerceContactClassificationFilter(raw: string): "all" | ContactClassificationKey {
  if (raw === "all") return "all";
  if (isClassificationSmartList(raw as ContactSmartListId)) return raw as ContactClassificationKey;
  return "all";
}

const CONTACTS_LIST_PREFS_KEY = "datadungeon_contacts_list_prefs_v1";

type ContactsListPersistedPrefs = {
  searchQuery: string;
  filterTagIds: string[];
  filterSource: string;
  sortBy: SortOption;
  filterHasProperty: boolean | null;
  filterLastTouched: string;
  contactView: "list" | "grid";
  itemsPerPage: number;
};

function defaultContactsPrefs(): ContactsListPersistedPrefs {
  return {
    searchQuery: "",
    filterTagIds: [],
    filterSource: "all",
    sortBy: "name-asc",
    filterHasProperty: null,
    filterLastTouched: "all",
    contactView: "list",
    itemsPerPage: 25,
  };
}

function loadContactsListPrefs(): ContactsListPersistedPrefs {
  const defaults = defaultContactsPrefs();
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(CONTACTS_LIST_PREFS_KEY);
    if (!raw) return defaults;
    const p = JSON.parse(raw) as Partial<ContactsListPersistedPrefs>;
    const sortBy =
      typeof p.sortBy === "string" && SORT_OPTIONS.includes(p.sortBy as SortOption)
        ? (p.sortBy as SortOption)
        : defaults.sortBy;
    const rawView = p.contactView === "grid" || p.contactView === "list" || p.contactView === "kanban" ? p.contactView : defaults.contactView;
    const contactView = rawView === "kanban" ? "list" : rawView;
    const itemsPerPage =
      typeof p.itemsPerPage === "number" && p.itemsPerPage > 0 && p.itemsPerPage <= 200
        ? p.itemsPerPage
        : defaults.itemsPerPage;
    return {
      searchQuery: typeof p.searchQuery === "string" ? p.searchQuery : defaults.searchQuery,
      filterTagIds: Array.isArray(p.filterTagIds) ? p.filterTagIds.filter((id) => typeof id === "string") : [],
      filterSource: typeof p.filterSource === "string" ? p.filterSource : defaults.filterSource,
      sortBy,
      filterHasProperty:
        p.filterHasProperty === true || p.filterHasProperty === false ? p.filterHasProperty : null,
      filterLastTouched: typeof p.filterLastTouched === "string" ? p.filterLastTouched : defaults.filterLastTouched,
      contactView,
      itemsPerPage,
    };
  } catch {
    return defaults;
  }
}

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

export type ContactCategory = "immediate" | "priority" | "planned" | "backlog";
type ContactClassificationCategory =
  | "top_100"
  | "past_client"
  | "referral_partner"
  | "hot_lead"
  | "warm_lead"
  | "seller_nurture";

const CONTACT_CATEGORIES: { value: ContactCategory; label: string; bg: string; border: string }[] = [
  { value: "immediate", label: "Immediate", bg: "bg-red-500", border: "border-red-500" },
  { value: "priority", label: "Priority", bg: "bg-amber-500", border: "border-amber-500" },
  { value: "planned", label: "Planned", bg: "bg-sky-500", border: "border-sky-500" },
  { value: "backlog", label: "Backlog", bg: "bg-emerald-500", border: "border-emerald-500" },
];

const CONTACT_CLASSIFICATION_CATEGORIES: Array<{
  value: ContactClassificationCategory;
  label: string;
}> = [
  { value: "top_100", label: "Top 100" },
  { value: "past_client", label: "Past Client" },
  { value: "referral_partner", label: "Referral Partner" },
  { value: "hot_lead", label: "Hot Lead" },
  { value: "warm_lead", label: "Warm Lead" },
  { value: "seller_nurture", label: "Seller Nurture" },
];

function normalizeLegacyCategory(value: string | null | undefined): ContactCategory | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (raw === "immediate" || raw === "priority" || raw === "planned" || raw === "backlog") {
    return raw as ContactCategory;
  }
  const legacyMap: Record<string, ContactCategory> = {
    red: "immediate",
    orange: "priority",
    yellow: "priority",
    green: "planned",
    blue: "planned",
    purple: "backlog",
    pink: "backlog",
    gray: "backlog",
  };
  return legacyMap[raw] ?? null;
}

function normalizeContactClassificationCategory(
  value: string | null | undefined,
): ContactClassificationCategory {
  const raw = String(value ?? "").trim().toLowerCase();
  if (
    raw === "top_100" ||
    raw === "past_client" ||
    raw === "referral_partner" ||
    raw === "hot_lead" ||
    raw === "warm_lead" ||
    raw === "seller_nurture"
  ) {
    return raw as ContactClassificationCategory;
  }
  return "warm_lead";
}

function getCategoryLabel(c: ContactWithMeta | { category?: string | null }): string {
  const cat = normalizeLegacyCategory((c as { category?: string | null }).category);
  if (!cat) return "—";
  const found = CONTACT_CATEGORIES.find((x) => x.value === cat);
  return found?.label ?? cat;
}

function normalizeLeadTemperature(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

function deriveCategoryFromClassification(contact: ContactWithMeta): ContactCategory | null {
  const temperature = normalizeLeadTemperature(contact.lead_temperature);
  if (temperature.includes("hot")) return "immediate";
  if (temperature.includes("warm")) return "priority";
  if (temperature.includes("cold")) return "planned";
  if (temperature.includes("archived")) return "backlog";
  if (temperature.includes("lead")) return "priority";

  const timeframe = String(contact.timeframe_category ?? "").toLowerCase();
  if (timeframe.includes("0_3") || timeframe.includes("0-3")) return "immediate";
  if (timeframe.includes("3_6") || timeframe.includes("3-6")) return "priority";
  if (timeframe.includes("6_12") || timeframe.includes("6-12")) return "planned";
  if (timeframe.includes("12_24") || timeframe.includes("12-24")) return "backlog";
  if (timeframe.includes("24")) return "backlog";
  return null;
}

function getEffectiveCategory(contact: ContactWithMeta): ContactCategory | null {
  const explicit = normalizeLegacyCategory((contact as { category?: string | null }).category);
  if (explicit && CONTACT_CATEGORIES.some((c) => c.value === explicit)) {
    return explicit;
  }
  return deriveCategoryFromClassification(contact);
}

function getTouchBadgeClasses(daysSinceTouch: number | null): string {
  if (daysSinceTouch == null) return "bg-muted text-muted-foreground";
  if (daysSinceTouch >= 30) return "bg-destructive/15 text-destructive border border-destructive/30";
  if (daysSinceTouch >= 14) return "bg-amber-500/15 text-amber-600 border border-amber-500/30";
  return "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30";
}

function formatLastTouchLabel(daysSinceTouch: number | null): string {
  if (daysSinceTouch == null) return "Last touch: not yet";
  if (daysSinceTouch <= 0) return "Last touch: today";
  if (daysSinceTouch === 1) return "Last touch: 1 day ago";
  return `Last touch: ${daysSinceTouch} days ago`;
}

const createEmptyContact = () => ({
  name: "",
  phone: "",
  email: "",
  source: "",
  notes: "",
  date_of_birth: "",
  contact_category: "warm_lead" as ContactClassificationCategory,
  category: "",
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

type ContactFormState = ReturnType<typeof createEmptyContact>;

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildNormalizedFormData(formData: ContactFormState): Record<string, string | null> {
  return {
    name: normalizeOptionalText(formData.name),
    phone: normalizeOptionalText(formData.phone),
    email: normalizeOptionalText(formData.email),
    source: normalizeOptionalText(formData.source),
    notes: normalizeOptionalText(formData.notes),
    contact_category: normalizeContactClassificationCategory(formData.contact_category),
    category: normalizeLegacyCategory(formData.category) ?? null,
    pipeline_stage: normalizeOptionalText(formData.pipeline_stage),
    story: normalizeOptionalText(formData.story),
    selling_intentions: normalizeOptionalText(formData.selling_intentions),
    pain_points: normalizeOptionalText(formData.pain_points),
    pleasure_points: normalizeOptionalText(formData.pleasure_points),
    current_situation_notes: normalizeOptionalText(formData.current_situation_notes),
    address_line1: normalizeOptionalText(formData.address_line1),
    address_line2: normalizeOptionalText(formData.address_line2),
    city: normalizeOptionalText(formData.city),
    state: normalizeOptionalText(formData.state),
    postcode: normalizeOptionalText(formData.postcode),
    country: normalizeOptionalText(formData.country) ?? "Australia",
    date_of_birth: normalizeOptionalText((formData as { date_of_birth?: string }).date_of_birth),
  };
}

function buildNormalizedExistingContact(contact: ContactWithMeta): Record<string, string | null> {
  return {
    name: normalizeOptionalText(contact.name ?? getContactDisplayName(contact)),
    phone: normalizeOptionalText(getPrimaryPhone(contact) ?? contact.phone),
    email: normalizeOptionalText(getPrimaryEmail(contact) ?? contact.email),
    source: normalizeOptionalText(contact.source),
    notes: normalizeOptionalText(contact.notes),
    contact_category: normalizeContactClassificationCategory(
      (contact as { contact_category?: string | null }).contact_category,
    ),
    category: normalizeLegacyCategory((contact as { category?: string | null }).category) ?? null,
    pipeline_stage: normalizeOptionalText(contact.pipeline_stage),
    story: normalizeOptionalText(contact.story),
    selling_intentions: normalizeOptionalText(contact.selling_intentions),
    pain_points: normalizeOptionalText(contact.pain_points),
    pleasure_points: normalizeOptionalText(contact.pleasure_points),
    current_situation_notes: normalizeOptionalText(contact.current_situation_notes),
    address_line1: normalizeOptionalText((contact as { address_line1?: string | null }).address_line1),
    address_line2: normalizeOptionalText((contact as { address_line2?: string | null }).address_line2),
    city: normalizeOptionalText((contact as { city?: string | null }).city),
    state: normalizeOptionalText((contact as { state?: string | null }).state),
    postcode: normalizeOptionalText((contact as { postcode?: string | null }).postcode),
    country: normalizeOptionalText((contact as { country?: string | null }).country) ?? "Australia",
    date_of_birth: normalizeOptionalText((contact as { date_of_birth?: string | null }).date_of_birth),
  };
}

export default function Contacts() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const smartParam = searchParams.get("smart");
  const { data: contacts, isLoading, isError, refetch } = useContacts();
  const reviewYear = new Date().getFullYear();
  const { data: reviewStatusByContact = new Map<string, string>() } =
    useAnnualReviewContactStatusMap(reviewYear);
  const { data: tags } = useTags();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const createContactTask = useCreateContactTask();
  const createTag = useCreateTag();
  const addContactTag = useAddContactTag();
  const removeContactTag = useRemoveContactTag();
  const createFromAddress = useCreatePropertyFromContactAddress();

  const initialPrefs = useMemo(() => loadContactsListPrefs(), []);

  const [searchQuery, setSearchQuery] = useState(initialPrefs.searchQuery);
  const [filterTagIds, setFilterTagIds] = useState<string[]>(initialPrefs.filterTagIds);
  const [filterSource, setFilterSource] = useState<string>(initialPrefs.filterSource);
  const [sortBy, setSortBy] = useState<SortOption>(initialPrefs.sortBy);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactWithMeta | null>(null);
  const [formData, setFormData] = useState(createEmptyContact());
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [filterHasProperty, setFilterHasProperty] = useState<boolean | null>(initialPrefs.filterHasProperty);
  const [filterLastTouched, setFilterLastTouched] = useState<string>(initialPrefs.filterLastTouched);
  const [filterContactClassification, setFilterContactClassification] = useState<"all" | ContactClassificationKey>("all");
  const [filterNoNextTouch, setFilterNoNextTouch] = useState(false);
  const [filterAutomationBlocked, setFilterAutomationBlocked] = useState(false);
  const [filterBirthdaysUpcoming, setFilterBirthdaysUpcoming] = useState(false);
  const [filterAnnualReviewCandidates, setFilterAnnualReviewCandidates] = useState(false);
  const [filterLeadTemperature, setFilterLeadTemperature] = useState("all");
  const [filterTimeframeCategory, setFilterTimeframeCategory] = useState("all");
  const [filterRoleCategory, setFilterRoleCategory] = useState("all");
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [bulkSmsOpen, setBulkSmsOpen] = useState(false);
  const [quickTaskOpen, setQuickTaskOpen] = useState(false);
  const [quickTaskContact, setQuickTaskContact] = useState<ContactWithMeta | null>(null);
  const [quickTaskTitle, setQuickTaskTitle] = useState("Follow up");
  const [quickSmsOpen, setQuickSmsOpen] = useState(false);
  const [quickSmsContact, setQuickSmsContact] = useState<ContactWithMeta | null>(null);
  const [quickSmsTo, setQuickSmsTo] = useState("");
  const [scriptQuickContact, setScriptQuickContact] = useState<{ id: string; category: string | null } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialPrefs.itemsPerPage);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [actionsPopoverOpen, setActionsPopoverOpen] = useState(false);
  const [contactView, setContactView] = useState<"list" | "grid">(
    initialPrefs.contactView === "kanban" ? "list" : initialPrefs.contactView
  );
  const { toast } = useToast();
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const prevSmartUrlRef = useRef<string | null | undefined>(undefined);
  const suppressSmartSyncRef = useRef(false);
  const toolbarControlsRef = useRef<HTMLDivElement | null>(null);
  const [showToolbarLeftFade, setShowToolbarLeftFade] = useState(false);
  const [showToolbarRightFade, setShowToolbarRightFade] = useState(false);

  const buildContactsSavedViewPayload = useCallback((): ContactsSavedViewPayloadV1 => {
    return {
      v: CONTACTS_SAVED_VIEW_V,
      smart: searchParams.get("smart"),
      searchQuery,
      filterTagIds: [...filterTagIds],
      filterSource,
      sortBy,
      filterHasProperty,
      filterLastTouched,
      filterLeadTemperature,
      filterTimeframeCategory,
      filterRoleCategory,
      filterContactClassification,
      filterNoNextTouch,
      filterAutomationBlocked,
      filterBirthdaysUpcoming,
      filterAnnualReviewCandidates,
      contactView,
      itemsPerPage,
    };
  }, [
    searchParams,
    searchQuery,
    filterTagIds,
    filterSource,
    sortBy,
    filterHasProperty,
    filterLastTouched,
    filterLeadTemperature,
    filterTimeframeCategory,
    filterRoleCategory,
    filterContactClassification,
    filterNoNextTouch,
    filterAutomationBlocked,
    filterBirthdaysUpcoming,
    filterAnnualReviewCandidates,
    contactView,
    itemsPerPage,
  ]);

  const applyContactsSavedViewPayload = useCallback(
    (p: ContactsSavedViewPayloadV1) => {
      suppressSmartSyncRef.current = true;
      if (p.smart) setSearchParams({ smart: p.smart }, { replace: true });
      else setSearchParams({}, { replace: true });
      setSearchQuery(p.searchQuery);
      setFilterTagIds([...p.filterTagIds]);
      setFilterSource(p.filterSource);
      setSortBy(coerceSortOption(p.sortBy));
      setFilterHasProperty(p.filterHasProperty);
      setFilterLastTouched(p.filterLastTouched);
      setFilterLeadTemperature(p.filterLeadTemperature);
      setFilterTimeframeCategory(p.filterTimeframeCategory);
      setFilterRoleCategory(p.filterRoleCategory);
      setFilterContactClassification(coerceContactClassificationFilter(p.filterContactClassification));
      setFilterNoNextTouch(p.filterNoNextTouch);
      setFilterAutomationBlocked(p.filterAutomationBlocked);
      setFilterBirthdaysUpcoming(p.filterBirthdaysUpcoming);
      setFilterAnnualReviewCandidates(p.filterAnnualReviewCandidates);
      setContactView(p.contactView);
      setItemsPerPage(p.itemsPerPage);
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (suppressSmartSyncRef.current) {
      suppressSmartSyncRef.current = false;
      prevSmartUrlRef.current = smartParam ?? null;
      return;
    }

    const prev = prevSmartUrlRef.current;
    const s = parseSmartListParam(smartParam);

    if (s == null) {
      // Leaving ?smart=… for plain /contacts (or clearing the param) must drop URL-driven smart filters,
      // without clobbering list prefs on first paint when the URL never had smart=.
      if (prev !== undefined && prev !== null && smartParam == null) {
        setFilterContactClassification("all");
        setFilterNoNextTouch(false);
        setFilterLastTouched("all");
        setFilterAutomationBlocked(false);
        setFilterBirthdaysUpcoming(false);
        setFilterAnnualReviewCandidates(false);
      }
      prevSmartUrlRef.current = smartParam ?? null;
      return;
    }

    prevSmartUrlRef.current = smartParam;

    if (s === "all") {
      setFilterContactClassification("all");
      setFilterNoNextTouch(false);
      setFilterLastTouched("all");
      setFilterAutomationBlocked(false);
      setFilterBirthdaysUpcoming(false);
      setFilterAnnualReviewCandidates(false);
      return;
    }
    if (isClassificationSmartList(s)) {
      setFilterContactClassification(s);
      setFilterNoNextTouch(false);
      setFilterLastTouched("all");
      setFilterAutomationBlocked(false);
      setFilterBirthdaysUpcoming(false);
      setFilterAnnualReviewCandidates(false);
      return;
    }
    if (s === "stale") {
      setFilterContactClassification("all");
      setFilterNoNextTouch(false);
      setFilterLastTouched("stale");
      setFilterAutomationBlocked(false);
      setFilterBirthdaysUpcoming(false);
      setFilterAnnualReviewCandidates(false);
      return;
    }
    if (s === "no_next_touch") {
      setFilterContactClassification("all");
      setFilterNoNextTouch(true);
      setFilterLastTouched("all");
      setFilterAutomationBlocked(false);
      setFilterBirthdaysUpcoming(false);
      setFilterAnnualReviewCandidates(false);
      return;
    }
    if (s === "automation_blocked") {
      setFilterContactClassification("all");
      setFilterNoNextTouch(false);
      setFilterLastTouched("all");
      setFilterAutomationBlocked(true);
      setFilterBirthdaysUpcoming(false);
      setFilterAnnualReviewCandidates(false);
      return;
    }
    if (s === "birthdays_upcoming") {
      setFilterContactClassification("all");
      setFilterNoNextTouch(false);
      setFilterLastTouched("all");
      setFilterAutomationBlocked(false);
      setFilterBirthdaysUpcoming(true);
      setFilterAnnualReviewCandidates(false);
      return;
    }
    if (s === "annual_review_candidates") {
      setFilterContactClassification("all");
      setFilterNoNextTouch(false);
      setFilterLastTouched("all");
      setFilterAutomationBlocked(false);
      setFilterBirthdaysUpcoming(false);
      setFilterAnnualReviewCandidates(true);
    }
  }, [smartParam]);

  const { data: savedViewsList = [], isSuccess: savedViewsReady } = useSavedViews("contacts");
  const defaultSavedViewAppliedRef = useRef(false);

  useEffect(() => {
    if (!savedViewsReady || defaultSavedViewAppliedRef.current) return;
    if (!getContactsOpenDefaultSavedView()) return;
    if (searchParams.get("smart")) return;
    const row = savedViewsList.find((v) => v.is_default);
    if (!row) return;
    const p = parseContactsSavedViewPayload(row.filters);
    if (!p) return;
    defaultSavedViewAppliedRef.current = true;
    applyContactsSavedViewPayload(p);
  }, [savedViewsReady, savedViewsList, searchParams, applyContactsSavedViewPayload]);

  useEffect(() => {
    const el = toolbarControlsRef.current;
    if (!el) return;

    const updateFadeVisibility = () => {
      const maxScrollLeft = el.scrollWidth - el.clientWidth;
      const isScrollable = maxScrollLeft > 2;
      setShowToolbarLeftFade(isScrollable && el.scrollLeft > 2);
      setShowToolbarRightFade(isScrollable && el.scrollLeft < maxScrollLeft - 2);
    };

    updateFadeVisibility();

    el.addEventListener("scroll", updateFadeVisibility, { passive: true });
    window.addEventListener("resize", updateFadeVisibility);

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(updateFadeVisibility)
      : null;
    resizeObserver?.observe(el);

    return () => {
      el.removeEventListener("scroll", updateFadeVisibility);
      window.removeEventListener("resize", updateFadeVisibility);
      resizeObserver?.disconnect();
    };
  }, [
    itemsPerPage,
    contactView,
    debouncedSearch,
    filterTagIds.length,
    filterSource,
    filterHasProperty,
    filterLastTouched,
    filterLeadTemperature,
    filterTimeframeCategory,
    filterRoleCategory,
    filterContactClassification,
    filterNoNextTouch,
    filterAutomationBlocked,
    filterBirthdaysUpcoming,
    filterAnnualReviewCandidates,
  ]);

  useEffect(() => {
    const prefs: ContactsListPersistedPrefs = {
      searchQuery,
      filterTagIds,
      filterSource,
      sortBy,
      filterHasProperty,
      filterLastTouched,
      contactView,
      itemsPerPage,
    };
    try {
      localStorage.setItem(CONTACTS_LIST_PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // ignore quota / private mode
    }
  }, [
    searchQuery,
    filterTagIds,
    filterSource,
    sortBy,
    filterHasProperty,
    filterLastTouched,
    contactView,
    itemsPerPage,
  ]);

  const filteredAndSortedContacts = useMemo(() => {
    let list = (contacts ?? []) as ContactWithMeta[];

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
    
    if (filterLastTouched !== "all") {
      list = list.filter((c) => {
        const daysDiff = getDaysSinceLastTouch(c);
        if (daysDiff == null) return false;

        switch (filterLastTouched) {
          case "today":
            return daysDiff === 0;
          case "7days":
            return daysDiff <= 7;
          case "30days":
            return daysDiff <= 30;
          case "stale":
            return daysDiff > 30;
          default:
            return true;
        }
      });
    }

    if (filterLeadTemperature !== "all") {
      list = list.filter((c) => (c.lead_temperature ?? "") === filterLeadTemperature);
    }
    if (filterTimeframeCategory !== "all") {
      list = list.filter((c) => (c.timeframe_category ?? "") === filterTimeframeCategory);
    }
    if (filterRoleCategory !== "all") {
      list = list.filter((c) => (c.role_category ?? "") === filterRoleCategory);
    }

    if (filterContactClassification !== "all") {
      list = list.filter(
        (c) =>
          normalizeContactClassificationCategory(
            (c as { contact_category?: string | null }).contact_category,
          ) === filterContactClassification,
      );
    }

    if (filterNoNextTouch) {
      list = list.filter((c) => !(c as { next_touch_date?: string | null }).next_touch_date);
    }

    if (filterAutomationBlocked) {
      list = list.filter((c) => isContactUnreachableForAutomation(c));
    }

    if (filterBirthdaysUpcoming) {
      list = list.filter((c) => isBirthdayWithinDays(c as { date_of_birth?: string | null }, 30));
    }

    if (filterAnnualReviewCandidates) {
      list = list.filter((c) =>
        isAnnualReviewSchedulingCandidate(
          (c as { contact_category?: string | null }).contact_category,
          reviewStatusByContact.get(c.id),
        ),
      );
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
      return getLastNameForSort(a).localeCompare(getLastNameForSort(b)) || (a.name || "").localeCompare(b.name || "");
    });
    return sorted;
  }, [
    contacts,
    debouncedSearch,
    filterTagIds,
    filterSource,
    filterHasProperty,
    filterLastTouched,
    filterLeadTemperature,
    filterTimeframeCategory,
    filterRoleCategory,
    filterContactClassification,
    filterNoNextTouch,
    filterAutomationBlocked,
    filterBirthdaysUpcoming,
    filterAnnualReviewCandidates,
    reviewStatusByContact,
    sortBy,
  ]);

  // Pagination
  const paginatedContacts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedContacts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedContacts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedContacts.length / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearch,
    filterTagIds,
    filterSource,
    filterHasProperty,
    filterLastTouched,
    filterLeadTemperature,
    filterTimeframeCategory,
    filterRoleCategory,
    filterContactClassification,
    filterNoNextTouch,
    filterAutomationBlocked,
    filterBirthdaysUpcoming,
    filterAnnualReviewCandidates,
    sortBy,
  ]);

  const hasActiveFilters =
    debouncedSearch.trim() !== "" ||
    filterTagIds.length > 0 ||
    filterSource !== "all" ||
    filterHasProperty !== null ||
    filterLastTouched !== "all" ||
    filterLeadTemperature !== "all" ||
    filterTimeframeCategory !== "all" ||
    filterRoleCategory !== "all" ||
    filterContactClassification !== "all" ||
    filterNoNextTouch ||
    filterAutomationBlocked ||
    filterBirthdaysUpcoming ||
    filterAnnualReviewCandidates;

  const clearSmartListParam = () => setSearchParams({}, { replace: true });

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterTagIds([]);
    setFilterSource("all");
    setFilterHasProperty(null);
    setFilterLastTouched("all");
    setFilterLeadTemperature("all");
    setFilterTimeframeCategory("all");
    setFilterRoleCategory("all");
    setFilterContactClassification("all");
    setFilterNoNextTouch(false);
    setFilterAutomationBlocked(false);
    clearSmartListParam();
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
      "Category",
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
        getCategoryLabel(c),
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
        contact_category: normalizeContactClassificationCategory(
          (contact as { contact_category?: string | null }).contact_category,
        ),
        category: normalizeLegacyCategory((contact as { category?: string | null }).category) ?? "",
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
        date_of_birth: String((contact as { date_of_birth?: string | null }).date_of_birth ?? "").slice(0, 10),
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
    if (!editingContact) {
      const hasPhone = Boolean(formData.phone?.trim());
      const hasEmail = Boolean(formData.email?.trim());
      if (!hasPhone && !hasEmail) {
        toast({
          title: "Error",
          description: "Please add at least a phone or an email for new contacts.",
          variant: "destructive",
        });
        return;
      }
      if (!formData.source?.trim()) {
        toast({
          title: "Error",
          description: "Please set a source for new contacts.",
          variant: "destructive",
        });
        return;
      }
    }
    try {
      let contactId: string;
      if (editingContact) {
        const nextValues = buildNormalizedFormData(formData);
        const previousValues = buildNormalizedExistingContact(editingContact);
        const changedPayload = Object.fromEntries(
          Object.entries(nextValues).filter(([key, value]) => value !== previousValues[key]),
        ) as Record<string, string | null>;
        const changedKeys = Object.keys(changedPayload);
        const isCategoryOnlyUpdate = changedKeys.length === 1 && changedKeys[0] === "category";
        if (changedKeys.length > 0) {
          const updated = await updateContact.mutateAsync({
            id: editingContact.id,
            ...changedPayload,
            ...(isCategoryOnlyUpdate ? { skipActivityLog: true } : {}),
          });
          contactId = updated.id;
        } else {
          contactId = editingContact.id;
        }
        toast({ title: "Success", description: "Contact updated!" });
      } else {
        const created = await createContact.mutateAsync({
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          source: formData.source || null,
          notes: formData.notes || null,
          contact_category: normalizeContactClassificationCategory(formData.contact_category),
          status: "lead",
          category: formData.category?.trim() || null,
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
          date_of_birth: (formData as { date_of_birth?: string }).date_of_birth?.trim()
            ? (formData as { date_of_birth: string }).date_of_birth.trim()
            : null,
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

      // Auto-create property only for brand-new contacts with an address.
      // Editing an existing contact (e.g. urgency/category updates) should not create properties.
      const hasAddress = Boolean(formData.address_line1?.trim());
      const shouldAutoCreateProperty = !editingContact && hasAddress && contactId;
      if (shouldAutoCreateProperty) {
        try {
          await createFromAddress.createAndLink({
            contact_id: contactId,
            address: {
              address_line1: formData.address_line1?.trim() || null,
              address_line2: formData.address_line2?.trim() || null,
              city: formData.city?.trim() || null,
              state: formData.state || null,
              postcode: formData.postcode?.trim() || null,
              country: formData.country || "Australia",
            },
            role: "owner",
            notes: "Added from contact address",
          });
          toast({ title: "Property created", description: "A property was created from the address and linked to this contact." });
        } catch (propErr) {
          console.error("Auto-create property from address:", propErr);
          const msg =
            propErr instanceof Error
              ? propErr.message
              : typeof (propErr as { message?: unknown } | undefined)?.message === "string"
                ? ((propErr as { message?: string }).message ?? "")
                : String(propErr);
          toast({
            title: "Contact saved",
            description:
              msg?.trim() ||
              "Contact saved, but property could not be created from address. You can link a property manually.",
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
        description: formatContactSaveError(e),
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

  const handleBulkDeleteContacts = async () => {
    const ids = [...selectedContactIds];
    if (ids.length === 0) return;
    try {
      for (const id of ids) {
        await deleteContact.mutateAsync(id);
      }
      toast({ title: "Deleted", description: `${ids.length} contact(s) removed` });
      setSelectedContactIds(new Set());
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: (e as Error).message || "Failed to delete contacts",
        variant: "destructive",
      });
    }
  };

  const autoCategoriseContacts = async (targetContacts: ContactWithMeta[]) => {
    const updates = targetContacts
      .map((contact) => {
        const category = deriveCategoryFromClassification(contact);
        if (!category) return null;
        return { id: contact.id, category };
      })
      .filter((row): row is { id: string; category: ContactCategory } => !!row);

    if (updates.length === 0) {
      toast({ title: "No changes", description: "No matching classification data to derive categories." });
      return;
    }

    const results = await Promise.allSettled(
      updates.map((row) => updateContact.mutateAsync({ id: row.id, category: row.category, skipActivityLog: true }))
    );
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - succeeded;

    if (succeeded > 0) {
      toast({
        title: "Urgency updated",
        description: failed > 0 ? `${succeeded} updated, ${failed} failed.` : `${succeeded} contact(s) auto-categorised.`,
      });
    } else {
      toast({ title: "Error", description: "Could not auto-categorise contacts.", variant: "destructive" });
    }
  };

  const toggleTagFilter = (tagId: string) => {
    setFilterTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Contacts" />
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
        <PageHeader title="Contacts" />
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
    onSearchChange: (v: string) => {
      setSearchQuery(v);
      clearSmartListParam();
    },
    filterTagIds,
    onToggleTagFilter: (id: string) => {
      toggleTagFilter(id);
      clearSmartListParam();
    },
    tags,
    filterSource,
    onFilterSourceChange: (v: string) => {
      setFilterSource(v);
      clearSmartListParam();
    },
    distinctSources,
    filterHasProperty,
    onFilterHasPropertyChange: (v: boolean | null) => {
      setFilterHasProperty(v);
      clearSmartListParam();
    },
    filterLastTouched,
    onFilterLastTouchedChange: (v: string) => {
      setFilterLastTouched(v);
      clearSmartListParam();
    },
    sortBy,
    onSortChange: setSortBy,
    filterLeadTemperature,
    onFilterLeadTemperatureChange: (v: string) => {
      setFilterLeadTemperature(v);
      clearSmartListParam();
    },
    filterTimeframeCategory,
    onFilterTimeframeCategoryChange: (v: string) => {
      setFilterTimeframeCategory(v);
      clearSmartListParam();
    },
    filterRoleCategory,
    onFilterRoleCategoryChange: (v: string) => {
      setFilterRoleCategory(v);
      clearSmartListParam();
    },
    filterContactClassification,
    onFilterContactClassificationChange: (v: string) => {
      setFilterContactClassification(v === "all" ? "all" : (v as ContactClassificationKey));
      setFilterNoNextTouch(false);
      clearSmartListParam();
    },
    hasActiveFilters,
    onClearFilters: clearAllFilters,
  };

  const listGridCols = "grid-cols-[auto_1fr_auto_auto] md:grid-cols-[auto_1fr_auto_120px_1fr_100px_minmax(0,1fr)_auto]";

  const listActionButtons = (contact: ContactWithMeta) => (
    <div className="flex gap-0.5 items-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto" onClick={(e) => e.stopPropagation()}>
      <ContactRowQuickActions
        contact={contact}
        onEdit={() => handleOpenDialog(contact)}
        onScripts={() =>
          setScriptQuickContact({
            id: contact.id,
            category: (contact as { contact_category?: string | null }).contact_category ?? null,
          })
        }
        onDelete={() => handleDeleteContact(contact.id)}
      />
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </div>
  );

  const handleCreateQuickTask = () => {
    if (!quickTaskContact) return;
    const title = quickTaskTitle.trim();
    if (!title) {
      toast({ title: "Task title required", description: "Enter a task title before saving.", variant: "destructive" });
      return;
    }
    createContactTask.mutate(
      { contact_id: quickTaskContact.id, title },
      {
        onSuccess: () => {
          toast({ title: "Task created", description: `Added for ${getContactDisplayName(quickTaskContact)}.` });
          setQuickTaskOpen(false);
          setQuickTaskContact(null);
          setQuickTaskTitle("Follow up");
        },
        onError: (error) => {
          toast({
            title: "Could not create task",
            description: error instanceof Error ? error.message : "Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  function renderContactListRow(contact: ContactWithMeta) {
    if (!contact?.id) return null;
    const primaryEmail = getPrimaryEmail(contact);
    const primaryPhone = getPrimaryPhone(contact);
    const tagNames = getTagNames(contact);
    const linkedProperty = getLinkedPropertyAddress(contact);
    const effectiveCategory = getEffectiveCategory(contact);
    const lastTouch = getLastTouchDate(contact);
    const daysSinceTouch = getDaysSinceLastTouch(contact);
    const nextTouchRaw = (contact as { next_touch_date?: string | null }).next_touch_date;
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
                {effectiveCategory && (
                  <span
                    className={cn("w-2.5 h-2.5 rounded-full shrink-0", CONTACT_CATEGORIES.find((c) => c.value === effectiveCategory)?.bg)}
                    title={CONTACT_CATEGORIES.find((c) => c.value === effectiveCategory)?.label}
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
          <span className="text-xs text-foreground">
            {effectiveCategory ? getCategoryLabel({ category: effectiveCategory }) : "—"}
          </span>
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
        <td className="py-2 px-3 md:py-2 md:px-4 align-middle text-muted-foreground text-sm hidden lg:table-cell whitespace-nowrap" title={lastTouch ? lastTouch.toLocaleString() : ""}>
          {lastTouch ? format(lastTouch, "d MMM yyyy") : "—"}
        </td>
        <td className="py-2 px-3 md:py-2 md:px-4 align-middle hidden xl:table-cell">
          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums", getTouchBadgeClasses(daysSinceTouch))}>
            {daysSinceTouch == null ? "—" : `${daysSinceTouch}d`}
          </span>
        </td>
        <td className="py-2 px-3 md:py-2 md:px-4 align-middle text-muted-foreground text-sm hidden xl:table-cell tabular-nums w-[72px]">
          {contact.lead_score != null ? contact.lead_score : "—"}
        </td>
        <td className="py-2 px-3 md:py-2 md:px-4 align-middle text-muted-foreground text-sm hidden xl:table-cell whitespace-nowrap" title={nextTouchRaw ?? ""}>
          {formatOptionalIsoDate(nextTouchRaw)}
        </td>
        <td className="py-2 px-3 md:py-2 md:px-4 align-middle text-muted-foreground text-sm hidden xl:table-cell tabular-nums w-[56px]" title="Active CRM workflow enrollments">
          {(contact.active_crm_workflow_count ?? 0) > 0 ? contact.active_crm_workflow_count : "—"}
        </td>
        <td className="py-2 px-3 md:py-2 md:px-4 align-middle w-[1%] whitespace-nowrap">
          {listActionButtons(contact)}
        </td>
      </>
    );
  }

  function renderContactCard(contact: ContactWithMeta, _layout: "list" | "grid") {
    if (!contact?.id) return null;
    const primaryPhone = getPrimaryPhone(contact);
    const tagNames = getTagNames(contact);
    const effectiveCategory = getEffectiveCategory(contact);
    const daysSinceTouch = getDaysSinceLastTouch(contact);
    const displayName = getContactDisplayName(contact);
    const initials = getInitials(undefined, undefined, getContactDisplayName(contact));
    const sourceLabel = String(contact.source ?? "").trim();
    const nextTouchRaw = (contact as { next_touch_date?: string | null }).next_touch_date;
    const nextTouch = nextTouchRaw ? new Date(nextTouchRaw) : null;
    const now = new Date();
    const isOverdueByNextTouch = Boolean(nextTouch && isValid(nextTouch) && nextTouch.getTime() < now.getTime());
    const isOverdueForTouch = isOverdueByNextTouch || (daysSinceTouch != null && daysSinceTouch >= 14);
    const scoreValue = contact.lead_score;

    const temperature = normalizeLeadTemperature(contact.lead_temperature);
    const avatarRingClass = temperature.includes("hot")
      ? "ring-2 ring-amber-400"
      : temperature.includes("warm")
        ? "ring-2 ring-teal-400"
        : temperature.includes("cold")
          ? "ring-2 ring-gray-300"
          : "";

    const baseCardClass =
      "group relative flex h-[80px] cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-all duration-200 hover:shadow-sm hover:-translate-y-[1px]";
    const stateCardClass = selectedContactIds.has(contact.id)
      ? "border-l-[3px] border-l-primary"
      : isOverdueByNextTouch
        ? "border-l-[3px] border-l-amber-400"
        : "";

    const handleCallClick = (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      openLogTouch({ contactId: contact.id });
    };

    const handleSmsClick = (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      if (primaryPhone) {
        setQuickSmsContact(contact);
        setQuickSmsTo(primaryPhone);
        setQuickSmsOpen(true);
      } else {
        openLogTouch({ contactId: contact.id });
      }
    };

    const handleTaskClick = (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      setQuickTaskContact(contact);
      setQuickTaskTitle("Follow up");
      setQuickTaskOpen(true);
    };

    return (
      <div key={contact.id} className={cn(baseCardClass, stateCardClass)} onClick={() => navigate(`/contacts/${contact.id}`)}>
        <div className="flex w-12 shrink-0 items-center justify-center">
          <AvatarCircle
            name={displayName}
            initials={initials}
            size="md"
            className={cn("h-10 w-10 text-[13px]", avatarRingClass)}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-semibold text-foreground">{displayName}</span>
            {isOverdueForTouch ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" /> : null}
          </div>

          <div className="flex min-w-0 items-center gap-1.5 text-[12px] text-muted-foreground">
            {effectiveCategory ? (
              <span className="inline-flex max-w-[160px] truncate rounded-full border border-border/80 px-2 py-0.5 text-[11px]">
                {getCategoryLabel({ category: effectiveCategory })}
              </span>
            ) : null}
            {sourceLabel ? (
              <>
                {effectiveCategory ? <span className="h-1 w-1 rounded-full bg-muted-foreground/60" /> : null}
                <span className="truncate">{sourceLabel}</span>
              </>
            ) : null}
          </div>

          <div className="flex min-w-0 items-center gap-2 text-[12px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 truncate">
              <Clock className="h-3 w-3 shrink-0" />
              {formatLastTouchLabel(daysSinceTouch)}
            </span>
            {nextTouch && isValid(nextTouch) && nextTouch.getTime() > now.getTime() ? (
              <span className="truncate">Next: {format(nextTouch, "MMM d")}</span>
            ) : null}
          </div>

          {tagNames.length > 0 ? (
            <div className="flex min-w-0 items-center gap-1">
              {tagNames.slice(0, 2).map((t) => (
                <Badge key={t} variant="secondary" className="px-2 py-0 text-[11px] font-normal">
                  {t}
                </Badge>
              ))}
              {tagNames.length > 2 ? (
                <span className="text-[12px] text-muted-foreground">+{tagNames.length - 2} more</span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex w-[110px] shrink-0 items-center justify-end">
          <div className="flex flex-col items-end gap-1">
            {scoreValue != null ? (
              <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[12px] font-medium tabular-nums text-foreground">
                {scoreValue}
              </span>
            ) : null}
            <div className="flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCallClick} title="Log call touch">
                <Phone className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSmsClick} title="Send SMS">
                <MessageSquare className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleTaskClick} title="Create task">
                <CheckSquare className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Contacts"
        actions={
          <>
            <SavedViewsMenu
              objectType="contacts"
              buildPayload={buildContactsSavedViewPayload}
              applyPayload={applyContactsSavedViewPayload}
            />
            <Button
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              onClick={() => handleOpenDialog()}
            >
              <Plus className="h-4 w-4" />
              Create contact
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2 mb-6 -mt-1">
        {CONTACT_SMART_LISTS.map((sl) => {
          const urlSmart = parseSmartListParam(searchParams.get("smart")) ?? "all";
          const active = urlSmart === sl.id;
          return (
            <Button
              key={sl.id}
              type="button"
              variant={active ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                if (sl.id === "all") {
                  setSearchParams({}, { replace: true });
                  setFilterContactClassification("all");
                  setFilterNoNextTouch(false);
                  setFilterLastTouched("all");
                  setFilterAutomationBlocked(false);
                  setFilterBirthdaysUpcoming(false);
                  setFilterAnnualReviewCandidates(false);
                } else {
                  setSearchParams({ smart: sl.id }, { replace: true });
                }
              }}
            >
              {sl.short ?? sl.label}
            </Button>
          );
        })}
      </div>

      <div className="mb-5 rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Refine</p>
          <p className="text-[11px] text-muted-foreground hidden sm:block">Source, property link, and recency—without opening Filters</p>
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin]">
          <Select
            value={filterSource}
            onValueChange={(v) => {
              setFilterSource(v);
              clearSmartListParam();
            }}
          >
            <SelectTrigger className="h-8 w-[min(46vw,11rem)] shrink-0 bg-popover text-xs border-border">
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
          <Select
            value={filterHasProperty === null ? "all" : filterHasProperty ? "has" : "none"}
            onValueChange={(v) => {
              if (v === "all") setFilterHasProperty(null);
              else setFilterHasProperty(v === "has");
              clearSmartListParam();
            }}
          >
            <SelectTrigger className="h-8 w-[min(46vw,10.5rem)] shrink-0 bg-popover text-xs border-border">
              <Building2 className="mr-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="Property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any property</SelectItem>
              <SelectItem value="has">Has property</SelectItem>
              <SelectItem value="none">No property</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filterLastTouched}
            onValueChange={(v) => {
              setFilterLastTouched(v);
              clearSmartListParam();
            }}
          >
            <SelectTrigger className="h-8 w-[min(52vw,12rem)] shrink-0 bg-popover text-xs border-border">
              <Clock className="mr-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="Last touched" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="stale">30+ days stale</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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
                        <Label>Contact category</Label>
                        <Select
                          value={formData.contact_category || "warm_lead"}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              contact_category: normalizeContactClassificationCategory(value),
                            })
                          }
                        >
                          <SelectTrigger className="bg-input">
                            <SelectValue placeholder="Contact category" />
                          </SelectTrigger>
                          <SelectContent>
                            {CONTACT_CLASSIFICATION_CATEGORIES.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Urgency category</Label>
                        <Select
                          value={formData.category || "none"}
                          onValueChange={(value) =>
                            setFormData({ ...formData, category: value === "none" ? "" : value })
                          }
                        >
                          <SelectTrigger className="bg-input">
                            <SelectValue placeholder="Urgency category" />
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
                      <div className="space-y-2">
                        <Label>Date of birth</Label>
                        <Input
                          type="date"
                          className="bg-input"
                          value={(formData as { date_of_birth?: string }).date_of_birth ?? ""}
                          onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                        />
                        <p className="text-[11px] text-muted-foreground">Optional — powers birthday smart list & reminders.</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Source *</Label>
                      <Input
                        required
                        aria-required
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
                        <AddressAutocomplete
                          placeholder="Street address"
                          className="bg-input"
                          value={formData.address_line1}
                          onChange={(value) => setFormData({ ...formData, address_line1: value })}
                          onPlaceSelected={(parts) =>
                            setFormData((prev) => ({
                              ...prev,
                              address_line1: parts.address_line1 || prev.address_line1,
                              city: parts.city || prev.city,
                              state: parts.state || prev.state,
                              postcode: parts.postcode || prev.postcode,
                              country: parts.country || prev.country || "Australia",
                            }))
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
                            value={formData.state || undefined}
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
                        placeholder="Additional notes and context..."
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

      <div className="mb-5 flex flex-col gap-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1 xl:max-w-2xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, email, phone, source, tags…"
              className={cn(
                "border-border bg-input pl-9 text-foreground placeholder:text-muted-foreground",
                searchQuery ? "pr-9" : "",
              )}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                clearSmartListParam();
              }}
              aria-label="Search contacts"
            />
            {searchQuery ? (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => {
                  setSearchQuery("");
                  clearSmartListParam();
                }}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="relative xl:shrink-0">
            <div
              className={cn(
                "pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-background to-transparent transition-opacity sm:hidden",
                showToolbarLeftFade ? "opacity-100" : "opacity-0",
              )}
            />
            <div
              className={cn(
                "pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-background to-transparent transition-opacity sm:hidden",
                showToolbarRightFade ? "opacity-100" : "opacity-0",
              )}
            />
            <div
              ref={toolbarControlsRef}
              className="flex flex-nowrap items-center gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin] sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
            >
            <span className="hidden whitespace-nowrap text-sm tabular-nums text-muted-foreground md:inline">
              {filteredAndSortedContacts.length} shown
              <span className="text-muted-foreground/70"> · {stats.total} total</span>
            </span>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="h-9 w-[9.5rem] bg-popover border-border text-foreground hover:bg-muted sm:w-[11rem]">
                <ArrowUpDown className="mr-2 h-4 w-4 shrink-0" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Last name A→Z</SelectItem>
                <SelectItem value="name-desc">Last name Z→A</SelectItem>
                <SelectItem value="date-added-desc">Date added (newest)</SelectItem>
                <SelectItem value="date-added-asc">Date added (oldest)</SelectItem>
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
            </div>
            <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 border-border text-foreground hover:bg-muted">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {hasActiveFilters ? (
                    <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-medium text-primary">On</span>
                  ) : null}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[min(100vw-1rem,380px)] overflow-y-auto border-border bg-card text-foreground sm:max-w-lg"
              >
                <SheetHeader className="text-left">
                  <SheetTitle className="text-foreground">Filters</SheetTitle>
                </SheetHeader>
                <p className="mt-1 text-xs text-muted-foreground">
                  Category, lead fields, and tags. Source, property, and last touched stay in the Refine row above.
                </p>
                <div className="mt-5 pr-1">
                  <ContactsFilterPanel {...filterPanelProps} variant="filtersOnly" omitQuickFilters />
                </div>
              </SheetContent>
            </Sheet>
            {hasActiveFilters ? (
              <Button
                variant="ghost"
                size="sm"
                className="hidden text-muted-foreground hover:text-foreground sm:inline-flex"
                onClick={clearAllFilters}
              >
                Clear filters
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 border-border text-foreground hover:bg-muted"
              disabled={selectedContactIds.size < 2}
              title={selectedContactIds.size < 2 ? "Select two or more contacts" : "Merge into one contact card"}
              onClick={() => {
                if (selectedContactIds.size < 2) {
                  toast({
                    title: "Select contacts to merge",
                    description: "Choose at least two rows using the checkboxes, then click Merge.",
                  });
                  return;
                }
                setMergeDialogOpen(true);
              }}
            >
              <GitMerge className="h-3.5 w-3.5 opacity-70" />
              <span className="hidden sm:inline">Merge</span>
            </Button>
            <Popover open={actionsPopoverOpen} onOpenChange={setActionsPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 border-border text-foreground hover:bg-muted"
                  aria-label="More contact actions"
                >
                  <Upload className="h-3.5 w-3.5 opacity-70" />
                  <span className="hidden sm:inline">Import & tools</span>
                  <span className="sm:hidden">Tools</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-52 p-1 bg-popover border-border text-foreground">
                <button
                  type="button"
                  className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-foreground hover:bg-muted focus:bg-muted focus:outline-none"
                  onClick={() => {
                    setIsImportOpen(true);
                    setActionsPopoverOpen(false);
                  }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import CSV
                </button>
                <button
                  type="button"
                  className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-foreground hover:bg-muted focus:bg-muted focus:outline-none"
                  onClick={() => {
                    handleExportCSV();
                    setActionsPopoverOpen(false);
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </button>
                <button
                  type="button"
                  className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-foreground hover:bg-muted focus:bg-muted focus:outline-none"
                  onClick={async () => {
                    await autoCategoriseContacts(filteredAndSortedContacts);
                    setActionsPopoverOpen(false);
                  }}
                >
                  <Tag className="w-4 h-4 mr-2" />
                  Auto-categorise filtered
                </button>
                <div className="my-1 border-t border-border" />
                <p className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">Rows per page</p>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-muted focus:bg-muted focus:outline-none ${itemsPerPage === 25 ? "text-foreground" : "text-muted-foreground"}`}
                  onClick={() => {
                    setItemsPerPage(25);
                    setCurrentPage(1);
                    setActionsPopoverOpen(false);
                  }}
                >
                  <span>25 rows</span>
                  {itemsPerPage === 25 ? <CheckSquare className="h-4 w-4" /> : null}
                </button>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-muted focus:bg-muted focus:outline-none ${itemsPerPage === 50 ? "text-foreground" : "text-muted-foreground"}`}
                  onClick={() => {
                    setItemsPerPage(50);
                    setCurrentPage(1);
                    setActionsPopoverOpen(false);
                  }}
                >
                  <span>50 rows</span>
                  {itemsPerPage === 50 ? <CheckSquare className="h-4 w-4" /> : null}
                </button>
              </PopoverContent>
            </Popover>
            <Select
              value={String(itemsPerPage)}
              onValueChange={(v) => {
                setItemsPerPage(Number(v));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger
                className="hidden h-9 w-[4.25rem] bg-popover border-border text-foreground tabular-nums md:flex"
                aria-label="Rows per page"
                title="Rows per page"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="min-w-0 w-full">
      {/* Bulk Actions */}
      {selectedContactIds.size > 0 && (
        <div className="mb-4 p-3 zoho-card rounded-lg flex items-center justify-between">
          <span className="text-sm text-foreground">
            {selectedContactIds.size} contact{selectedContactIds.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2 flex-wrap justify-end">
            {selectedContactIds.size >= 2 ? (
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setMergeDialogOpen(true)}>
                <GitMerge className="w-4 h-4" />
                Merge duplicates
              </Button>
            ) : null}
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setBulkSmsOpen(true)}>
              <MessageSquare className="w-4 h-4" />
              Bulk SMS
            </Button>
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
                  Set urgency
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="end">
                <p className="text-xs text-muted-foreground mb-2">Assign urgency category to {selectedContactIds.size} contact(s)</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mb-2 w-full"
                  onClick={async () => {
                    const selected = filteredAndSortedContacts.filter((c) => selectedContactIds.has(c.id));
                    await autoCategoriseContacts(selected);
                    setSelectedContactIds(new Set());
                  }}
                >
                  Auto-categorise from classification
                </Button>
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
                            await updateContact.mutateAsync({ id: c.id, category: cat.value, skipActivityLog: true });
                          }
                          toast({ title: "Urgency set", description: `Set ${toUpdate.length} contact(s) to ${cat.label}` });
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
                          await updateContact.mutateAsync({ id: c.id, category: null, skipActivityLog: true });
                        }
                        toast({ title: "Urgency cleared", description: `Cleared category for ${toUpdate.length} contact(s)` });
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
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Tags className="w-4 h-4" />
                  Set classification
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <p className="text-xs text-muted-foreground mb-2 px-1">
                  Smart-list category for {selectedContactIds.size} contact{selectedContactIds.size !== 1 ? "s" : ""}
                </p>
                <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
                  {CONTACT_CLASSIFICATION_CATEGORIES.map((cat) => (
                    <Button
                      key={cat.value}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start font-normal h-8"
                      onClick={async () => {
                        const toUpdate = filteredAndSortedContacts.filter((c) => selectedContactIds.has(c.id));
                        try {
                          for (const c of toUpdate) {
                            await updateContact.mutateAsync({
                              id: c.id,
                              contact_category: normalizeContactClassificationCategory(cat.value),
                              skipActivityLog: true,
                            });
                          }
                          toast({
                            title: "Classification set",
                            description: `Updated ${toUpdate.length} contact(s) to ${cat.label}.`,
                          });
                          setSelectedContactIds(new Set());
                        } catch (e: unknown) {
                          toast({
                            title: "Error",
                            description: (e as Error).message || "Failed to update",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      {cat.label}
                    </Button>
                  ))}
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
                <Button variant="outline" size="sm" className="text-destructive border-destructive/50 hover:bg-destructive/10">
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
                    onClick={handleBulkDeleteContacts}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
          {contactView === "grid" ? (
            <div className="grid grid-cols-1 gap-1">
              {paginatedContacts.map((contact) => renderContactCard(contact, "grid"))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border-2 border-border bg-card shadow-sm">
              <div className="max-h-[min(72vh,calc(100vh-13rem))] min-h-[min(48vh,420px)] overflow-auto">
                <div className="min-w-0 overflow-x-auto">
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
                      <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium hidden md:table-cell w-[100px]">Urgency</th>
                      <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium hidden md:table-cell w-[120px]">Phone</th>
                      <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium hidden md:table-cell">Email</th>
                      <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium hidden md:table-cell w-[100px]">Source</th>
                      <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium hidden md:table-cell">Property</th>
                      <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium hidden lg:table-cell w-[120px]">Last Contacted</th>
                      <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium hidden xl:table-cell w-[120px]">Since Touch</th>
                      <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium hidden xl:table-cell w-[72px]">Score</th>
                      <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium hidden xl:table-cell w-[120px]">Next touch</th>
                      <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium hidden xl:table-cell w-[56px]">CRM</th>
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
            </div>
          )}
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

      </div>

      <MergeContactsDialog
        open={mergeDialogOpen}
        onOpenChange={setMergeDialogOpen}
        contacts={filteredAndSortedContacts.filter((c) => selectedContactIds.has(c.id))}
        onMerged={(primaryId) => {
          setSelectedContactIds(new Set());
          navigate(`/contacts/${primaryId}`);
        }}
      />
      <CSVImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
      <BulkSmsCampaignDialog
        open={bulkSmsOpen}
        onOpenChange={setBulkSmsOpen}
        contactIds={[...selectedContactIds]}
        onComplete={() => setSelectedContactIds(new Set())}
      />

      <Dialog open={quickTaskOpen} onOpenChange={setQuickTaskOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create task</DialogTitle>
            <DialogDescription>
              Add a quick task for {quickTaskContact ? getContactDisplayName(quickTaskContact) : "this contact"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="quick-task-title">Task title</Label>
            <Input
              id="quick-task-title"
              className="bg-input"
              value={quickTaskTitle}
              onChange={(e) => setQuickTaskTitle(e.target.value)}
              placeholder="Follow up"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setQuickTaskOpen(false);
                setQuickTaskContact(null);
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateQuickTask} disabled={createContactTask.isPending}>
              {createContactTask.isPending ? "Creating..." : "Create task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SendSmsDialog
        open={quickSmsOpen}
        onOpenChange={setQuickSmsOpen}
        to={quickSmsTo}
        contactId={quickSmsContact?.id}
        contactName={quickSmsContact ? getContactDisplayName(quickSmsContact) : undefined}
        firstName={quickSmsContact?.first_name}
        lastName={quickSmsContact?.last_name}
      />

      <ContactScriptQuickSheet
        key={scriptQuickContact?.id ?? "closed"}
        open={scriptQuickContact != null}
        onOpenChange={(open) => {
          if (!open) setScriptQuickContact(null);
        }}
        contactCategory={scriptQuickContact?.category}
      />
    </div>
  );
}
