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
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarCircle } from "@/components/ui/avatar-circle";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Printer, 
  Mail, 
  Calendar, 
  MessageSquare, 
  Plus,
  Edit,
  Trash2,
  Clock,
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
import { useInteractions, useCreateInteraction, useDeleteInteraction, Interaction } from "@/hooks/useInteractions";
import { useAppointments } from "@/hooks/useAppointments";
import { EmailComposeDialog } from "@/components/contacts/EmailComposeDialog";
import { SendSmsDialog } from "@/components/contacts/SendSmsDialog";
import { ContactChannelsEdit } from "@/components/contacts/ContactChannelsEdit";
import { ContactCardChannelRows } from "@/components/contacts/ContactCardChannelRows";
import { ContactSuiteCard } from "@/components/contacts/ContactSuiteCard";
import { ContactNurturePanel } from "@/components/contacts/ContactNurturePanel";
import { LeadClassificationPanel } from "@/components/contacts/LeadClassificationPanel";
import { ContactScorePanel } from "@/components/contacts/ContactScorePanel";
import { ContactWorkspaceRail } from "@/components/contacts/ContactWorkspaceRail";
import { PrintNotesBody } from "@/components/contacts/ContactPrintLayout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, formatDistanceToNow } from "date-fns";
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
  | "seller_nurture";

const CONTACT_CLASSIFICATION_OPTIONS: Array<{ value: ContactClassificationCategory; label: string }> = [
  { value: "top_100", label: "Top 100" },
  { value: "past_client", label: "Past Client" },
  { value: "referral_partner", label: "Referral Partner" },
  { value: "hot_lead", label: "Hot Lead" },
  { value: "warm_lead", label: "Warm Lead" },
  { value: "seller_nurture", label: "Seller Nurture" },
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
    raw === "seller_nurture"
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

  const { data: contact, isLoading, isError, refetch } = useContact(id);

  const displayName = useMemo(() => (contact ? getContactDisplayName(contact) : ""), [contact]);
  const displayNameLabel = displayName === "—" ? "Contact" : displayName;
  const contactUrgency = normalizeContactCategory((contact as { category?: string | null } | null)?.category);

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
  const { data: contactsList = [] } = useContacts();
  const { data: interactions = [] } = useInteractions(id);
  const { data: appointments = [] } = useAppointments();
  const { data: allProperties = [] } = useProperties();

  const contactIndex = id ? contactsList.findIndex((c) => c.id === id) : -1;
  const prevContactId = contactIndex > 0 ? contactsList[contactIndex - 1]?.id : null;
  const nextContactId = contactIndex >= 0 && contactIndex < contactsList.length - 1 ? contactsList[contactIndex + 1]?.id : null;
  const updateContact = useUpdateContact();
  const createInteraction = useCreateInteraction();
  const deleteInteraction = useDeleteInteraction();
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
  const printFrameRef = useRef<HTMLIFrameElement>(null);

  const contactAppointments = appointments.filter(
    (apt) => apt.contact_id === id
  );

  const linkedProperties = useMemo(() => {
    if (!contact?.contact_property_links) return [];
    return contact.contact_property_links
      .map((link) => {
        const property = allProperties.find((p) => p.id === link.property_id);
        return property ? { ...link, property } : null;
      })
      .filter(Boolean) as Array<typeof contact.contact_property_links[0] & { property: typeof allProperties[0] }>;
  }, [contact?.contact_property_links, allProperties]);

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

  const handleDeleteInteraction = async (interactionId: string) => {
    if (!id) return;
    try {
      await deleteInteraction.mutateAsync({ id: interactionId, contactId: id });
      toast({ title: "Deleted", description: "Interaction removed" });
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
          { label: displayNameLabel },
        ]}
        className="mb-4 print:hidden"
      />
      <div className="flex items-center gap-4 mb-6 print:hidden">
        <div className="flex items-center gap-1">
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
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{displayNameLabel}</h1>
          <p className="text-muted-foreground">Contact Details</p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => id && openLogTouch({ contactId: id })}
          disabled={!id}
        >
          <Handshake className="w-4 h-4" /> Log touch
        </Button>
        <Button variant="outline" className="gap-2" asChild>
          <Link to="/scripts" className="inline-flex items-center gap-2">
            <FileText className="w-4 h-4" /> Scripts
          </Link>
        </Button>
        <Button variant="outline" onClick={handlePrint} className="gap-2">
          <Printer className="w-4 h-4" /> Print
        </Button>
        {getAllEmails(contact).length > 0 && (
          <Button variant="outline" onClick={() => setEmailComposeOpen(true)} className="gap-2">
            <Mail className="w-4 h-4" /> Send Email
          </Button>
        )}
        {getAllPhones(contact).length > 0 && (
          getAllPhones(contact).length === 1 ? (
            <Button variant="outline" onClick={() => { setSmsToNumber(getAllPhones(contact)[0].value); setSmsDialogOpen(true); }} className="gap-2">
              <MessageSquare className="w-4 h-4" /> Send SMS
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <MessageSquare className="w-4 h-4" /> Send SMS
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
        <Button onClick={handleStartEdit} className="gap-2">
          <Edit className="w-4 h-4" /> Edit
        </Button>
      </div>

      {getAllEmails(contact).length > 0 && (
        <EmailComposeDialog
          open={emailComposeOpen}
          onOpenChange={setEmailComposeOpen}
          to={getPrimaryEmail(contact) ?? contact.email ?? ""}
          contactId={id}
          contactName={displayName === "—" ? undefined : displayName}
          onSent={() => id && queryClient.invalidateQueries({ queryKey: ["interactions", id] })}
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
                src={id ? `/contacts/${id}/print` : undefined}
                className="w-full h-full min-h-[60vh] border-0 bg-white"
              />
            </div>
            <div className="flex justify-end gap-2 flex-shrink-0">
              <Button variant="outline" onClick={() => setPrintPreviewOpen(false)}>
                Close
              </Button>
              <Button onClick={handlePrintFromPreview} className="gap-2">
                <Printer className="w-4 h-4" /> Print
              </Button>
            </div>
          </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print-contact-grid">
        <div className="lg:col-span-2 space-y-6">
          {/* Overview */}
          <Card className="zoho-card p-6 border-border print:border print:border-gray-300 print-section">
            <div className="flex items-start gap-4">
              <AvatarCircle
                name={displayName === "—" ? undefined : displayName}
                size="lg"
                initials={getInitials(undefined, undefined, displayName === "—" ? undefined : displayName)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-foreground">{displayNameLabel}</h2>
                </div>
                <div className="mt-2 mb-3 flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Urgency</span>
                  <Badge
                    variant="outline"
                    className={`rounded-full border px-3 py-1 text-sm font-semibold ${urgencyBadgeClass(contactUrgency)}`}
                  >
                    {urgencyLabel(contactUrgency)}
                  </Badge>
                </div>
                {id ? <ContactCardChannelRows contactId={id} contact={contact} /> : null}
                {contact.source && (
                  <p className="text-sm text-muted-foreground mt-1">Source: {contact.source}</p>
                )}
                {getTagNames(contact).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    {getTagNames(contact).map((t) => (
                      <Badge key={t} variant="secondary" className="font-normal">{t}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {id && (
            <>
              {/* Timeline-first: running story before profile depth */}
              <Card className="zoho-card p-6 border-border print:hidden print-activity-card">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4 print:hidden">
                  <div>
                    <h3 className="font-semibold text-foreground">Activity timeline</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Calls, messages, and meetings — log touches from the workspace rail or header.
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setAddInteractionOpen(true)} className="gap-1 shrink-0">
                    <Plus className="w-4 h-4" /> Log
                  </Button>
                </div>
                <h3 className="font-semibold hidden print:block mb-4">Activity Timeline</h3>

                <div className="space-y-4 max-h-[min(520px,55vh)] sm:max-h-[600px] overflow-y-auto print:max-h-none">
                  {contactAppointments.map((apt) => (
                    <div key={apt.id} className="flex gap-3 pb-4 border-b border-border last:border-0">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{apt.title}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(apt.date), "PPp")}</p>
                        {apt.location && <p className="text-xs text-muted-foreground">{apt.location}</p>}
                      </div>
                    </div>
                  ))}

                  {interactions.map((interaction: Interaction) => (
                    <div key={interaction.id} className="flex gap-3 pb-4 border-b border-border last:border-0 group">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm capitalize">{interaction.type}</p>
                          <span className="print:hidden">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100"
                              onClick={() => handleDeleteInteraction(interaction.id)}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </span>
                        </div>
                        {interaction.subject && <p className="text-sm text-foreground">{interaction.subject}</p>}
                        {interaction.body && <p className="text-xs text-muted-foreground mt-1">{interaction.body}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            <span className="print:hidden">
                              {formatDistanceToNow(new Date(interaction.timestamp), { addSuffix: true })}
                            </span>
                            <span className="hidden print:inline">{format(new Date(interaction.timestamp), "d MMM yyyy, h:mm a")}</span>
                          </span>
                          {interaction.channel && (
                            <span className="text-xs bg-secondary px-1.5 py-0.5 rounded capitalize print:bg-gray-100 print:border print:border-gray-400 print:text-black">
                              {interaction.channel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {interactions.length === 0 && contactAppointments.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-4">No activity yet. Log your first interaction!</p>
                  )}
                </div>
              </Card>

              <ContactSuiteCard
                contactId={id}
                interactions={interactions}
                linkedPropertyIds={linkedProperties.map((l) => l.property_id)}
              />
            </>
          )}

          {id && <ContactNurturePanel contact={contact} contactId={id} />}

          {/* Contact information (address) */}
          <Card className="zoho-card p-6 border-border print:border print:border-gray-300 print-section">
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

          {/* Linked properties */}
          <Card className="zoho-card p-6 border-border print:border print:border-gray-300 print-section">
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

          {/* Story & Intent */}
          <Card className="zoho-card p-6 border-border print:border print:border-gray-300 print-section">
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

          {/* Pain & Pleasure */}
          <Card className="zoho-card p-6 border-border print:border print:border-gray-300 print-section">
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

          {contact.notes && (
            <Card className="zoho-card p-6 border-border print:border print:border-gray-300 print-section">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Notes</h3>
              <div className="text-foreground text-sm">
                <PrintNotesBody text={contact.notes} />
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6 lg:sticky lg:top-4 lg:self-start">
          {id && <ContactWorkspaceRail contact={contact} contactId={id} />}
          {id && <ContactScorePanel contactId={id} />}
          {id && <LeadClassificationPanel mode="contact" entityId={id} record={contact} />}
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
