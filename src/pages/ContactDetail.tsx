import { useState, useMemo, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Printer,
  Mail,
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Building2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  Handshake,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDrako } from "@/components/drako";
import { pickDrakoLine } from "@/lib/drakoDialogue";
import { useContact } from "@/hooks/useContact";
import {
  useContacts,
  useUpdateContact,
  getPrimaryEmail,
  getPrimaryPhone,
  getAllEmails,
  getAllPhones,
  formatContactAddress,
  getContactDisplayName,
} from "@/hooks/useContacts";
import { formatPhoneDisplay } from "@/lib/formatPhone";
import { useProperties, formatPropertyAddress } from "@/hooks/useProperties";
import {
  useCreateContactPropertyLink,
  useDeleteContactPropertyLink,
} from "@/hooks/useContactPropertyLinks";
import { useCreatePropertyFromContactAddress } from "@/hooks/useCreatePropertyFromContactAddress";
import { getInitials } from "@/lib/utils";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { useInteractions, useCreateInteraction } from "@/hooks/useInteractions";
import { EmailComposeDialog } from "@/components/contacts/EmailComposeDialog";
import { SendSmsDialog } from "@/components/contacts/SendSmsDialog";
import { ContactChannelsEdit } from "@/components/contacts/ContactChannelsEdit";
import { ContactProfileHero } from "@/components/contacts/ContactProfileHero";
import { ContactQuickActionsBar } from "@/components/contacts/ContactQuickActionsBar";
import { ContactCrmSettingsPanel } from "@/components/contacts/ContactCrmSettingsPanel";
import { ContactBuyerActivityPanel } from "@/components/contacts/ContactBuyerActivityPanel";
import { ContactSuiteCard } from "@/components/contacts/ContactSuiteCard";
import { ContactNurturePanel } from "@/components/contacts/ContactNurturePanel";
import { ContactHubWorkBanner } from "@/components/contacts/ContactHubWorkBanner";
import { ContactExpandableSection } from "@/components/contacts/ContactExpandableSection";
import { ContactNurtureSummaryStrip } from "@/components/contacts/ContactNurtureSummaryStrip";
import { ContactActivitySummaryStrip } from "@/components/contacts/ContactActivitySummaryStrip";
import { ContactRelationshipBrief } from "@/components/contacts/ContactRelationshipBrief";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { ContactConversationHub } from "@/components/contacts/ContactConversationHub";
import { ContactDuplicateAlert } from "@/components/contacts/ContactDuplicateAlert";
import { PropertyIntelligenceStrip } from "@/components/pricefinder/PropertyIntelligenceStrip";
import { ContactBuyerRequirementsPanel } from "@/components/contacts/ContactBuyerRequirementsPanel";
import { ContactMatchingListingsPanel } from "@/components/contacts/ContactMatchingListingsPanel";
import { ContactRelatedContactsPanel } from "@/components/contacts/ContactRelatedContactsPanel";
import { ContactRequirementsPreview } from "@/components/contacts/ContactRequirementsPreview";
import { EntityActivitySchedulesPanel } from "@/components/shared/EntityActivitySchedulesPanel";
import { EntityModificationsPanel } from "@/components/shared/EntityModificationsPanel";
import { PrintNotesBody } from "@/components/contacts/ContactPrintLayout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { SegmentedTabsList, SegmentedTabsTrigger } from "@/components/ui/segmented-tabs";
import { format, isValid, parseISO } from "date-fns";
import { openLogTouch } from "@/lib/openLogTouch";

const INTERACTION_TYPES = ["call", "email", "meeting", "note", "sms", "other"];
const CHANNELS = ["phone", "email", "in-person", "video", "sms", "social"];
const LINK_ROLES = ["owner", "buyer", "tenant", "interested", "other"] as const;

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

const URGENCY_OPTIONS: Array<{ value: ContactUrgencyCategory; label: string }> = [
  { value: "immediate", label: "Immediate" },
  { value: "priority", label: "Priority" },
  { value: "planned", label: "Planned" },
  { value: "backlog", label: "Backlog" },
];

type ContactUrgencyCategory = "immediate" | "priority" | "planned" | "backlog" | "prospect";
type ContactClassificationCategory =
  | "top_100"
  | "past_client"
  | "referral_partner"
  | "hot_lead"
  | "warm_lead"
  | "seller_nurture"
  | "active_buyer"
  | "seller_lead"
  | "prospect";

const CONTACT_CLASSIFICATION_OPTIONS: Array<{ value: ContactClassificationCategory; label: string }> = [
  { value: "top_100", label: "Top 100" },
  { value: "past_client", label: "Past Client" },
  { value: "referral_partner", label: "Referral Partner" },
  { value: "hot_lead", label: "Hot Lead" },
  { value: "warm_lead", label: "Warm Lead" },
  { value: "seller_nurture", label: "Seller Nurture" },
  { value: "active_buyer", label: "Active Buyer" },
  { value: "seller_lead", label: "Seller Lead" },
  { value: "prospect", label: "Prospect" },
];

function normalizeContactCategory(value: string | null | undefined): ContactUrgencyCategory | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (raw === "immediate" || raw === "priority" || raw === "planned" || raw === "backlog" || raw === "prospect") {
    return raw as ContactUrgencyCategory;
  }
  const legacyMap: Record<string, ContactUrgencyCategory> = {
    red: "immediate",
    orange: "priority",
    yellow: "priority",
    green: "planned",
    blue: "planned",
    purple: "prospect",
    pink: "backlog",
    gray: "backlog",
  };
  return legacyMap[raw] ?? null;
}

function urgencyLabel(category: ContactUrgencyCategory | null): string {
  if (category === "immediate") return "Immediate";
  if (category === "priority") return "Priority";
  if (category === "planned") return "Planned";
  if (category === "backlog") return "Backlog";
  if (category === "prospect") return "Prospect";
  return "Unassigned";
}

function urgencyBadgeClass(category: ContactUrgencyCategory | null): string {
  if (category === "immediate") return "border-red-500/45 bg-red-500/15 text-red-200";
  if (category === "priority") return "border-amber-500/45 bg-amber-500/15 text-amber-200";
  if (category === "planned") return "border-sky-500/45 bg-sky-500/15 text-sky-200";
  if (category === "backlog") return "border-emerald-500/45 bg-emerald-500/15 text-emerald-200";
  if (category === "prospect") return "border-purple-500/45 bg-purple-500/15 text-purple-200";
  return "border-border/70 bg-muted/50 text-muted-foreground";
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
    raw === "seller_nurture" ||
    raw === "active_buyer" ||
    raw === "seller_lead" ||
    raw === "prospect"
  ) {
    return raw as ContactClassificationCategory;
  }
  return "warm_lead";
}

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { setMood } = useDrako();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const nurtureFocus = searchParams.get("nurtureFocus");
  const workFocus = searchParams.get("work") === "1";
  const hubContactTaskId = searchParams.get("contactTaskId");
  const hubAppointmentId = searchParams.get("appointmentId");
  const CONTACT_TABS = ["overview", "card", "requirements", "people", "properties", "crm"] as const;
  type ContactTab = (typeof CONTACT_TABS)[number];
  const tabParam = searchParams.get("tab");
  const contactTab: ContactTab = CONTACT_TABS.includes(tabParam as ContactTab)
    ? (tabParam as ContactTab)
    : "overview";
  const setContactTab = (tab: ContactTab) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tab === "overview") next.delete("tab");
        else next.set("tab", tab);
        return next;
      },
      { replace: true },
    );
  };

  const { data: contact, isLoading, isError, refetch } = useContact(id);

  const displayName = useMemo(() => (contact ? getContactDisplayName(contact) : ""), [contact]);
  const displayNameLabel = displayName === "—" ? "Contact" : displayName;
  const contactUrgency = normalizeContactCategory((contact as { category?: string | null } | null)?.category);

  const heroSubtitle = useMemo(() => {
    if (!contact) return "";
    if (contact.source?.trim()) return `Source: ${contact.source.trim()}`;
    return "";
  }, [contact]);

  const birthdayChip = useMemo(() => {
    const dob = (contact as { date_of_birth?: string | null } | null)?.date_of_birth?.trim();
    if (!dob) return null;
    const d = parseISO(`${dob.slice(0, 10)}T12:00:00`);
    if (!isValid(d)) return null;
    const today = new Date();
    const thisYear = new Date(today.getFullYear(), d.getMonth(), d.getDate());
    const nextYear = new Date(today.getFullYear() + 1, d.getMonth(), d.getDate());
    const target = thisYear >= today ? thisYear : nextYear;
    const days = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0 || days > 30) return null;
    if (days === 0) return "Birthday today!";
    if (days === 1) return "Birthday tomorrow";
    return `Birthday in ${days} days`;
  }, [contact]);

  useEffect(() => {
    if (!contact || nurtureFocus !== "1") return;
    requestAnimationFrame(() => {
      document.getElementById("contact-nurture-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("nurtureFocus");
        return next;
      },
      { replace: true }
    );
  }, [contact, nurtureFocus, setSearchParams]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const { data: contactsList = [] } = useContacts();
  const { data: interactions = [] } = useInteractions(id);
  const { data: allProperties = [] } = useProperties();

  const contactIndex = id ? contactsList.findIndex((c) => c.id === id) : -1;
  const prevContactId = contactIndex > 0 ? contactsList[contactIndex - 1]?.id : null;
  const nextContactId = contactIndex >= 0 && contactIndex < contactsList.length - 1 ? contactsList[contactIndex + 1]?.id : null;
  const updateContact = useUpdateContact();
  const createInteraction = useCreateInteraction();
  const createLink = useCreateContactPropertyLink();
  const deleteLink = useDeleteContactPropertyLink();
  const createFromAddress = useCreatePropertyFromContactAddress();

  const [isEditing, setIsEditing] = useState(false);
  const [emailComposeOpen, setEmailComposeOpen] = useState(false);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [smsToNumber, setSmsToNumber] = useState<string>("");
  const [addInteractionOpen, setAddInteractionOpen] = useState(false);
  const [linkPropertyOpen, setLinkPropertyOpen] = useState(false);
  const [linkPropertyId, setLinkPropertyId] = useState("");
  const [linkRole, setLinkRole] = useState("owner");
  const [linkNotes, setLinkNotes] = useState("");
  const [editFormData, setEditFormData] = useState<any>({});
  const [newInteraction, setNewInteraction] = useState({
    type: "call",
    channel: "phone",
    subject: "",
    body: "",
  });
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [printIncludeDob, setPrintIncludeDob] = useState(false);
  const printFrameRef = useRef<HTMLIFrameElement>(null);
  const workTabAppliedRef = useRef(false);
  const [activitySectionOpen, setActivitySectionOpen] = useState(false);

  const linkedProperties = useMemo(() => {
    if (!contact?.contact_property_links) return [];
    return contact.contact_property_links
      .map((link) => {
        const property = allProperties.find((p) => p.id === link.property_id);
        return property ? { ...link, property } : null;
      })
      .filter(Boolean) as Array<typeof contact.contact_property_links[0] & { property: typeof allProperties[0] }>;
  }, [contact, contact?.contact_property_links, allProperties]);

  const linkedPropertyIds = useMemo(
    () => new Set((contact?.contact_property_links ?? []).map((l) => l.property_id)),
    [contact?.contact_property_links]
  );
  const availableProperties = useMemo(
    () => allProperties.filter((p) => !linkedPropertyIds.has(p.id)),
    [allProperties, linkedPropertyIds]
  );

  useEffect(() => {
    if (!workFocus || !contact || workTabAppliedRef.current) return;
    workTabAppliedRef.current = true;
    if (linkedProperties.length > 0) {
      setContactTab("properties");
    }
  }, [workFocus, contact, linkedProperties.length]);

  const handleStartEdit = () => {
    if (contact) {
      const resolved =
        contact.name?.trim() ||
        (getContactDisplayName(contact) === "—" ? "" : getContactDisplayName(contact));
      setEditFormData({
        name: resolved,
        email: getPrimaryEmail(contact) ?? contact.email ?? "",
        phone: getPrimaryPhone(contact) ?? contact.phone ?? "",
        contact_category: normalizeContactClassificationCategory(
          (contact as { contact_category?: string | null }).contact_category,
        ),
        category: normalizeContactCategory((contact as { category?: string | null }).category) ?? "",
        source: contact.source ?? "",
        notes: contact.notes ?? "",
        story: contact.story ?? "",
        pipeline_stage: contact.pipeline_stage ?? "",
        selling_intentions: contact.selling_intentions ?? "",
        current_situation_notes: contact.current_situation_notes ?? "",
        pain_points: contact.pain_points ?? "",
        pleasure_points: contact.pleasure_points ?? "",
        address_line1: contact.address_line1 ?? "",
        address_line2: contact.address_line2 ?? "",
        city: contact.city ?? "",
        state: contact.state ?? "",
        postcode: contact.postcode ?? "",
        country: contact.country ?? "Australia",
        date_of_birth: String((contact as { date_of_birth?: string | null }).date_of_birth ?? "").slice(0, 10),
        title: (contact as { title?: string | null }).title ?? "",
        salutation: (contact as { salutation?: string | null }).salutation ?? "",
        home_phone: (contact as { home_phone?: string | null }).home_phone ?? "",
        work_phone: (contact as { work_phone?: string | null }).work_phone ?? "",
        company_name: (contact as { company_name?: string | null }).company_name ?? "",
        job_title: (contact as { job_title?: string | null }).job_title ?? "",
        website: (contact as { website?: string | null }).website ?? "",
        linkedin_url: (contact as { linkedin_url?: string | null }).linkedin_url ?? "",
        twitter_handle: (contact as { twitter_handle?: string | null }).twitter_handle ?? "",
        instagram_url: (contact as { instagram_url?: string | null }).instagram_url ?? "",
        facebook_url: (contact as { facebook_url?: string | null }).facebook_url ?? "",
        client_ref: (contact as { client_ref?: string | null }).client_ref ?? "",
      });
      setIsEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!contact) return;
    try {
      const requestedCategory = normalizeContactCategory(editFormData.category) ?? null;
      const existingCategory = normalizeContactCategory((contact as { category?: string | null }).category) ?? null;
      const categoryChanged = requestedCategory !== existingCategory;

      const payload = {
        id: contact.id,
        name: editFormData.name,
        email: editFormData.email || null,
        phone: editFormData.phone || null,
        contact_category: normalizeContactClassificationCategory(editFormData.contact_category),
        category: requestedCategory,
        source: editFormData.source || null,
        notes: editFormData.notes || null,
        story: editFormData.story || null,
        pipeline_stage: editFormData.pipeline_stage || null,
        selling_intentions: editFormData.selling_intentions || null,
        current_situation_notes: editFormData.current_situation_notes || null,
        pain_points: editFormData.pain_points || null,
        pleasure_points: editFormData.pleasure_points || null,
        address_line1: editFormData.address_line1?.trim() || null,
        address_line2: editFormData.address_line2?.trim() || null,
        city: editFormData.city?.trim() || null,
        state: editFormData.state || null,
        postcode: editFormData.postcode?.trim() || null,
        country: editFormData.country || "Australia",
        date_of_birth: editFormData.date_of_birth?.trim()
          ? editFormData.date_of_birth.trim()
          : null,
        title: editFormData.title?.trim() || null,
        salutation: editFormData.salutation?.trim() || null,
        home_phone: editFormData.home_phone?.trim() || null,
        work_phone: editFormData.work_phone?.trim() || null,
        company_name: editFormData.company_name?.trim() || null,
        job_title: editFormData.job_title?.trim() || null,
        website: editFormData.website?.trim() || null,
        linkedin_url: editFormData.linkedin_url?.trim() || null,
        twitter_handle: editFormData.twitter_handle?.trim() || null,
        instagram_url: editFormData.instagram_url?.trim() || null,
        facebook_url: editFormData.facebook_url?.trim() || null,
        client_ref: editFormData.client_ref?.trim() || null,
      };
      await updateContact.mutateAsync(payload as any);
      if (categoryChanged) {
        const refreshed = await refetch();
        const refreshedCategory = normalizeContactCategory(
          (refreshed.data as { category?: string | null } | undefined)?.category ?? null
        );
        if (refreshedCategory !== requestedCategory) {
          toast({
            title: "Urgency not saved",
            description: "Category update did not persist. Please run `npm run db:push` and try again.",
            variant: "destructive",
          });
          return;
        }
      }
      toast({ title: "Success", description: "Contact updated!" });
      setMood("wave", { caption: pickDrakoLine("contactSaved") });
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

  const handleLinkProperty = async () => {
    if (!id || !linkPropertyId) {
      toast({ title: "Error", description: "Select a property.", variant: "destructive" });
      return;
    }
    try {
      await createLink.mutateAsync({
        contact_id: id,
        property_id: linkPropertyId,
        role: linkRole as "owner" | "buyer" | "tenant" | "interested" | "other",
        notes: linkNotes.trim() || null,
      });
      toast({ title: "Success", description: "Property linked." });
      setLinkPropertyOpen(false);
      setLinkPropertyId("");
      setLinkRole("owner");
      setLinkNotes("");
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      const msg = err?.message ?? (e instanceof Error ? e.message : "");
      const isDuplicate =
        err?.code === "23505" ||
        /duplicate|unique|already exists/i.test(String(msg));
      toast({
        title: "Error",
        description: isDuplicate
          ? "This property is already linked to this contact."
          : (e instanceof Error ? e.message : "Failed to link property"),
        variant: "destructive",
      });
    }
  };

  const handleUnlinkProperty = async (linkId: string, propertyId: string) => {
    if (!id) return;
    try {
      await deleteLink.mutateAsync({
        id: linkId,
        property_id: propertyId,
        contact_id: id,
      });
      toast({ title: "Removed", description: "Property unlinked." });
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to unlink",
        variant: "destructive",
      });
    }
  };

  const handleCreateFromAddress = async () => {
    if (!id || !contact) return;
    const hasAddress = !!(contact.address_line1?.trim() || contact.city?.trim());
    if (!hasAddress) {
      setLinkPropertyOpen(true);
      return;
    }
    try {
      await createFromAddress.createAndLink({
        contact_id: id,
        address: {
          address_line1: contact.address_line1 || null,
          address_line2: contact.address_line2 || null,
          city: contact.city || null,
          state: contact.state || null,
          postcode: contact.postcode || null,
          country: contact.country || "Australia",
        },
        role: "owner",
      });
      toast({ title: "Success", description: "Property created and linked as owner." });
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to create property",
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    setPrintPreviewOpen(true);
  };
  const handlePrintFromPreview = () => {
    try {
      const frame = printFrameRef.current;
      if (frame?.contentWindow) {
        frame.contentWindow.print();
      }
    } catch {
      window.print();
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

  if (isError) {
    return (
      <div className="animate-fade-in text-center py-12">
        <p className="font-medium text-foreground mb-2">Couldn&apos;t load contact</p>
        <p className="text-sm text-muted-foreground mb-4">Check your connection and migrations, then retry.</p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>Retry</Button>
          <Button variant="ghost" onClick={() => navigate("/contacts")}>Back to Contacts</Button>
        </div>
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
    <div className="animate-fade-in print:bg-white print:text-black print-contact-document">
      <PageBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Contacts", href: "/contacts" },
          { label: "Profile" },
        ]}
        className="mb-4 print:hidden"
      />
      <div className="mb-5 flex flex-col gap-2.5 print:hidden sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => navigate("/contacts")} title="Back to list">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          {prevContactId && (
            <Button variant="ghost" size="icon" onClick={() => navigate(`/contacts/${prevContactId}`)} title="Previous contact">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          {nextContactId && (
            <Button variant="ghost" size="icon" onClick={() => navigate(`/contacts/${nextContactId}`)} title="Next contact">
              <ChevronRight className="w-5 h-5" />
            </Button>
          )}
        </div>
        <div className="flex w-full flex-wrap items-center justify-start gap-1.5 sm:w-auto sm:justify-end sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-2 sm:h-9 sm:px-3"
            onClick={() => id && openLogTouch({ contactId: id })}
            disabled={!id}
          >
            <Handshake className="w-4 h-4" />
            <span className="sm:hidden">Log</span>
            <span className="hidden sm:inline">Log touch</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-2 text-muted-foreground sm:h-9 sm:px-3"
            onClick={() => setPaletteOpen(true)}
            title="Open command palette (⌘K)"
          >
            <kbd className="text-[10px] font-mono">⌘K</kbd>
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2 sm:h-9 sm:px-3" asChild>
            <Link to="/scripts" className="inline-flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Scripts</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 gap-1.5 px-2 sm:h-9 sm:px-3">
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </Button>
          {getAllEmails(contact).length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setEmailComposeOpen(true)} className="h-8 gap-1.5 px-2 sm:h-9 sm:px-3">
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">Email</span>
            </Button>
          )}
          {getAllPhones(contact).length > 0 && (
            getAllPhones(contact).length === 1 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSmsToNumber(getAllPhones(contact)[0].value);
                  setSmsDialogOpen(true);
                }}
                className="h-8 gap-1.5 px-2 sm:h-9 sm:px-3"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">SMS</span>
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2 sm:h-9 sm:px-3">
                    <MessageSquare className="w-4 h-4" />
                    <span className="hidden sm:inline">SMS</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {getAllPhones(contact).map((p) => (
                    <DropdownMenuItem key={p.value} onClick={() => { setSmsToNumber(p.value); setSmsDialogOpen(true); }}>
                      {p.label}: {formatPhoneDisplay(p.value)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          )}
          <Button size="sm" onClick={handleStartEdit} className="h-8 gap-1.5 px-2 sm:h-9 sm:px-3">
            <Edit className="w-4 h-4" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
        </div>
      </div>

      {getAllEmails(contact).length > 0 && (
        <EmailComposeDialog
          open={emailComposeOpen}
          onOpenChange={setEmailComposeOpen}
          to={getPrimaryEmail(contact) ?? contact.email ?? ""}
          contactId={id}
          contactName={displayName === "—" ? undefined : displayName}
          onSent={() => {
            if (!id) return;
            void queryClient.invalidateQueries({ queryKey: ["interactions", id] });
            void queryClient.invalidateQueries({ queryKey: ["communications_linked"] });
            void queryClient.invalidateQueries({ queryKey: ["activity_log"] });
          }}
        />
      )}
      {getAllPhones(contact).length > 0 && (
        <SendSmsDialog
          open={smsDialogOpen}
          onOpenChange={setSmsDialogOpen}
          to={smsToNumber || (getAllPhones(contact)[0]?.value ?? "")}
          contactId={id}
          contactName={displayName === "—" ? undefined : displayName}
          firstName={contact.first_name}
          lastName={contact.last_name}
          onSent={() => id && createInteraction.mutate({ contact_id: id, type: "sms", channel: "sms", subject: "SMS sent", body: null })}
        />
      )}

      {/* Print preview dialog */}
      <Dialog open={printPreviewOpen} onOpenChange={setPrintPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-card border-border">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Print preview — {displayNameLabel}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 flex flex-col gap-4">
            <div className="flex-1 min-h-[60vh] border border-border rounded-lg overflow-hidden bg-muted/30">
              <iframe
                ref={printFrameRef}
                title="Print preview"
                src={id ? `/contacts/${id}/print${printIncludeDob ? "?dob=1" : ""}` : undefined}
                className="w-full h-full min-h-[60vh] border-0 bg-white"
              />
            </div>
            <p className="text-xs text-muted-foreground flex-shrink-0">
              Double-sided upside down? In the print dialog use <strong>Long-edge binding</strong> (book flip). If still wrong, try <strong>Short-edge</strong>. Enable background graphics for the navy header.
            </p>
            <div className="flex items-center justify-between flex-shrink-0">
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                <Checkbox
                  checked={printIncludeDob}
                  onCheckedChange={(checked) => setPrintIncludeDob(Boolean(checked))}
                />
                Include date of birth
              </label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPrintPreviewOpen(false)}>
                  Close
                </Button>
                <Button onClick={handlePrintFromPreview} className="gap-2">
                  <Printer className="w-4 h-4" /> Print
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <DialogContent className="sm:max-w-[420px] p-0 bg-card border-border overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Command palette</DialogTitle>
          </DialogHeader>
          <Command>
            <CommandInput placeholder="Type a command…" autoFocus />
            <CommandList className="max-h-[360px]">
              <CommandGroup heading="Log">
                <CommandItem
                  onSelect={() => {
                    if (id) openLogTouch({ contactId: id });
                    setPaletteOpen(false);
                  }}
                >
                  Log touch
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    setNewInteraction({ type: "call", channel: "phone", subject: "", body: "" });
                    setAddInteractionOpen(true);
                    setPaletteOpen(false);
                  }}
                >
                  Log call
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    setNewInteraction({ type: "note", channel: "phone", subject: "", body: "" });
                    setAddInteractionOpen(true);
                    setPaletteOpen(false);
                  }}
                >
                  Log note
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Contact">
                {getAllPhones(contact).length > 0 && (
                  <CommandItem
                    onSelect={() => {
                      setSmsToNumber(getAllPhones(contact)[0].value);
                      setSmsDialogOpen(true);
                      setPaletteOpen(false);
                    }}
                  >
                    Send SMS
                  </CommandItem>
                )}
                {getAllEmails(contact).length > 0 && (
                  <CommandItem
                    onSelect={() => {
                      setEmailComposeOpen(true);
                      setPaletteOpen(false);
                    }}
                  >
                    Send email
                  </CommandItem>
                )}
                <CommandItem
                  onSelect={() => {
                    handleStartEdit();
                    setPaletteOpen(false);
                  }}
                >
                  Edit contact
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    handlePrint();
                    setPaletteOpen(false);
                  }}
                >
                  Print client brief
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    setSearchParams({ nurtureFocus: "1" });
                    setPaletteOpen(false);
                  }}
                >
                  Open nurture panel
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Navigate">
                {prevContactId && (
                  <CommandItem
                    onSelect={() => {
                      navigate(`/contacts/${prevContactId}`);
                      setPaletteOpen(false);
                    }}
                  >
                    Previous contact
                  </CommandItem>
                )}
                {nextContactId && (
                  <CommandItem
                    onSelect={() => {
                      navigate(`/contacts/${nextContactId}`);
                      setPaletteOpen(false);
                    }}
                  >
                    Next contact
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      {/* Print-only document header */}
      <div className="hidden print:block print-doc-header">
        <div className="print-doc-brand">Data Dungeon</div>
        <h1 className="print-doc-title">{displayNameLabel}</h1>
        <div className="print-doc-meta">
          <span>Contact Summary</span>
          <span>Printed {format(new Date(), "d MMMM yyyy")}</span>
        </div>
      </div>

      <div className="space-y-5 print-contact-grid">
        {id && contact ? (
          <ContactProfileHero
            contactId={id}
            contact={contact}
            displayName={displayNameLabel}
            displayInitials={getInitials(undefined, undefined, displayName === "—" ? undefined : displayName)}
            heroSubtitle={heroSubtitle}
            birthdayChip={birthdayChip}
            urgencyBadge={
              <Badge
                variant="outline"
                className={`rounded-full border px-2.5 py-1 text-xs sm:px-3 sm:text-sm font-semibold ${urgencyBadgeClass(contactUrgency)}`}
              >
                {urgencyLabel(contactUrgency)}
              </Badge>
            }
          />
        ) : null}

        {id ? (
          <ContactQuickActionsBar contact={contact} contactId={id} />
        ) : null}

        {id ? (
          <ContactRelationshipBrief contact={contact} className="print:hidden" />
        ) : null}

        {id && workFocus ? (
          <ContactHubWorkBanner
            contactId={id}
            contactTaskId={hubContactTaskId}
            appointmentId={hubAppointmentId}
            nurtureSequence={nurtureFocus === "1"}
          />
        ) : null}

        <div className="min-w-0 space-y-5 print-contact-main">
          {id ? (
            <Tabs
              value={contactTab}
              onValueChange={(v) => setContactTab(v as ContactTab)}
              className="print:hidden"
            >
              <SegmentedTabsList className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                <SegmentedTabsTrigger value="overview">Overview</SegmentedTabsTrigger>
                <SegmentedTabsTrigger value="card">Contact card</SegmentedTabsTrigger>
                <SegmentedTabsTrigger value="requirements">Requirements</SegmentedTabsTrigger>
                <SegmentedTabsTrigger value="people">Related</SegmentedTabsTrigger>
                <SegmentedTabsTrigger value="properties">Properties</SegmentedTabsTrigger>
                <SegmentedTabsTrigger value="crm">CRM</SegmentedTabsTrigger>
              </SegmentedTabsList>

              <TabsContent value="overview" className="mt-4 space-y-5">
              <ContactConversationHub contactId={id} />
              <ContactExpandableSection
                title="Nurture & tasks"
                defaultOpen={false}
                className="print:hidden"
                summary={
                  <ContactNurtureSummaryStrip contactId={id} onLogTouch={() => setAddInteractionOpen(true)} />
                }
              >
                <ContactNurturePanel contact={contact} contactId={id} chrome="flush" />
              </ContactExpandableSection>

              {/* Story & Intent */}
              <Card className="zoho-card p-5 sm:p-6 border-border print:border print:border-gray-300 print-section">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Story & intent</h3>
                <div className="space-y-5">
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase">Story</Label>
                    <p className="text-foreground mt-1 whitespace-pre-wrap min-h-[1.5rem]">
                      {contact.story || "—"}
                    </p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase">Pipeline stage</Label>
                      <p className="text-foreground mt-1">{contact.pipeline_stage || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase">Selling intentions</Label>
                      <p className="text-foreground mt-1 whitespace-pre-wrap">{contact.selling_intentions || "—"}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase">Current situation</Label>
                    <p className="text-foreground mt-1 whitespace-pre-wrap">{contact.current_situation_notes || "—"}</p>
                  </div>
                </div>
              </Card>

              <Card className="zoho-card p-5 sm:p-6 border-border">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
                  Buyer requirements
                </h3>
                <ContactRequirementsPreview contactId={id} onViewAll={() => setContactTab("requirements")} />
              </Card>

              <ContactExpandableSection
                title="Activity timeline"
                defaultOpen={false}
                className="print:hidden"
                open={activitySectionOpen}
                onOpenChange={setActivitySectionOpen}
                summary={<ContactActivitySummaryStrip contactId={id} />}
              >
                <div className="print:hidden max-h-[min(560px,60vh)] overflow-y-auto pr-1">
                  <p className="text-xs text-muted-foreground mb-3">
                    Notes, calls, emails, SMS, offers, and appointments in one feed.
                  </p>
                  <div className="flex flex-wrap justify-end gap-2 pb-2">
                    <Button size="sm" variant="outline" onClick={() => setAddInteractionOpen(true)} className="gap-1">
                      <Plus className="w-4 h-4" /> Log touch
                    </Button>
                  </div>
                  <ActivityTimeline
                    entityType="contact"
                    entityId={id}
                    includeAppointments
                    compact
                    embedded
                    limit={activitySectionOpen ? undefined : 5}
                    showAddNote
                  />
                </div>
              </ContactExpandableSection>
              </TabsContent>

              <TabsContent value="card" className="mt-4 space-y-5">
          <Card className="zoho-card p-5 sm:p-6 border-border print:border print:border-gray-300 print-section">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Contact information</h3>
            {(contact.address_line1 || contact.city) ? (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-foreground">{formatContactAddress(contact)}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">No address</p>
            )}
          </Card>

          <Card className="zoho-card p-5 sm:p-6 border-border print:border print:border-gray-300 print-section">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Pain & pleasure points</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase">Pain points</Label>
                <p className="text-foreground whitespace-pre-wrap bg-muted/30 rounded-md p-3 text-sm">
                  {contact.pain_points || "—"}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase">Pleasure points</Label>
                <p className="text-foreground whitespace-pre-wrap bg-muted/30 rounded-md p-3 text-sm">
                  {contact.pleasure_points || "—"}
                </p>
              </div>
            </div>
          </Card>

          {contact.notes ? (
            <Card className="zoho-card p-5 sm:p-6 border-border print:border print:border-gray-300 print-section">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Notes</h3>
              <div className="text-foreground text-sm">
                <PrintNotesBody text={contact.notes} />
              </div>
            </Card>
          ) : null}

              <ContactBuyerActivityPanel contactId={id} compact />

              <EntityActivitySchedulesPanel appliesTo="contact" contactId={id} />
              <EntityModificationsPanel entityType="contact" entityId={id} />
              </TabsContent>

              <TabsContent value="requirements" className="mt-4 space-y-5">
                <ContactBuyerRequirementsPanel contactId={id} />
                <ContactMatchingListingsPanel contactId={id} />
              </TabsContent>

              <TabsContent value="people" className="mt-4 space-y-5">
                <ContactRelatedContactsPanel contactId={id} />
              </TabsContent>

              <TabsContent value="properties" className="mt-4 space-y-5">
          {/* Linked properties */}
          <Card className="zoho-card p-5 sm:p-6 border-border print:border print:border-gray-300 print-section">
            <div className="flex items-center justify-between mb-4 print:hidden">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Linked properties</h3>
              {(contact?.address_line1?.trim() || contact?.city?.trim()) ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Plus className="w-4 h-4" /> Link property <ChevronDown className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleCreateFromAddress} disabled={createFromAddress.isPending || createLink.isPending}>
                      Create property from address
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLinkPropertyOpen(true)} disabled={availableProperties.length === 0}>
                      Link existing property
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setLinkPropertyOpen(true)}
                  disabled={availableProperties.length === 0}
                >
                  <Plus className="w-4 h-4" /> Link property
                </Button>
              )}
            </div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide hidden print:block mb-4">Linked properties</h3>
            {linkedProperties.length > 0 ? (
              <div className="space-y-4">
                {linkedProperties.map((link) => {
                  const property = link.property;
                  if (!property) return null;
                  const address = formatPropertyAddress(property);
                  return (
                    <div
                      key={link.id}
                      className="flex items-start gap-3 p-4 rounded-lg border border-border print:border-gray-300"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 print:hidden">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => navigate(`/properties/${property.id}`)}
                          className="font-medium text-sm text-foreground hover:underline text-left block mb-1 print:no-underline"
                        >
                          {address}
                        </button>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
                          {property.property_type && (
                            <Badge variant="secondary" className="text-xs">{property.property_type}</Badge>
                          )}
                          {property.bedrooms != null && <span>{property.bedrooms} bed</span>}
                          {property.bathrooms != null && <span>{property.bathrooms} bath</span>}
                        </div>
                        {property.price != null && property.price > 0 && (
                          <p className="text-sm font-semibold text-foreground mb-2">
                            ${property.price.toLocaleString()}
                          </p>
                        )}
                        {link.role && (
                          <Badge variant="outline" className="text-xs mb-2">{link.role}</Badge>
                        )}
                        <PropertyIntelligenceStrip
                          propertyReport={
                            (property.property_report as Record<string, unknown> | null | undefined) ?? null
                          }
                          address={address}
                          propertyId={property.id}
                          compact
                          className="mb-2"
                        />
                        <div className="flex gap-2 mt-2 print:hidden">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 h-8"
                            onClick={() => navigate(`/properties/${property.id}`)}
                          >
                            <ExternalLink className="w-3 h-3" /> View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 h-8 text-destructive hover:text-destructive"
                            onClick={() => handleUnlinkProperty(link.id, property.id)}
                            disabled={deleteLink.isPending}
                          >
                            <Trash2 className="w-3 h-3" /> Remove association
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-border rounded-lg print:border-gray-300">
                <MapPin className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground mb-2">No properties linked</p>
                {(contact?.address_line1?.trim() || contact?.city?.trim()) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 print:hidden"
                    onClick={handleCreateFromAddress}
                    disabled={createFromAddress.isPending || createLink.isPending}
                  >
                    <Plus className="w-4 h-4" /> Create property from address
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 print:hidden"
                    onClick={() => setLinkPropertyOpen(true)}
                    disabled={availableProperties.length === 0}
                  >
                    <Plus className="w-4 h-4" /> Link existing property
                  </Button>
                )}
                {!contact?.address_line1?.trim() && !contact?.city?.trim() && availableProperties.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-2">Add an address above, or create properties first and link from the Properties page.</p>
                )}
              </div>
            )}
          </Card>

          <div className="print:hidden">
            <ContactSuiteCard
              variant="page"
              contactId={id}
              interactions={interactions}
              linkedPropertyIds={linkedProperties.map((l) => l.property_id)}
            />
          </div>
              </TabsContent>

              <TabsContent value="crm" className="mt-4 space-y-5">
                <ContactCrmSettingsPanel contactId={id} contact={contact} onUpdated={() => void refetch()} />
              </TabsContent>
            </Tabs>
          ) : null}
        </div>
      </div>

      {/* Print footer */}
      <div className="hidden print:block print-doc-footer">
        <span>Data Dungeon CRM · {displayNameLabel}</span>
        <span>Confidential</span>
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="core" className="mt-4">
            <SegmentedTabsList className="grid-cols-2">
              <SegmentedTabsTrigger value="core">Core</SegmentedTabsTrigger>
              <SegmentedTabsTrigger value="intelligence">Intelligence</SegmentedTabsTrigger>
            </SegmentedTabsList>

            <TabsContent value="core" className="mt-4">
              <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                className="bg-input"
                value={editFormData.name || ""}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
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
            <ContactDuplicateAlert
              email={editFormData.email}
              phone={editFormData.phone}
              excludeId={id}
            />
            <div className="space-y-2">
              <Label>Date of birth</Label>
              <Input
                type="date"
                className="bg-input"
                value={editFormData.date_of_birth || ""}
                onChange={(e) => setEditFormData({ ...editFormData, date_of_birth: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">Optional — birthday list & reminders.</p>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                className="bg-input"
                value={editFormData.title || ""}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                placeholder="Mr, Mrs, Dr…"
              />
            </div>
            <div className="space-y-2">
              <Label>Salutation</Label>
              <Input
                className="bg-input"
                value={editFormData.salutation || ""}
                onChange={(e) => setEditFormData({ ...editFormData, salutation: e.target.value })}
                placeholder="Dear John"
              />
            </div>
            <div className="space-y-2">
              <Label>Home phone</Label>
              <Input
                className="bg-input"
                type="tel"
                value={editFormData.home_phone || ""}
                onChange={(e) => setEditFormData({ ...editFormData, home_phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Work phone</Label>
              <Input
                className="bg-input"
                type="tel"
                value={editFormData.work_phone || ""}
                onChange={(e) => setEditFormData({ ...editFormData, work_phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input
                className="bg-input"
                value={editFormData.company_name || ""}
                onChange={(e) => setEditFormData({ ...editFormData, company_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Job title</Label>
              <Input
                className="bg-input"
                value={editFormData.job_title || ""}
                onChange={(e) => setEditFormData({ ...editFormData, job_title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                className="bg-input"
                value={editFormData.website || ""}
                onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>LinkedIn</Label>
              <Input
                className="bg-input"
                value={editFormData.linkedin_url || ""}
                onChange={(e) => setEditFormData({ ...editFormData, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/in/…"
              />
            </div>
            <div className="space-y-2">
              <Label>X / Twitter</Label>
              <Input
                className="bg-input"
                value={editFormData.twitter_handle || ""}
                onChange={(e) => setEditFormData({ ...editFormData, twitter_handle: e.target.value })}
                placeholder="@handle"
              />
            </div>
            <div className="space-y-2">
              <Label>Instagram</Label>
              <Input
                className="bg-input"
                value={editFormData.instagram_url || ""}
                onChange={(e) => setEditFormData({ ...editFormData, instagram_url: e.target.value })}
                placeholder="@handle or URL"
              />
            </div>
            <div className="space-y-2">
              <Label>Facebook</Label>
              <Input
                className="bg-input"
                value={editFormData.facebook_url || ""}
                onChange={(e) => setEditFormData({ ...editFormData, facebook_url: e.target.value })}
                placeholder="Page name or URL"
              />
            </div>
            <div className="space-y-2">
              <Label>Client ref</Label>
              <Input
                className="bg-input"
                value={editFormData.client_ref || ""}
                onChange={(e) => setEditFormData({ ...editFormData, client_ref: e.target.value })}
              />
            </div>
            {id && (
              <div className="col-span-2 border-t border-border pt-4 mt-2">
                <ContactChannelsEdit contactId={id} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Source</Label>
              <Input
                className="bg-input"
                value={editFormData.source || ""}
                onChange={(e) => setEditFormData({ ...editFormData, source: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label title="How soon to follow up—not the same as Contact category (Top 100, Hot lead, etc.).">
                Urgency category
              </Label>
              <Select
                value={editFormData.category || "none"}
                onValueChange={(value) => setEditFormData({ ...editFormData, category: value === "none" ? "" : value })}
              >
                <SelectTrigger className="bg-input">
                  <SelectValue placeholder="Select urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {URGENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label title="Used by smart list chips (Top 100, Past client, Hot lead, …). This is not the same as urgency or saved views like Stale.">
                Contact category
              </Label>
              <Select
                value={editFormData.contact_category || "warm_lead"}
                onValueChange={(value) =>
                  setEditFormData({
                    ...editFormData,
                    contact_category: normalizeContactClassificationCategory(value),
                  })
                }
              >
                <SelectTrigger className="bg-input">
                  <SelectValue placeholder="Select contact category" />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_CLASSIFICATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Address Line 1</Label>
              <AddressAutocomplete
                className="bg-input"
                placeholder="Street address"
                value={editFormData.address_line1 || ""}
                onChange={(value) => setEditFormData({ ...editFormData, address_line1: value })}
                onPlaceSelected={(parts) =>
                  setEditFormData((prev: any) => ({
                    ...prev,
                    address_line1: parts.address_line1 || prev.address_line1 || "",
                    city: parts.city || prev.city || "",
                    state: parts.state || prev.state || "",
                    postcode: parts.postcode || prev.postcode || "",
                    country: parts.country || prev.country || "Australia",
                  }))
                }
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Address Line 2</Label>
              <Input
                className="bg-input"
                placeholder="Unit, suite, etc."
                value={editFormData.address_line2 || ""}
                onChange={(e) => setEditFormData({ ...editFormData, address_line2: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Suburb (city)</Label>
              <Input
                className="bg-input"
                value={editFormData.city || ""}
                onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Select
                value={editFormData.state || ""}
                onValueChange={(v) => setEditFormData({ ...editFormData, state: v })}
              >
                <SelectTrigger className="bg-input"><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {AUSTRALIAN_STATES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Postcode</Label>
              <Input
                className="bg-input"
                placeholder="e.g. 4163"
                value={editFormData.postcode || ""}
                onChange={(e) => setEditFormData({ ...editFormData, postcode: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input
                className="bg-input"
                value={editFormData.country || "Australia"}
                onChange={(e) => setEditFormData({ ...editFormData, country: e.target.value })}
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
              </div>
            </TabsContent>

            <TabsContent value="intelligence" className="mt-4">
              <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label>Story</Label>
              <Textarea
                className="bg-input min-h-[60px]"
                value={editFormData.story || ""}
                onChange={(e) => setEditFormData({ ...editFormData, story: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Selling Intentions</Label>
              <Textarea
                className="bg-input min-h-[60px]"
                value={editFormData.selling_intentions || ""}
                onChange={(e) => setEditFormData({ ...editFormData, selling_intentions: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Current Situation Notes</Label>
              <Textarea
                className="bg-input min-h-[60px]"
                value={editFormData.current_situation_notes || ""}
                onChange={(e) => setEditFormData({ ...editFormData, current_situation_notes: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                className="bg-input min-h-[80px]"
                value={editFormData.notes || ""}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
              />
            </div>
              </div>
            </TabsContent>
          </Tabs>
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
        <DialogContent className="sm:max-w-[400px] bg-card border-border">
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
              <Label htmlFor="log-interaction-subject">Subject *</Label>
              <Input
                id="log-interaction-subject"
                required
                aria-required
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

      {/* Link Property Dialog */}
      <Dialog open={linkPropertyOpen} onOpenChange={setLinkPropertyOpen}>
        <DialogContent className="sm:max-w-[420px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>Link property to contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Property</Label>
              <Select
                value={linkPropertyId}
                onValueChange={setLinkPropertyId}
                disabled={availableProperties.length === 0}
              >
                <SelectTrigger className="w-full bg-input">
                  <SelectValue placeholder={availableProperties.length === 0 ? "No properties available" : "Select property..."} />
                </SelectTrigger>
                <SelectContent>
                  {availableProperties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {formatPropertyAddress(p)}
                      {p.property_type && ` · ${p.property_type}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableProperties.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Create properties first, or they may all be linked already.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Relationship</Label>
              <Select value={linkRole} onValueChange={setLinkRole}>
                <SelectTrigger className="w-full bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LINK_ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                className="bg-input min-h-[60px]"
                placeholder="e.g. Primary contact, joint owner..."
                value={linkNotes}
                onChange={(e) => setLinkNotes(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setLinkPropertyOpen(false)}>Cancel</Button>
            <Button
              onClick={handleLinkProperty}
              disabled={!linkPropertyId || createLink.isPending}
            >
              {createLink.isPending ? "Linking..." : "Link property"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
