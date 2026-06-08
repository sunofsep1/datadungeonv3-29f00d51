import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Home,
  Pencil,
  Calendar,
  Tag,
  User,
  ChevronLeft,
  ChevronRight,
  Share2,
  ExternalLink,
  ImagePlus,
  Bed,
  Bath,
  CarFront,
  Ruler,
  ChevronDown,
  Sparkles,
  Phone,
  Mail,
  MessageSquare,
} from "lucide-react";
import { formatPhoneDisplay, phoneToTelHref } from "@/lib/formatPhone";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { useListing, useUpdateListing, type Listing } from "@/hooks/useListings";
import { useContact } from "@/hooks/useContact";
import { useProperty, useUpdateProperty } from "@/hooks/useProperties";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { useToast } from "@/hooks/use-toast";
import { LeadClassificationPanel } from "@/components/contacts/LeadClassificationPanel";
import { collectListingHeroUrls } from "@/lib/listingFromProperty";
import {
  LISTING_PIPELINE_STAGE_OPTIONS,
  listingKanbanColumnId,
} from "@/lib/listingKanbanStages";
import {
  isAppraisalPipelineListing,
  pipelineDetailBackPath,
  pipelineRecordNoun,
} from "@/lib/appraisalListings";
import { formatContractWeekday } from "@/lib/contractTimeline";
import {
  getPrimaryCampaignStage,
  computeListingCampaignHealth,
  listingStageBannerClass,
  secondaryListingTags,
  daysInPrimaryStage,
} from "@/lib/listingCampaignDashboard";
import { ListingDetailHeaderStrip } from "@/components/listings/ListingDetailHeaderStrip";
import {
  ListingStickyActionBar,
  type ListingActionModalKey,
} from "@/components/listings/ListingStickyActionBar";
import { MatchBuyersSheet } from "@/components/listings/MatchBuyersSheet";
import { ListingContactLinksPanel } from "@/components/listings/ListingContactLinksPanel";
import { ListingOpenInspectionsPanel } from "@/components/listings/ListingOpenInspectionsPanel";
import { ListingOffersPanel } from "@/components/listings/ListingOffersPanel";
import { ListingActiveContractPanel } from "@/components/listings/ListingActiveContractPanel";
import { ListingCommissionPanel } from "@/components/listings/ListingCommissionPanel";
import { ListingMarketingFundsPanel } from "@/components/listings/ListingMarketingFundsPanel";
import { ListingInvoicesPanel } from "@/components/listings/ListingInvoicesPanel";
import { ListingPortalExportsPanel } from "@/components/listings/ListingPortalExportsPanel";
import { useListingContactLinks, useAddListingContactLink } from "@/hooks/useListingContactLinks";
import { useCreateContact } from "@/hooks/useContacts";
import {
  findContactDuplicates,
  normalizeContactEmail,
  normalizeContactPhoneKey,
} from "@/lib/contactConflictDetection";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDrako } from "@/components/drako";
import { pickDrakoLine } from "@/lib/drakoDialogue";
import { useDrakoProgress } from "@/hooks/useDrakoProgress";
import { useCreateListingOpenInspection } from "@/hooks/useListingOpenInspections";
import { addMinutesToIso, DEFAULT_OFI_DURATION_MINUTES } from "@/lib/ofiInspection";
import { EntityModificationsPanel } from "@/components/shared/EntityModificationsPanel";
import {
  ListingDetailSectionNav,
  type ListingDetailSectionId,
} from "@/components/listings/ListingDetailSectionNav";
import { ListingDetailRightRail } from "@/components/listings/ListingDetailRightRail";
import { ListingKeyDatesPanel } from "@/components/listings/ListingKeyDatesPanel";
import { ListingGeneralPanel } from "@/components/listings/ListingGeneralPanel";
import { ListingCompliancePanel } from "@/components/listings/ListingCompliancePanel";
import type { ListingGeneralFields } from "@/lib/listingGeneral";
import { ListingCampaignKpiRow } from "@/components/listings/ListingCampaignKpiRow";
import { ListingPricingPanel } from "@/components/listings/ListingPricingPanel";
import { ListingForSalePanel } from "@/components/listings/ListingForSalePanel";
import { ListingFeaturesPanel } from "@/components/listings/ListingFeaturesPanel";
import { ListingResourcesPanel } from "@/components/listings/ListingResourcesPanel";
import { ListingPipelineNextCard } from "@/components/listings/ListingPipelineNextCard";
import { useActivityLogByListing, useCreateActivityLog } from "@/hooks/useActivityLog";
import { useCreateAppointment } from "@/hooks/useAppointments";
import { useLogListingStageMove } from "@/hooks/useEvents";
import {
  getContactDisplayName,
  getPrimaryEmail,
  getPrimaryPhone,
  type ContactWithMeta,
} from "@/hooks/useContacts";
import { SendSmsDialog } from "@/components/contacts/SendSmsDialog";
import { AvatarCircle } from "@/components/ui/avatar-circle";
import { getInitials, cn } from "@/lib/utils";
import { listingPublicPriceLabel, listingSearchPrice } from "@/lib/listingPriceFields";
import { listingDaysOnMarket } from "@/lib/listingReports";

type ListingStatus = "active" | "pending" | "sold" | "withdrawn";

function formatAud(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

const LISTING_ACTION_MODAL_COPY: Record<ListingActionModalKey, { title: string; description?: string }> = {
  call_vendor: {
    title: "Call vendor",
    description: "Dial from this device, then optionally log the call on this listing’s timeline.",
  },
  log_feedback: { title: "Log feedback" },
  add_note: { title: "Add note" },
  book_inspection: { title: "Book inspection" },
  vendor_update: {
    title: "Send vendor update",
    description: "SMS, email, or a quick note — all tied to this listing when you log here.",
  },
  change_stage: { title: "Change pipeline stage" },
  log_enquiry: {
    title: "Log enquiry",
    description: "Capture a buyer enquiry, create or match a contact, and link them to this listing.",
  },
  match_buyers: { title: "Match buyers" },
};

function pipelineStageLabel(stageId: string): string {
  const o = LISTING_PIPELINE_STAGE_OPTIONS.find((s) => s.id === stageId);
  return o?.label ?? stageId;
}

function listingCampaignKpiFields(listing: Listing) {
  const L = listing as Record<string, unknown>;
  const n = (k: string) => {
    const v = L[k];
    return typeof v === "number" && Number.isFinite(v) ? v : 0;
  };
  const s = (k: string): string | null => (typeof L[k] === "string" ? (L[k] as string) : null);
  return {
    enquiryCount: n("campaign_enquiry_count"),
    lastEnquiryAt: s("campaign_last_enquiry_at"),
    inspectionCount: n("campaign_inspection_count"),
    nextInspectionAt: s("campaign_next_inspection_at"),
    offersCount: n("campaign_offers_count"),
    buyerMatchesCount: n("campaign_buyer_matches_count"),
    campaignStartAt: s("campaign_start_at"),
  };
}

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { moveTo, setMood } = useDrako();
  const { grantXp } = useDrakoProgress();
  const { data: listing, isLoading, isError, refetch } = useListing(id);
  const listingWithContact = listing as (Listing & { contact_id?: string | null }) | null;
  const contactId = listingWithContact?.contact_id ?? undefined;
  const { data: linkedContact } = useContact(contactId);
  const { data: linkedProperty } = useProperty(listing?.property_id ?? undefined);
  const updateListing = useUpdateListing();
  const updateProperty = useUpdateProperty();
  const { data: recentActivity = [] } = useActivityLogByListing(id ?? null, 4);
  const createActivityLog = useCreateActivityLog();
  const createAppointment = useCreateAppointment();
  const createOpenInspection = useCreateListingOpenInspection();
  const { data: listingContactLinks = [] } = useListingContactLinks(id);
  const addListingContactLink = useAddListingContactLink();
  const createContact = useCreateContact();
  const { logStageMove } = useLogListingStageMove();

  const linkedContactIds = useMemo(() => {
    const ids = new Set<string>();
    if (contactId) ids.add(contactId);
    for (const link of listingContactLinks) ids.add(link.contact_id);
    return Array.from(ids);
  }, [contactId, listingContactLinks]);

  const [editOpen, setEditOpen] = useState(false);
  const [actionModal, setActionModal] = useState<ListingActionModalKey | null>(null);
  const [matchBuyersOpen, setMatchBuyersOpen] = useState(false);
  const [feedbackBody, setFeedbackBody] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [inspectionTitle, setInspectionTitle] = useState("");
  const [inspectionDatetime, setInspectionDatetime] = useState("");
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [newPipelineStage, setNewPipelineStage] = useState<string>("appraisal");
  const [stageChangeNote, setStageChangeNote] = useState("");
  const [callLogNotes, setCallLogNotes] = useState("");
  const [vendorSmsOpen, setVendorSmsOpen] = useState(false);
  const [vendorTouchNote, setVendorTouchNote] = useState("");
  const [enquiryName, setEnquiryName] = useState("");
  const [enquiryPhone, setEnquiryPhone] = useState("");
  const [enquiryEmail, setEnquiryEmail] = useState("");
  const [enquiryMessage, setEnquiryMessage] = useState("");
  const [classifyOpen, setClassifyOpen] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroUploading, setHeroUploading] = useState(false);
  const [activeSection, setActiveSection] = useState<ListingDetailSectionId>("listing-overview");
  const contentRef = useRef<HTMLDivElement>(null);
  const heroFileRef = useRef<HTMLInputElement>(null);

  const handleSectionNavigate = useCallback((sectionId: ListingDetailSectionId) => {
    setActiveSection(sectionId);
    requestAnimationFrame(() => {
      const el = contentRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    });
  }, []);

  const [editForm, setEditForm] = useState({
    address: "",
    search_price: null as number | null,
    display_price: "",
    price: null as number | null,
    bedrooms: null as number | null,
    bathrooms: null as number | null,
    status: "active" as ListingStatus,
    notes: "",
    listing_image_url: "" as string,
  });

  const heroUrls = useMemo(
    () =>
      listing
        ? collectListingHeroUrls(listing.listing_image_url, linkedProperty?.images ?? null)
        : [],
    [listing, linkedProperty?.images]
  );

  const safeHeroIndex = heroUrls.length > 0 ? Math.min(heroIndex, heroUrls.length - 1) : 0;
  const activeHeroUrl = heroUrls.length > 0 ? heroUrls[safeHeroIndex] : null;

  const domDays = useMemo(() => {
    if (!listing) return null;
    return listingDaysOnMarket(listing as Listing & { key_date_listed?: string | null; campaign_start_at?: string | null });
  }, [listing]);

  const daysInStage = useMemo(() => {
    if (!listing) return 0;
    return daysInPrimaryStage(listing);
  }, [listing]);

  const primaryStage = useMemo(() => (listing ? getPrimaryCampaignStage(listing) : null), [listing]);
  const secondaryTags = useMemo(() => (listing ? secondaryListingTags(listing) : []), [listing]);
  const campaignHealth = useMemo(() => (listing ? computeListingCampaignHealth(listing) : null), [listing]);
  const recordNoun = useMemo(
    () => (listing ? pipelineRecordNoun(listing.pipeline_stage) : "Listing"),
    [listing],
  );
  const detailBackHref = useMemo(
    () => (listing ? pipelineDetailBackPath(listing.pipeline_stage) : "/listings"),
    [listing],
  );
  const isAppraisalRecord = listing ? isAppraisalPipelineListing(listing) : false;
  const isSoldListing = primaryStage?.key === "sold";

  const soldSubtitle = useMemo(() => {
    if (!listing || !isSoldListing) return null;
    const ext = listing as Listing & { key_date_settlement?: string | null };
    const settlementIso = ext.key_date_settlement?.slice(0, 10) ?? null;
    if (!settlementIso) return "Settlement pending";
    try {
      const settlement = parseISO(`${settlementIso}T12:00:00`);
      const dateLabel = format(settlement, "EEE, d MMMM yyyy");
      const days = differenceInCalendarDays(settlement, new Date());
      if (days > 0) return `Settling ${dateLabel}`;
      if (days === 0) return `Settling today · ${dateLabel}`;
      return `Settled · ${dateLabel}`;
    } catch {
      return `Settling ${formatContractWeekday(settlementIso)}`;
    }
  }, [listing, isSoldListing]);

  const contactMeta = (linkedContact ?? null) as ContactWithMeta | null;
  const primaryPhone = contactMeta ? getPrimaryPhone(contactMeta) : null;
  const primaryEmail = contactMeta ? getPrimaryEmail(contactMeta) : null;
  const telHref = phoneToTelHref(primaryPhone);
  const vendorMailtoHref = useMemo(() => {
    if (!listing?.address || !primaryEmail) return null;
    const q = new URLSearchParams({
      subject: `Listing update: ${listing.address}`,
      body: "Hi,\n\nQuick update on your listing:\n\n",
    });
    return `mailto:${primaryEmail}?${q.toString()}`;
  }, [listing?.address, primaryEmail]);

  const linkedName = linkedContact ? getContactDisplayName(linkedContact) : null;
  const agentLabel =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email?.split("@")[0] ??
    "You";

  const openEdit = () => {
    if (!listing) return;
    const ext = listing as Listing & { search_price?: number | null; display_price?: string | null };
    const searchVal = listingSearchPrice(ext);
    setEditForm({
      address: listing.address || "",
      search_price: searchVal,
      display_price: ext.display_price?.trim() ?? "",
      price: listing.price != null ? Number(listing.price) : null,
      bedrooms: listing.bedrooms ?? null,
      bathrooms: listing.bathrooms != null ? Number(listing.bathrooms) : null,
      status: (listing.status as ListingStatus) || "active",
      notes: listing.notes || "",
      listing_image_url: listing.listing_image_url?.trim() || "",
    });
    setClassifyOpen(false);
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!id || !editForm.address.trim()) {
      toast({ title: "Error", description: "Address is required", variant: "destructive" });
      return;
    }
    try {
      await updateListing.mutateAsync({
        id,
        address: editForm.address,
        search_price: editForm.search_price,
        display_price: editForm.display_price.trim() || null,
        price: editForm.search_price ?? editForm.price,
        bedrooms: editForm.bedrooms,
        bathrooms: editForm.bathrooms,
        status: editForm.status,
        notes: editForm.notes || null,
        listing_image_url: editForm.listing_image_url?.trim() || null,
      });
      toast({ title: "Success", description: `${recordNoun} updated` });
      setEditOpen(false);
      setHeroIndex(0);
      refetch();
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Update failed", variant: "destructive" });
    }
  };

  const handleStatusChange = async (status: ListingStatus) => {
    if (!id) return;
    try {
      await updateListing.mutateAsync({ id, status });
      toast({ title: "Updated", description: `Status set to ${status}` });
      refetch();
      if (status === "sold") {
        moveTo("center", { mood: "fire-breath" });
        setTimeout(() => setMood("celebrate", { caption: pickDrakoLine("dealClosed") }), 1200);
        grantXp("dealClosed");
      }
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Update failed", variant: "destructive" });
    }
  };

  const openListingAction = useCallback(
    (key: ListingActionModalKey) => {
      if (key === "match_buyers") {
        setMatchBuyersOpen(true);
        return;
      }
      if (listing) {
        if (key === "book_inspection") {
          setInspectionTitle(`Inspection — ${listing.address || "Listing"}`);
          setInspectionDatetime("");
          setInspectionNotes("");
        }
        if (key === "change_stage") {
          setNewPipelineStage(listingKanbanColumnId(listing.pipeline_stage));
          setStageChangeNote("");
        }
      }
      if (key === "log_enquiry") {
        setEnquiryName("");
        setEnquiryPhone("");
        setEnquiryEmail("");
        setEnquiryMessage("");
      }
      if (key === "log_feedback") setFeedbackBody("");
      if (key === "add_note") {
        setNoteTitle("");
        setNoteBody("");
      }
      if (key === "call_vendor") setCallLogNotes("");
      if (key === "vendor_update") setVendorTouchNote("");
      setActionModal(key);
    },
    [listing],
  );

  const submitLogEnquiry = async () => {
    if (!id || !listing) return;
    const name = enquiryName.trim();
    if (!name) {
      toast({ title: "Name required", description: "Enter the enquirer’s name.", variant: "destructive" });
      return;
    }
    const phone = enquiryPhone.trim() || null;
    const email = enquiryEmail.trim() || null;
    if (!phone && !email) {
      toast({
        title: "Phone or email required",
        description: "Add at least one way to follow up.",
        variant: "destructive",
      });
      return;
    }
    try {
      const collected = new Map<string, { id: string; name: string | null; email: string | null; phone: string | null; mobile: string | null }>();
      const normEmail = normalizeContactEmail(email);
      const phoneKey = normalizeContactPhoneKey(phone);
      if (user?.id) {
        const scope = `user_id.eq.${user.id},owner_id.eq.${user.id}`;
        if (normEmail) {
          const { data } = await supabase
            .from("contacts")
            .select("id, name, email, phone, mobile")
            .or(scope)
            .ilike("email", normEmail)
            .limit(8);
          for (const row of data ?? []) collected.set(row.id, row);
        }
        if (phoneKey) {
          const tail = phoneKey.slice(-8);
          const { data } = await supabase
            .from("contacts")
            .select("id, name, email, phone, mobile")
            .or(scope)
            .or(`phone.ilike.%${tail}%,mobile.ilike.%${tail}%`)
            .limit(8);
          for (const row of data ?? []) collected.set(row.id, row);
        }
      }
      let contactIdForEnquiry: string | null = null;
      const dupes = findContactDuplicates([...collected.values()], { email, phone });
      if (dupes.length > 0) {
        contactIdForEnquiry = dupes[0]!.id;
      } else {
        const created = await createContact.mutateAsync({
          name,
          phone,
          email,
          source: `Listing enquiry — ${listing.address || "listing"}`,
          status: "lead",
          skipActivityLog: true,
        });
        contactIdForEnquiry = created.id;
      }
      if (contactIdForEnquiry) {
        try {
          await addListingContactLink.mutateAsync({
            listing_id: id,
            contact_id: contactIdForEnquiry,
            role: "prospective_buyer",
          });
        } catch {
          /* may already be linked */
        }
      }
      const msg = enquiryMessage.trim();
      await createActivityLog.mutateAsync({
        activity_type: "note",
        title: `Enquiry — ${name}`,
        description: [msg, phone ? `Phone: ${phone}` : null, email ? `Email: ${email}` : null]
          .filter(Boolean)
          .join("\n"),
        listing_id: id,
        contact_id: contactIdForEnquiry,
        property_id: listing.property_id ?? null,
      });
      const prevEnq = Number((listing as Record<string, unknown>).campaign_enquiry_count) || 0;
      try {
        await updateListing.mutateAsync({
          id,
          campaign_enquiry_count: prevEnq + 1,
          campaign_last_enquiry_at: new Date().toISOString(),
        } as Parameters<typeof updateListing.mutateAsync>[0]);
      } catch {
        /* optional campaign columns */
      }
      toast({ title: "Enquiry logged", description: "Contact linked as prospective buyer." });
      setActionModal(null);
      refetch();
    } catch (e) {
      toast({
        title: "Could not log enquiry",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const submitLogFeedback = async () => {
    if (!id || !listing) return;
    const body = feedbackBody.trim();
    if (!body) {
      toast({
        title: "Add some feedback",
        description: "Enter details before saving.",
        variant: "destructive",
      });
      return;
    }
    try {
      await createActivityLog.mutateAsync({
        activity_type: "note",
        title: "Buyer / vendor feedback",
        description: body,
        listing_id: id,
        contact_id: contactId ?? null,
        property_id: listing.property_id ?? null,
      });
      toast({ title: "Saved", description: "Feedback appears on the activity timeline below." });
      setActionModal(null);
      refetch();
    } catch (e) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const submitQuickNote = async () => {
    if (!id || !listing) return;
    if (!noteTitle.trim() && !noteBody.trim()) {
      toast({
        title: "Add a note",
        description: "Enter a title or some text before saving.",
        variant: "destructive",
      });
      return;
    }
    const title = noteTitle.trim() || "Note";
    const desc = noteBody.trim() || null;
    try {
      await createActivityLog.mutateAsync({
        activity_type: "note",
        title,
        description: desc,
        listing_id: id,
        contact_id: contactId ?? null,
        property_id: listing.property_id ?? null,
      });
      toast({ title: "Note added", description: "Visible on this listing’s timeline." });
      setActionModal(null);
      refetch();
    } catch (e) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const submitBookInspection = async () => {
    if (!id || !listing) return;
    const dt = inspectionDatetime.trim();
    if (!dt) {
      toast({
        title: "Pick date & time",
        description: "Choose when the inspection is scheduled.",
        variant: "destructive",
      });
      return;
    }
    const iso = new Date(dt).toISOString();
    const title = inspectionTitle.trim() || `Inspection — ${listing.address || "Listing"}`;
    try {
      const endsAt = addMinutesToIso(iso, DEFAULT_OFI_DURATION_MINUTES);
      await createOpenInspection.mutateAsync({
        listing_id: id,
        starts_at: iso,
        ends_at: endsAt,
        open_type: "advertised",
      });
      await createAppointment.mutateAsync({
        title,
        date: iso,
        notes: inspectionNotes.trim() || null,
        contact_id: contactId ?? null,
        type: "inspection",
      });
      await createActivityLog.mutateAsync({
        activity_type: "inspection",
        title,
        description: inspectionNotes.trim() || `Scheduled for ${format(new Date(iso), "d MMM yyyy, h:mm a")}`,
        listing_id: id,
        contact_id: contactId ?? null,
        property_id: listing.property_id ?? null,
      });
      toast({
        title: "Inspection booked",
        description: "Open inspection with QR check-in, plus calendar and timeline.",
      });
      setActionModal(null);
      refetch();
    } catch (e) {
      toast({
        title: "Could not book",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const submitChangeStage = async () => {
    if (!id || !listing) return;
    const oldRaw = listing.pipeline_stage || "appraisal";
    const oldCol = listingKanbanColumnId(oldRaw);
    if (newPipelineStage === oldCol) {
      toast({
        title: "No change",
        description: "Select a different stage than the listing is in now.",
        variant: "destructive",
      });
      return;
    }
    try {
      await updateListing.mutateAsync({
        id,
        pipeline_stage: newPipelineStage,
        previous_pipeline_stage: oldRaw,
      });
      await createActivityLog.mutateAsync({
        activity_type: "status_change",
        title: `Pipeline: ${pipelineStageLabel(oldCol)} → ${pipelineStageLabel(newPipelineStage)}`,
        description: stageChangeNote.trim() || null,
        listing_id: id,
        contact_id: contactId ?? null,
        property_id: listing.property_id ?? null,
      });
      await logStageMove(id, contactId ?? null, oldRaw, newPipelineStage, listing.address || "Listing");
      toast({
        title: "Stage updated",
        description: `Pipeline is now ${pipelineStageLabel(newPipelineStage)}. The board will match on refresh.`,
      });
      setMood("growth-chart", { caption: pickDrakoLine("pipeline") });
      grantXp("pipelineAdvance");
      setActionModal(null);
      refetch();
    } catch (e) {
      toast({
        title: "Could not update stage",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const submitLogCall = async () => {
    if (!id || !listing) return;
    if (!contactId) {
      toast({ title: "No contact", description: "Link a contact to this listing first.", variant: "destructive" });
      return;
    }
    try {
      await createActivityLog.mutateAsync({
        activity_type: "call",
        title: callLogNotes.trim() ? "Call — vendor / contact" : "Call logged",
        description: callLogNotes.trim() || null,
        listing_id: id,
        contact_id: contactId,
        property_id: listing.property_id ?? null,
      });
      toast({ title: "Logged", description: "Call added to the activity timeline." });
      setActionModal(null);
      refetch();
    } catch (e) {
      toast({
        title: "Could not log call",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const submitVendorTouchNote = async () => {
    if (!id || !listing) return;
    const t = vendorTouchNote.trim();
    if (!t) {
      toast({ title: "Add a note", description: "Describe what you sent or discussed.", variant: "destructive" });
      return;
    }
    try {
      await createActivityLog.mutateAsync({
        activity_type: "note",
        title: "Vendor / listing touchpoint",
        description: t,
        listing_id: id,
        contact_id: contactId ?? null,
        property_id: listing.property_id ?? null,
      });
      toast({ title: "Saved", description: "Note added to the timeline." });
      setVendorTouchNote("");
      setActionModal(null);
      refetch();
    } catch (e) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const handleShare = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (!url) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: listing?.address || "Listing",
          url,
        });
        return;
      }
    } catch {
      /* user cancelled or share failed */
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: "Listing URL is on your clipboard." });
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  }, [listing?.address, toast]);

  const handleHeroFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id || !user || !listing) {
      e.target.value = "";
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Invalid file", description: "Use JPEG, PNG, WebP, or GIF.", variant: "destructive" });
      e.target.value = "";
      return;
    }
    setHeroUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/listings/${id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("property-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("property-images").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      await updateListing.mutateAsync({ id, listing_image_url: publicUrl });
      if (listing.property_id) {
        try {
          const cur = Array.isArray(linkedProperty?.images) ? (linkedProperty!.images as string[]) : [];
          const merged = [...cur];
          if (!merged.includes(publicUrl)) merged.unshift(publicUrl);
          await updateProperty.mutateAsync({ id: listing.property_id, images: merged });
        } catch {
          /* property schema or RLS */
        }
      }
      setEditForm((f) => ({ ...f, listing_image_url: publicUrl }));
      setHeroIndex(0);
      toast({ title: "Photo added", description: "Hero image updated on this listing." });
      refetch();
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Could not upload",
        variant: "destructive",
      });
    } finally {
      setHeroUploading(false);
      e.target.value = "";
    }
  };

  const goHero = (delta: number) => {
    if (heroUrls.length === 0) return;
    setHeroIndex((i) => {
      const next = (i + delta + heroUrls.length) % heroUrls.length;
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <Skeleton className="h-10 w-48 mb-4" />
        <Skeleton className="h-56 w-full mb-6 rounded-xl" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="animate-fade-in text-center py-12">
        <Home className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="font-medium text-foreground mb-2">Couldn&apos;t load listing</p>
        <Button variant="outline" onClick={() => refetch()}>Retry</Button>
        <Button variant="ghost" onClick={() => navigate("/dashboard")}>Back</Button>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="animate-fade-in text-center py-12">
        <p className="text-muted-foreground">Listing not found</p>
        <Button variant="outline" onClick={() => navigate("/dashboard")} className="mt-4">Back</Button>
      </div>
    );
  }

  const landSqm = linkedProperty?.land_area_sqm ?? null;
  const carSpaces = linkedProperty?.car_spaces ?? null;
  const beds = listing.bedrooms ?? linkedProperty?.bedrooms ?? null;
  const baths = listing.bathrooms ?? linkedProperty?.bathrooms ?? null;

  const kpi = listingCampaignKpiFields(listing);

  return (
    <div className="animate-fade-in max-w-6xl mx-auto px-3 sm:px-0">
      <PageBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          {
            label: isAppraisalRecord ? "Appraisals" : "Listings",
            href: detailBackHref,
          },
          { label: listing.address || recordNoun },
        ]}
        className="mb-3"
      />

      <div
        className={cn(
          "sticky top-0 z-40 -mx-3 sm:-mx-0 mb-4 rounded-xl px-3 sm:px-4 py-2 sm:py-3",
          listingStageBannerClass(primaryStage?.key ?? "appraisal"),
        )}
      >
        {primaryStage && campaignHealth ? (
          <ListingDetailHeaderStrip
            listingId={listing.id}
            address={listing.address || recordNoun}
            suburb={linkedProperty?.suburb ?? null}
            primaryStage={primaryStage}
            secondaryTags={secondaryTags}
            daysInStage={daysInStage}
            stageLabelForDays={primaryStage.label}
            health={campaignHealth}
            backHref={detailBackHref}
            backLabel={isAppraisalRecord ? "Back to appraisals" : "Back to listings"}
            entityFallback={recordNoun}
            soldSubtitle={soldSubtitle}
            headerActions={
              <>
                <Button variant="outline" size="sm" onClick={() => void handleShare()} className="gap-1.5 h-8 text-xs">
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </Button>
                <Button variant="outline" size="sm" asChild className="gap-1.5 h-8 text-xs">
                  <Link to={`/listings/${listing.id}/vendor-preview`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Vendor preview
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={openEdit} className="gap-1.5 h-8 text-xs">
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/calendar")} className="gap-1.5 h-8 text-xs">
                  <Calendar className="w-3.5 h-3.5" />
                  Viewing
                </Button>
                {(listing.status === "active" || listing.status === "pending") && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleStatusChange("sold")}
                      className="gap-1.5 h-8 text-xs"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      Mark sold
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void handleStatusChange("withdrawn")} className="h-8 text-xs">
                      Off-market
                    </Button>
                  </>
                )}
              </>
            }
          />
        ) : null}
        <ListingDetailSectionNav
          activeSection={activeSection}
          onNavigate={handleSectionNavigate}
          className="mt-2 pt-2 border-t border-border/60"
        />
        <ListingStickyActionBar onOpenAction={openListingAction} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-6">
        <div ref={contentRef} className="min-w-0 space-y-6 scroll-mt-28">
      {activeSection === "listing-overview" && (
      <>
      {/* Hero / gallery */}
      <Card id="listing-overview" className="zoho-card mb-0 border-border overflow-hidden rounded-xl shadow-sm scroll-mt-28">
        <div className="relative min-h-[220px] sm:min-h-[320px] md:min-h-[380px] bg-muted">
          {activeHeroUrl ? (
            <>
              <img
                src={activeHeroUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-muted via-muted/80 to-primary/10 text-muted-foreground">
              <Home className="w-16 h-16 mb-2 opacity-40" />
              <p className="text-sm font-medium">No photos yet</p>
              <p className="text-xs mt-1 max-w-xs text-center px-4">
                Add a hero shot from Edit, or attach images on the linked property.
              </p>
            </div>
          )}

          {heroUrls.length > 1 && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/90 shadow-md z-10"
                onClick={() => goHero(-1)}
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/90 shadow-md z-10"
                onClick={() => goHero(1)}
                aria-label="Next photo"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
              <div className="absolute bottom-24 left-0 right-0 flex justify-center gap-1 z-10">
                {heroUrls.map((u, i) => (
                  <button
                    key={u + i}
                    type="button"
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === safeHeroIndex ? "w-6 bg-white" : "w-1.5 bg-white/50"
                    )}
                    onClick={() => setHeroIndex(i)}
                    aria-label={`Photo ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 z-10">
            <p className="text-white font-semibold text-lg sm:text-2xl leading-tight drop-shadow-sm line-clamp-2">
              {listing.address}
            </p>
            <p className="text-white/95 text-xl sm:text-3xl font-bold mt-1 tabular-nums drop-shadow-sm">
              {listingPublicPriceLabel(
                listing as Listing & { search_price?: number | null; display_price?: string | null },
                formatAud,
              )}
            </p>
          </div>
        </div>

        {/* Spec strip — spaced tiles so content does not sit on shared grid lines */}
        <div className="border-t border-border bg-muted/15 p-3 sm:p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {[
              {
                icon: Bed,
                label: "Beds",
                value: beds != null ? String(beds) : "—",
              },
              {
                icon: Bath,
                label: "Baths",
                value: baths != null ? String(baths) : "—",
              },
              {
                icon: CarFront,
                label: "Parking",
                value: carSpaces != null ? String(carSpaces) : "—",
              },
              {
                icon: Ruler,
                label: "Land",
                value: landSqm != null ? `${landSqm} m²` : "—",
              },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-lg border border-border/70 bg-card p-3 sm:p-3.5 shadow-sm"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
                  <p className="text-sm font-semibold text-foreground tabular-nums truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <ListingCampaignKpiRow
        domDays={domDays}
        enquiryCount={kpi.enquiryCount}
        lastEnquiryAt={kpi.lastEnquiryAt}
        inspectionCount={kpi.inspectionCount}
        nextInspectionAt={kpi.nextInspectionAt}
        offersCount={kpi.offersCount}
        buyerMatchesCount={kpi.buyerMatchesCount}
        campaignStartAt={kpi.campaignStartAt}
        createdAt={listing.created_at}
      />

      {id ? (
        <ListingActiveContractPanel
          listingId={id}
          listingAddress={listing.address}
          pipelineStage={listing.pipeline_stage}
          onListingUpdated={() => void refetch()}
        />
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="zoho-card p-6 border-border lg:col-span-2">
          <h3 className="text-sm font-medium text-foreground/90 mb-4">Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {listingSearchPrice(
              listing as Listing & { search_price?: number | null; display_price?: string | null },
            ) != null && (
              <div>
                <span className="text-muted-foreground">Search price (internal)</span>
                <p className="font-medium">
                  {formatAud(
                    listingSearchPrice(
                      listing as Listing & { search_price?: number | null; display_price?: string | null },
                    ),
                  )}
                </p>
              </div>
            )}
            {(listing as Listing & { display_price?: string | null }).display_price?.trim() ? (
              <div>
                <span className="text-muted-foreground">Display price (portal)</span>
                <p className="font-medium">
                  {(listing as Listing & { display_price?: string | null }).display_price}
                </p>
              </div>
            ) : null}
            {listing.property_type && (
              <div>
                <span className="text-muted-foreground">Type</span>
                <p className="font-medium capitalize">{listing.property_type}</p>
              </div>
            )}
            {listing.status && (
              <div>
                <span className="text-muted-foreground">Status</span>
                <p className="font-medium capitalize">{listing.status}</p>
              </div>
            )}
            {listing.notes && (
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">Notes</span>
                <p className="font-medium whitespace-pre-wrap mt-1">{listing.notes}</p>
              </div>
            )}
            {listing.property_id && (
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">Linked property</span>
                <p className="mt-1">
                  <Button variant="link" className="h-auto p-0 text-primary" asChild>
                    <Link to={`/properties/${listing.property_id}`}>Open property record →</Link>
                  </Button>
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card className="zoho-card p-6 border-border">
          <h3 className="text-sm font-medium text-foreground/90 mb-4 flex items-center gap-2">
            <User className="w-4 h-4" />
            Linked contact
          </h3>
          {contactId && linkedContact ? (
            <div>
              <p className="font-medium text-foreground">{linkedName}</p>
              {(linkedContact.email || (linkedContact as { phone?: string }).phone) && (
                <p className="text-sm text-muted-foreground mt-1">
                  {linkedContact.email ?? formatPhoneDisplay((linkedContact as { phone?: string }).phone)}
                </p>
              )}
              <Button variant="ghost" size="sm" className="mt-2 px-0" asChild>
                <Link to={`/contacts/${contactId}`}>View contact →</Link>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No linked contact</p>
          )}
        </Card>
      </div>
      </>
      )}

      {activeSection === "listing-pricing" && (
      <div id="listing-pricing" className="space-y-6 scroll-mt-28">
        <ListingForSalePanel
          listing={
            listing as Listing & {
              search_price?: number | null;
              display_price?: string | null;
              search_price_min?: number | null;
              search_price_max?: number | null;
            }
          }
          onUpdated={() => void refetch()}
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 min-w-0">
            <ListingPricingPanel
              listingId={listing.id}
              listingPrice={listingSearchPrice(
                listing as Listing & { search_price?: number | null; display_price?: string | null },
              )}
              onListingUpdated={() => void refetch()}
            />
          </div>
          <div className="lg:col-span-1 min-w-0">
            <ListingPipelineNextCard pipelineStage={listing.pipeline_stage} />
          </div>
        </div>
      </div>
      )}

      {activeSection === "listing-general" && (
      <div id="listing-general" className="scroll-mt-28">
        <ListingGeneralPanel
          listing={listing as Listing & ListingGeneralFields}
          onUpdated={() => void refetch()}
        />
      </div>
      )}

      {activeSection === "listing-details" && (
      <div id="listing-details" className="grid grid-cols-1 md:grid-cols-2 gap-4 scroll-mt-28">
        <Card className="zoho-card p-4 border-border md:col-span-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Agent</h3>
          <div className="flex items-center gap-3">
            <AvatarCircle name={agentLabel} initials={getInitials(undefined, undefined, agentLabel)} size="md" />
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">{agentLabel}</p>
              {user?.email && (
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              )}
              <Link to="/settings/automations" className="text-xs text-primary hover:underline mt-0.5 inline-block">
                Profile settings
              </Link>
            </div>
          </div>
        </Card>

        <Card className="zoho-card p-4 border-border md:col-span-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Recent activity</h3>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No logged activity yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentActivity.slice(0, 3).map((row) => (
                <li key={row.id} className="text-sm border-b border-border/60 last:border-0 pb-2 last:pb-0">
                  <p className="font-medium text-foreground line-clamp-1">{row.title}</p>
                  {row.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{row.description}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {format(new Date(row.occurred_at), "d MMM yyyy, h:mm a")}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {recentActivity.length > 3 ? (
            <Button type="button" variant="link" className="h-auto p-0 mt-2 text-xs" onClick={() => handleSectionNavigate("listing-activity")}>
              View all activity →
            </Button>
          ) : null}
        </Card>
      </div>
      )}

      {activeSection === "listing-features" && (
      <div id="listing-features" className="scroll-mt-28">
        <ListingFeaturesPanel
          listingId={listing.id}
          propertyId={listing.property_id}
          marketingHeadline={
            (listing as Listing & { marketing_headline?: string | null }).marketing_headline
          }
          marketingDescription={
            (listing as Listing & { marketing_description?: string | null }).marketing_description
          }
          featureFlags={(listing as Listing & { feature_flags?: unknown }).feature_flags}
          bedrooms={beds}
          bathrooms={baths}
          landSqm={landSqm}
          buildingSqm={linkedProperty?.floor_area_sqm ?? null}
          onUpdated={() => void refetch()}
        />
      </div>
      )}

      {activeSection === "listing-resources" && (
      <div id="listing-resources" className="scroll-mt-28">
        <ListingResourcesPanel
          listingId={listing.id}
          heroUrls={heroUrls}
          listingImageUrl={listing.listing_image_url}
          onUpdated={() => void refetch()}
        />
      </div>
      )}

      {activeSection === "listing-inspections" && id ? (
          <div id="listing-inspections" className="scroll-mt-28">
            <ListingOpenInspectionsPanel listingId={id} listingAddress={listing.address} />
          </div>
      ) : null}

      {activeSection === "listing-offers" && id ? (
          <div id="listing-offers" className="scroll-mt-28">
            <ListingOffersPanel listingId={id} listingAddress={listing.address} />
          </div>
      ) : null}

      {activeSection === "listing-commission" && id ? (
          <div id="listing-commission" className="scroll-mt-28">
            <ListingCommissionPanel listing={listing} listingId={id} />
          </div>
      ) : null}

      {activeSection === "listing-marketing" && id ? (
        <>
          <div id="listing-marketing" className="scroll-mt-28">
            <ListingMarketingFundsPanel listingId={id} />
          </div>
          <div id="listing-invoices" className="scroll-mt-28">
            <ListingInvoicesPanel listingId={id} />
          </div>
        </>
      ) : null}

      {activeSection === "listing-portals" && id ? (
          <div id="listing-portals" className="scroll-mt-28">
            <ListingPortalExportsPanel
              listingId={id}
              listingAddress={listing.address}
              addressDisplayMode={
                (listing as Listing & { address_display_mode?: string | null }).address_display_mode
              }
              hideAddressPortal={
                (listing as Listing & { hide_address_portal?: boolean | null }).hide_address_portal ?? false
              }
              onListingUpdated={() => void refetch()}
            />
          </div>
      ) : null}

      {activeSection === "listing-people" && id ? (
        <>
          <div id="listing-people" className="grid grid-cols-1 lg:grid-cols-2 gap-4 scroll-mt-28">
            <ListingContactLinksPanel listingId={id} />
            <ListingCompliancePanel
              listingId={id}
              compliance_agency_agreement_signed={
                (listing as { compliance_agency_agreement_signed?: boolean }).compliance_agency_agreement_signed
              }
              compliance_id_verified={
                (listing as { compliance_id_verified?: boolean }).compliance_id_verified
              }
              compliance_form6_uploaded={
                (listing as { compliance_form6_uploaded?: boolean }).compliance_form6_uploaded
              }
            />
          </div>
          <EntityModificationsPanel entityType="listing" entityId={id} className="xl:hidden" />
        </>
      ) : null}

      {activeSection === "listing-activity" && (
      <Card id="listing-activity" className="zoho-card p-6 border-border scroll-mt-28">
        <ActivityTimeline
          entityType="listing"
          entityId={id}
          linkedContactIds={linkedContactIds}
          showAddNote={true}
          compact={true}
          collapseSimilar={true}
          pageSize={12}
        />
      </Card>
      )}
        </div>

        {id ? (
          <div className="hidden xl:block space-y-4">
            <ListingKeyDatesPanel
              listingId={id}
              keyDateListed={
                (listing as Listing & { key_date_listed?: string | null }).key_date_listed
              }
              keyDateAgencyExpiry={
                (listing as Listing & { key_date_agency_expiry?: string | null }).key_date_agency_expiry
              }
              keyDateSettlement={
                (listing as Listing & { key_date_settlement?: string | null }).key_date_settlement
              }
              onUpdated={() => void refetch()}
            />
            <ListingDetailRightRail
              listing={listing}
              listingId={id}
              domDays={domDays}
              linkedContactIds={linkedContactIds}
              onMatchBuyers={() => setMatchBuyersOpen(true)}
              onNavigateSection={handleSectionNavigate}
              formatAud={formatAud}
            />
          </div>
        ) : null}
      </div>

      <Dialog open={actionModal != null} onOpenChange={(open) => !open && setActionModal(null)}>
        <DialogContent className="sm:max-w-lg bg-card border-border max-h-[min(90vh,720px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {actionModal ? LISTING_ACTION_MODAL_COPY[actionModal].title : "Action"}
            </DialogTitle>
            {actionModal &&
            ["call_vendor", "vendor_update", "log_enquiry"].includes(actionModal) &&
            LISTING_ACTION_MODAL_COPY[actionModal].description ? (
              <DialogDescription className="text-sm leading-relaxed">
                {LISTING_ACTION_MODAL_COPY[actionModal].description}
              </DialogDescription>
            ) : actionModal === "log_feedback" ? (
              <DialogDescription className="text-sm leading-relaxed">
                Saved to this listing&apos;s activity timeline below.
              </DialogDescription>
            ) : actionModal === "add_note" ? (
              <DialogDescription className="text-sm leading-relaxed">
                Same as Add note on the timeline — quick access from the bar.
              </DialogDescription>
            ) : actionModal === "book_inspection" ? (
              <DialogDescription className="text-sm leading-relaxed">
                Schedules an open inspection with QR check-in, plus a calendar entry and timeline note.
              </DialogDescription>
            ) : actionModal === "change_stage" && listing ? (
              <DialogDescription className="text-sm leading-relaxed">
                Currently:{" "}
                <span className="font-medium text-foreground">
                  {pipelineStageLabel(listingKanbanColumnId(listing.pipeline_stage))}
                </span>
                . Same stages as the listings board.
              </DialogDescription>
            ) : null}
          </DialogHeader>

          {actionModal === "log_enquiry" ? (
            <div className="space-y-3 py-2">
              <div>
                <Label htmlFor="enquiry-name">Name *</Label>
                <Input
                  id="enquiry-name"
                  className="bg-input mt-1.5"
                  value={enquiryName}
                  onChange={(e) => setEnquiryName(e.target.value)}
                  placeholder="Buyer name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="enquiry-phone">Phone</Label>
                  <Input
                    id="enquiry-phone"
                    className="bg-input mt-1.5"
                    value={enquiryPhone}
                    onChange={(e) => setEnquiryPhone(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="enquiry-email">Email</Label>
                  <Input
                    id="enquiry-email"
                    className="bg-input mt-1.5"
                    value={enquiryEmail}
                    onChange={(e) => setEnquiryEmail(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="enquiry-msg">Message</Label>
                <Textarea
                  id="enquiry-msg"
                  className="bg-input mt-1.5 min-h-[88px] text-sm"
                  value={enquiryMessage}
                  onChange={(e) => setEnquiryMessage(e.target.value)}
                  placeholder="What they asked, price feedback, finance…"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setActionModal(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void submitLogEnquiry()}
                  disabled={createActivityLog.isPending || createContact.isPending}
                >
                  {createActivityLog.isPending || createContact.isPending ? "Saving…" : "Save enquiry"}
                </Button>
              </div>
            </div>
          ) : null}

          {actionModal === "log_feedback" ? (
            <div className="space-y-3 py-2">
              <div>
                <Label htmlFor="listing-feedback">Feedback</Label>
                <Textarea
                  id="listing-feedback"
                  className="bg-input mt-1.5 min-h-[120px] text-sm"
                  value={feedbackBody}
                  onChange={(e) => setFeedbackBody(e.target.value)}
                  placeholder="e.g. Buyer loved the kitchen; vendor open to offers before auction…"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setActionModal(null)}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => void submitLogFeedback()} disabled={createActivityLog.isPending}>
                  {createActivityLog.isPending ? "Saving…" : "Save to timeline"}
                </Button>
              </div>
            </div>
          ) : null}

          {actionModal === "add_note" ? (
            <div className="space-y-3 py-2">
              <div>
                <Label htmlFor="listing-note-title">Title</Label>
                <Input
                  id="listing-note-title"
                  className="bg-input mt-1.5"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Short label (optional)"
                />
              </div>
              <div>
                <Label htmlFor="listing-note-body">Note</Label>
                <Textarea
                  id="listing-note-body"
                  className="bg-input mt-1.5 min-h-[100px] text-sm"
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="Details…"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setActionModal(null)}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => void submitQuickNote()} disabled={createActivityLog.isPending}>
                  {createActivityLog.isPending ? "Saving…" : "Save note"}
                </Button>
              </div>
            </div>
          ) : null}

          {actionModal === "book_inspection" ? (
            <div className="space-y-3 py-2">
              <div>
                <Label htmlFor="insp-title">Title</Label>
                <Input
                  id="insp-title"
                  className="bg-input mt-1.5"
                  value={inspectionTitle}
                  onChange={(e) => setInspectionTitle(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="insp-when">Date &amp; time</Label>
                <Input
                  id="insp-when"
                  type="datetime-local"
                  className="bg-input mt-1.5"
                  value={inspectionDatetime}
                  onChange={(e) => setInspectionDatetime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="insp-notes">Notes (optional)</Label>
                <Textarea
                  id="insp-notes"
                  className="bg-input mt-1.5 min-h-[72px] text-sm"
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  placeholder="Access, keys, buyer name…"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setActionModal(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void submitBookInspection()}
                  disabled={createAppointment.isPending || createActivityLog.isPending}
                >
                  {createAppointment.isPending || createActivityLog.isPending ? "Saving…" : "Book inspection"}
                </Button>
              </div>
            </div>
          ) : null}

          {actionModal === "change_stage" ? (
            <div className="space-y-3 py-2">
              <div>
                <Label>New stage</Label>
                <Select value={newPipelineStage} onValueChange={setNewPipelineStage}>
                  <SelectTrigger className="bg-input mt-1.5 h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LISTING_PIPELINE_STAGE_OPTIONS.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="stage-note">Note for timeline (optional)</Label>
                <Textarea
                  id="stage-note"
                  className="bg-input mt-1.5 min-h-[72px] text-sm"
                  value={stageChangeNote}
                  onChange={(e) => setStageChangeNote(e.target.value)}
                  placeholder="e.g. Verbal acceptance, moving to contract prep…"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setActionModal(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void submitChangeStage()}
                  disabled={updateListing.isPending || createActivityLog.isPending}
                >
                  {updateListing.isPending ? "Updating…" : "Update stage"}
                </Button>
              </div>
            </div>
          ) : null}

          {actionModal === "call_vendor" ? (
            <div className="space-y-4 py-2">
              {!contactId || !linkedContact ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Link a contact to this listing to see their phone number and log calls on the timeline.
                  </p>
                  <div className="flex justify-end">
                    <Button type="button" variant="secondary" onClick={() => setActionModal(null)}>
                      Close
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium text-foreground">{linkedName}</p>
                    {primaryPhone ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-sm text-muted-foreground tabular-nums">
                          {formatPhoneDisplay(primaryPhone)}
                        </span>
                        {telHref ? (
                          <Button type="button" size="sm" className="gap-1.5" asChild>
                            <a href={telHref}>
                              <Phone className="w-4 h-4" />
                              Call now
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        No phone on file. Add one on the contact record.
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="call-log-notes">After the call — outcome (optional)</Label>
                    <Textarea
                      id="call-log-notes"
                      className="bg-input mt-1.5 min-h-[88px] text-sm"
                      value={callLogNotes}
                      onChange={(e) => setCallLogNotes(e.target.value)}
                      placeholder="e.g. Discussed auction date; vendor keen on early offers…"
                    />
                  </div>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                    <Button type="button" variant="outline" onClick={() => setActionModal(null)}>
                      Close
                    </Button>
                    <Button type="button" variant="secondary" asChild>
                      <Link to={`/contacts/${contactId}`} onClick={() => setActionModal(null)}>
                        Open contact
                      </Link>
                    </Button>
                    <Button type="button" onClick={() => void submitLogCall()} disabled={createActivityLog.isPending}>
                      {createActivityLog.isPending ? "Saving…" : "Save call to timeline"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {actionModal === "vendor_update" ? (
            <div className="space-y-4 py-2">
              {!contactId || !linkedContact ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Link a contact (usually the vendor) to send SMS or email from here.
                  </p>
                  <div className="flex justify-end">
                    <Button type="button" variant="secondary" onClick={() => setActionModal(null)}>
                      Close
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium text-foreground">{linkedName}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {primaryPhone ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => {
                            setActionModal(null);
                            setVendorSmsOpen(true);
                          }}
                        >
                          <MessageSquare className="w-4 h-4" />
                          Send SMS
                        </Button>
                      ) : null}
                      {vendorMailtoHref ? (
                        <Button type="button" size="sm" variant="outline" className="gap-1.5" asChild>
                          <a href={vendorMailtoHref}>
                            <Mail className="w-4 h-4" />
                            Email update
                          </a>
                        </Button>
                      ) : null}
                      {telHref ? (
                        <Button type="button" size="sm" variant="outline" className="gap-1.5" asChild>
                          <a href={telHref}>
                            <Phone className="w-4 h-4" />
                            Call
                          </a>
                        </Button>
                      ) : null}
                    </div>
                    {!primaryPhone && !primaryEmail ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Add a phone or email on the contact to message from here.
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <Label htmlFor="vendor-touch-note">Log what you sent (timeline)</Label>
                    <Textarea
                      id="vendor-touch-note"
                      className="bg-input mt-1.5 min-h-[88px] text-sm"
                      value={vendorTouchNote}
                      onChange={(e) => setVendorTouchNote(e.target.value)}
                      placeholder="e.g. Emailed weekly stats and next open home time…"
                    />
                  </div>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                    <Button type="button" variant="outline" onClick={() => setActionModal(null)}>
                      Close
                    </Button>
                    <Button type="button" variant="secondary" asChild>
                      <Link to={`/contacts/${contactId}`} onClick={() => setActionModal(null)}>
                        Open contact
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void submitVendorTouchNote()}
                      disabled={!vendorTouchNote.trim() || createActivityLog.isPending}
                    >
                      {createActivityLog.isPending ? "Saving…" : "Save note to timeline"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {contactId && primaryPhone ? (
        <SendSmsDialog
          open={vendorSmsOpen}
          onOpenChange={setVendorSmsOpen}
          to={primaryPhone}
          contactId={contactId}
          contactName={linkedName ?? undefined}
          firstName={linkedContact?.first_name ?? null}
          lastName={linkedContact?.last_name ?? undefined}
          onSent={async () => {
            if (!id || !listing) return;
            try {
              await createActivityLog.mutateAsync({
                activity_type: "note",
                title: "SMS — vendor / listing update",
                description: "Outbound SMS sent from listing quick action.",
                listing_id: id,
                contact_id: contactId,
                property_id: listing.property_id ?? null,
              });
              refetch();
            } catch {
              /* timeline log is best-effort after successful send */
            }
          }}
        />
      ) : null}

      {listing ? (
        <MatchBuyersSheet open={matchBuyersOpen} onOpenChange={setMatchBuyersOpen} listing={listing} />
      ) : null}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[560px] bg-card border-border max-h-[min(92vh,880px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit listing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Hero photo</Label>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <input
                  ref={heroFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => void handleHeroFile(e)}
                  disabled={heroUploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={heroUploading}
                  onClick={() => heroFileRef.current?.click()}
                >
                  <ImagePlus className="w-4 h-4" />
                  {heroUploading ? "Uploading…" : "Upload image"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Stored in your storage bucket; sets this listing&apos;s hero (and appends to linked property gallery when possible).
                </p>
              </div>
              {editForm.listing_image_url && (
                <Input
                  className="bg-input mt-2 text-xs"
                  value={editForm.listing_image_url}
                  onChange={(e) => setEditForm({ ...editForm, listing_image_url: e.target.value })}
                  placeholder="Or paste image URL"
                />
              )}
            </div>

            <div>
              <Label>Address *</Label>
              <Input
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                className="bg-input mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Search price (internal)</Label>
                <Input
                  type="number"
                  value={editForm.search_price ?? ""}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      search_price: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="bg-input mt-1"
                  placeholder="e.g. 1850000"
                />
              </div>
              <div>
                <Label>Display price (portal)</Label>
                <Input
                  value={editForm.display_price}
                  onChange={(e) => setEditForm({ ...editForm, display_price: e.target.value })}
                  className="bg-input mt-1"
                  placeholder='e.g. Offers Above $2m'
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v: ListingStatus) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger className="bg-input mt-1.5 h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bedrooms</Label>
                <Input
                  type="number"
                  value={editForm.bedrooms ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, bedrooms: e.target.value ? Number(e.target.value) : null })}
                  className="bg-input mt-1"
                />
              </div>
              <div>
                <Label>Bathrooms</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={editForm.bathrooms ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, bathrooms: e.target.value ? Number(e.target.value) : null })}
                  className="bg-input mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="bg-input mt-1 min-h-[80px]"
              />
            </div>

            {id && (
              <Collapsible open={classifyOpen} onOpenChange={setClassifyOpen}>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Classification &amp; journey
                    </span>
                    <ChevronDown className={cn("w-4 h-4 transition-transform", classifyOpen && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <LeadClassificationPanel
                    mode="listing"
                    entityId={id}
                    record={listing}
                    linkedContactId={contactId ?? null}
                    linkedContactDoNotContact={linkedContact?.do_not_contact ?? null}
                  />
                </CollapsibleContent>
              </Collapsible>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={() => void handleSaveEdit()} disabled={updateListing.isPending}>
                {updateListing.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
