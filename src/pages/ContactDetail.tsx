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
import { AvatarCircle } from "@/components/ui/avatar-circle";
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
  Tag,
  Building2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  Handshake,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useContact } from "@/hooks/useContact";
import {
  useContacts,
  useUpdateContact,
  getPrimaryEmail,
  getPrimaryPhone,
  getAllEmails,
  getAllPhones,
  getTagNames,
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
import { ContactCardChannelRows } from "@/components/contacts/ContactCardChannelRows";
import { ContactSuiteCard } from "@/components/contacts/ContactSuiteCard";
import { ContactNurturePanel } from "@/components/contacts/ContactNurturePanel";
import { ContactExpandableSection } from "@/components/contacts/ContactExpandableSection";
import { ContactNurtureSummaryStrip } from "@/components/contacts/ContactNurtureSummaryStrip";
import { ContactActivitySummaryStrip } from "@/components/contacts/ContactActivitySummaryStrip";
import { ContactRelationshipBrief } from "@/components/contacts/ContactRelationshipBrief";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { LeadClassificationPanel } from "@/components/contacts/LeadClassificationPanel";
import { ContactScorePanel } from "@/components/contacts/ContactScorePanel";
import { ContactWorkspaceRail } from "@/components/contacts/ContactWorkspaceRail";
import { ContactBuyerRequirementsPanel } from "@/components/contacts/ContactBuyerRequirementsPanel";
import { ContactMatchingListingsPanel } from "@/components/contacts/ContactMatchingListingsPanel";
import { ContactRelatedContactsPanel } from "@/components/contacts/ContactRelatedContactsPanel";
import { ContactRequirementsPreview } from "@/components/contacts/ContactRequirementsPreview";
import { ContactOutreachPreferences } from "@/components/contacts/ContactOutreachPreferences";
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

type ContactUrgencyCategory = "immediate" | "priority" | "planned" | "backlog";
type ContactClassificationCategory =
  | "top_100"
  | "past_client"
  | "referral_partner"
  | "hot_lead"
  | "warm_lead"
  | "seller_nurture"
  | "active_buyer"
  | "seller_lead";

const CONTACT_CLASSIFICATION_OPTIONS: Array<{ value: ContactClassificationCategory; label: string }> = [
  { value: "top_100", label: "Top 100" },
  { value: "past_client", label: "Past Client" },
  { value: "referral_partner", label: "Referral Partner" },
  { value: "hot_lead", label: "Hot Lead" },
  { value: "warm_lead", label: "Warm Lead" },
  { value: "seller_nurture", label: "Seller Nurture" },
  { value: "active_buyer", label: "Active Buyer" },
  { value: "seller_lead", label: "Seller Lead" },
];

function normalizeContactCategory(value: string | null | undefined): ContactUrgencyCategory | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (raw === "immediate" || raw === "priority" || raw === "planned" || raw === "backlog") {
    return raw as ContactUrgencyCategory;
  }
  const legacyMap: Record<string, ContactUrgencyCategory> = {
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

function urgencyLabel(category: ContactUrgencyCategory | null): string {
  if (category === "immediate") return "Immediate";
  if (category === "priority") return "Priority";
  if (category === "planned") return "Planned";
  if (category === "backlog") return "Backlog";
  return "Unassigned";
}

function urgencyBadgeClass(category: ContactUrgencyCategory | null): string {
  if (category === "immediate") return "border-red-500/45 bg-red-500/15 text-red-200";
  if (category === "priority") return "border-amber-500/45 bg-amber-500/15 text-amber-200";
  if (category === "planned") return "border-sky-500/45 bg-sky-500/15 text-sky-200";
  if (category === "backlog") return "border-emerald-500/45 bg-emerald-500/15 text-emerald-200";
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
    raw === "seller_lead"
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
  const nurtureFocus = searchParams.get("nurtureFocus");
  const CONTACT_TABS = ["overview", "card", "requirements", "people", "properties"] as const;
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
    const cc = (contact as { contact_category?: string | null }).contact_category?.trim();
    const parts: string[] = [];
    if (cc) {
      const key = cc.toLowerCase();
      const labels: Record<string, string> = {
        top_100: "Top 100",
        past_client: "Past client",
        referral_partner: "Referral partner",
        hot_lead: "Hot lead",
        warm_lead: "Warm lead",
        seller_nurture: "Seller nurture",
      };
      parts.push(labels[key] ?? cc.replace(/_/g, " "));
    }
    if (contact.source?.trim()) parts.push(`Source: ${contact.source.trim()}`);
    return parts.join(" · ");
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
  const [activitySectionOpen, setActivitySectionOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

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

      <div className="grid grid-cols-1 gap-4 lg:gap-5 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)] print-contact-grid">
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          {id && <ContactWorkspaceRail contact={contact} contactId={id} />}
          {id && <ContactScorePanel contactId={id} />}
          {id && <LeadClassificationPanel mode="contact" entityId={id} record={contact} />}
        </div>

        <div className="space-y-5 print-contact-main">
          {id ? (
            <ContactRelationshipBrief
              contact={contact}
              className="print:hidden"
            />
          ) : null}

          {/* Overview */}
          <Card className="zoho-card p-5 sm:p-6 border-border print:border print:border-gray-300 print-section">
            <div className="flex items-start gap-4">
              <AvatarCircle
                name={displayName === "—" ? undefined : displayName}
                size="lg"
                initials={getInitials(undefined, undefined, displayName === "—" ? undefined : displayName)}
              />
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{displayNameLabel}</h1>
                {heroSubtitle ? (
                  <p className="mt-1 text-sm text-muted-foreground">{heroSubtitle}</p>
                ) : null}
                <div className="mt-2.5 mb-2.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="hidden text-[11px] uppercase tracking-wide text-muted-foreground sm:inline">Urgency</span>
                  <Badge
                    variant="outline"
                    className={`rounded-full border px-2.5 py-1 text-xs sm:px-3 sm:text-sm font-semibold ${urgencyBadgeClass(contactUrgency)}`}
                  >
                    {urgencyLabel(contactUrgency)}
                  </Badge>
                  {(contact as { contact_category?: string | null }).contact_category && (
                    <Badge variant="secondary" className="text-xs">
                      {normalizeContactClassificationCategory(
                        (contact as { contact_category?: string | null }).contact_category
                      ).replace(/_/g, " ")}
                    </Badge>
                  )}
                  {contact.lead_score != null && (
                    <Badge variant="secondary" className="tabular-nums text-xs sm:text-sm">
                      <span className="sm:hidden">Score {contact.lead_score}</span>
                      <span className="hidden sm:inline">Lead score {contact.lead_score}</span>
                    </Badge>
                  )}
                  {birthdayChip ? (
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/35">
                      {birthdayChip}
                    </span>
                  ) : null}
                  {(contact as { do_not_contact?: boolean | null }).do_not_contact ? (
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-destructive/15 text-destructive border border-destructive/35">
                      Do not contact
                    </span>
                  ) : null}
                  {(() => {
                    const raw = (contact as { next_touch_date?: string | null }).next_touch_date?.trim();
                    if (!raw) return null;
                    const d = parseISO(`${raw.slice(0, 10)}T12:00:00`);
                    if (!isValid(d)) return null;
                    return (
                      <span className="text-xs text-muted-foreground">
                        Next touch <span className="text-foreground font-medium">{format(d, "d MMM yyyy")}</span>
                      </span>
                    );
                  })()}
                </div>
                {id ? <ContactCardChannelRows contactId={id} contact={contact} /> : null}
                {getTagNames(contact).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    {getTagNames(contact).map((t, index) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className={`font-normal ${index >= 3 ? "hidden sm:inline-flex" : ""}`}
                      >
                        {t}
                      </Badge>
                    ))}
                    {getTagNames(contact).length > 3 ? (
                      <Badge variant="outline" className="font-normal sm:hidden">
                        +{getTagNames(contact).length - 3}
                      </Badge>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {id ? (
            <Tabs
              value={contactTab}
              onValueChange={(v) => setContactTab(v as ContactTab)}
              className="print:hidden"
            >
              <SegmentedTabsList className="grid-cols-2 sm:grid-cols-5">
                <SegmentedTabsTrigger value="overview">Overview</SegmentedTabsTrigger>
                <SegmentedTabsTrigger value="card">Contact card</SegmentedTabsTrigger>
                <SegmentedTabsTrigger value="requirements">Requirements</SegmentedTabsTrigger>
                <SegmentedTabsTrigger value="people">Related</SegmentedTabsTrigger>
                <SegmentedTabsTrigger value="properties">Properties</SegmentedTabsTrigger>
              </SegmentedTabsList>

              <TabsContent value="overview" className="mt-4 space-y-5">
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

              {contact ? (
                <ContactOutreachPreferences contact={contact} onUpdated={() => void refetch()} />
              ) : null}

          {/* Pain & Pleasure */}
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
