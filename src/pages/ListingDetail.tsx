import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
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
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Home,
  Pencil,
  Calendar,
  Tag,
  User,
  ChevronLeft,
  ChevronRight,
  Share2,
  ImagePlus,
  Bed,
  Bath,
  CarFront,
  Ruler,
  Clock,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { formatPhoneDisplay } from "@/lib/formatPhone";
import { format, differenceInCalendarDays } from "date-fns";
import { useListing, useUpdateListing, type Listing } from "@/hooks/useListings";
import { useContact } from "@/hooks/useContact";
import { useProperty, useUpdateProperty } from "@/hooks/useProperties";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { useToast } from "@/hooks/use-toast";
import { LeadClassificationPanel } from "@/components/contacts/LeadClassificationPanel";
import { collectListingHeroUrls } from "@/lib/listingFromProperty";
import { listingKanbanColumnId } from "@/lib/listingKanbanStages";
import { useActivityLogByListing } from "@/hooks/useActivityLog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getContactDisplayName } from "@/hooks/useContacts";
import { AvatarCircle } from "@/components/ui/avatar-circle";
import { getInitials, cn } from "@/lib/utils";

type ListingStatus = "active" | "pending" | "sold" | "withdrawn";

const PIPELINE_STAGE_LABELS: Record<string, string> = {
  appraisal: "Appraisal / prep",
  listing: "Listed",
  under_contract: "Under contract",
  unconditional: "Unconditional",
  settled: "Settled",
  past_client: "Past client",
};

function pipelineStageLabel(slug: string | null | undefined): string {
  if (!slug) return "—";
  const id = listingKanbanColumnId(slug);
  return PIPELINE_STAGE_LABELS[id] ?? String(slug).replace(/-/g, " ");
}

function formatAud(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: listing, isLoading, isError, refetch } = useListing(id);
  const listingWithContact = listing as (Listing & { contact_id?: string | null }) | null;
  const contactId = listingWithContact?.contact_id ?? undefined;
  const { data: linkedContact } = useContact(contactId);
  const { data: linkedProperty } = useProperty(listing?.property_id ?? undefined);
  const updateListing = useUpdateListing();
  const updateProperty = useUpdateProperty();
  const { data: recentActivity = [] } = useActivityLogByListing(id ?? null, 4);

  const [editOpen, setEditOpen] = useState(false);
  const [classifyOpen, setClassifyOpen] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroUploading, setHeroUploading] = useState(false);
  const heroFileRef = useRef<HTMLInputElement>(null);

  const [editForm, setEditForm] = useState({
    address: "",
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
    const col = listingKanbanColumnId(listing.pipeline_stage);
    if (col === "appraisal" || col === "past_client") return null;
    const anchor = listing.created_at || listing.updated_at;
    if (!anchor) return null;
    return Math.max(0, differenceInCalendarDays(new Date(), new Date(anchor)));
  }, [listing]);

  const daysInStage = useMemo(() => {
    if (!listing?.updated_at) return 0;
    return Math.max(0, differenceInCalendarDays(new Date(), new Date(listing.updated_at)));
  }, [listing?.updated_at]);

  const isNewListing = useMemo(() => {
    if (!listing?.created_at) return false;
    return differenceInCalendarDays(new Date(), new Date(listing.created_at)) <= 14;
  }, [listing?.created_at]);

  const stageCol = listing ? listingKanbanColumnId(listing.pipeline_stage) : "appraisal";
  const showUnderOfferBadge =
    listing?.status === "pending" || stageCol === "under_contract" || stageCol === "unconditional";

  const linkedName = linkedContact ? getContactDisplayName(linkedContact) : null;
  const agentLabel =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email?.split("@")[0] ??
    "You";

  const openEdit = () => {
    if (!listing) return;
    setEditForm({
      address: listing.address || "",
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
        price: editForm.price,
        bedrooms: editForm.bedrooms,
        bathrooms: editForm.bathrooms,
        status: editForm.status,
        notes: editForm.notes || null,
        listing_image_url: editForm.listing_image_url?.trim() || null,
      });
      toast({ title: "Success", description: "Listing updated" });
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
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Update failed", variant: "destructive" });
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

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      <PageBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Listings", href: "/listings-sales" },
          { label: listing.address || "Listing" },
        ]}
        className="mb-4"
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">{listing.address || "Listing"}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pipelineStageLabel(listing.pipeline_stage)}
            {listing.updated_at ? ` · Updated ${format(new Date(listing.updated_at), "d MMM yyyy")}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
          <Button variant="outline" size="sm" onClick={() => void handleShare()} className="gap-1.5">
            <Share2 className="w-4 h-4" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={openEdit} className="gap-1.5">
            <Pencil className="w-4 h-4" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/calendar")} className="gap-1.5">
            <Calendar className="w-4 h-4" />
            Viewing
          </Button>
          {(listing.status === "active" || listing.status === "pending") && (
            <>
              <Button variant="outline" size="sm" onClick={() => void handleStatusChange("sold")} className="gap-1.5">
                <Tag className="w-4 h-4" />
                Mark sold
              </Button>
              <Button variant="outline" size="sm" onClick={() => void handleStatusChange("withdrawn")}>
                Off-market
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Hero / gallery */}
      <Card className="zoho-card mb-5 border-border overflow-hidden rounded-xl shadow-sm">
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

          <div className="absolute top-3 left-3 right-14 flex flex-wrap gap-1.5 z-10">
            {listing.status && (
              <Badge variant="secondary" className="bg-background/90 text-foreground capitalize border-0 shadow-sm">
                {listing.status}
              </Badge>
            )}
            <Badge variant="secondary" className="bg-background/90 text-foreground border-0 shadow-sm">
              {pipelineStageLabel(listing.pipeline_stage)}
            </Badge>
            {isNewListing && (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white border-0 shadow-sm">New listing</Badge>
            )}
            {showUnderOfferBadge && (
              <Badge className="bg-amber-500 hover:bg-amber-500 text-foreground border-0 shadow-sm">Under offer</Badge>
            )}
            {listing.lead_temperature && (
              <Badge variant="outline" className="bg-background/85 border-border capitalize text-xs">
                {String(listing.lead_temperature).replace(/_/g, " ")}
              </Badge>
            )}
          </div>

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
              {formatAud(listing.price != null ? Number(listing.price) : null)}
            </p>
          </div>
        </div>

        {/* Spec strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px border-t border-border bg-border">
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
            <div key={label} className="bg-card flex items-center gap-3 p-3 sm:p-4">
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
      </Card>

      {/* Quick stats + agent + activity preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="zoho-card p-4 border-border md:col-span-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick stats</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                DOM
              </span>
              <span className="font-medium tabular-nums">{domDays != null ? `${domDays}d` : "—"}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">In stage</span>
              <span className="font-medium tabular-nums">{daysInStage}d</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Listing type</span>
              <span className="font-medium capitalize">{listing.property_type || "—"}</span>
            </div>
          </div>
        </Card>

        <Card className="zoho-card p-4 border-border md:col-span-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Agent</h3>
          <div className="flex items-center gap-3">
            <AvatarCircle name={agentLabel} initials={getInitials(undefined, undefined, agentLabel)} size="md" />
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">{agentLabel}</p>
              {user?.email && (
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              )}
              <Link to="/settings" className="text-xs text-primary hover:underline mt-0.5 inline-block">
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
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="zoho-card p-6 border-border lg:col-span-2">
          <h3 className="text-sm font-medium text-foreground/90 mb-4">Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {listing.price != null && (
              <div>
                <span className="text-muted-foreground">Guide / price</span>
                <p className="font-medium">{formatAud(Number(listing.price))}</p>
              </div>
            )}
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

      <Card className="zoho-card p-6 border-border">
        <ActivityTimeline entityType="listing" entityId={id} showAddNote={true} />
      </Card>

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
                <Label>Price</Label>
                <Input
                  type="number"
                  value={editForm.price ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, price: e.target.value ? Number(e.target.value) : null })}
                  className="bg-input mt-1"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v: ListingStatus) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger className="bg-input mt-1">
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
