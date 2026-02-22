import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, ArrowLeft, Building2, Plus, Edit, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useProperty, useUpdateProperty, useProperties, formatPropertyAddress } from "@/hooks/useProperties";
import { useContacts } from "@/hooks/useContacts";
import { useCreateContactPropertyLink } from "@/hooks/useContactPropertyLinks";
import { useToast } from "@/hooks/use-toast";
import { PropertyContactsCard } from "@/components/properties/PropertyContactsCard";
import { PropertySuiteCard } from "@/components/properties/PropertySuiteCard";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { supabase } from "@/integrations/supabase/client";
import { PropertyGallery } from "@/components/PropertyManagement/PropertyGallery";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";

const LINK_ROLES = ["owner", "seller", "buyer", "tenant", "investor", "agent", "interested", "other"] as const;

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: property, isLoading, isError, refetch } = useProperty(id);
  const { data: propertiesList = [] } = useProperties();
  const { data: contacts = [] } = useContacts();
  const createLink = useCreateContactPropertyLink();
  const updateProperty = useUpdateProperty();

  const propertyIndex = id ? propertiesList.findIndex((p) => p.id === id) : -1;
  const prevPropertyId = propertyIndex > 0 ? propertiesList[propertyIndex - 1]?.id : null;
  const nextPropertyId = propertyIndex >= 0 && propertyIndex < propertiesList.length - 1 ? propertiesList[propertyIndex + 1]?.id : null;

  const [addOwnerOpen, setAddOwnerOpen] = useState(false);
  const [addOwnerContactId, setAddOwnerContactId] = useState<string>("");
  const [addOwnerRole, setAddOwnerRole] = useState<string>("owner");
  const [addOwnerNotes, setAddOwnerNotes] = useState("");
  const [editPropertyOpen, setEditPropertyOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postcode: "",
    country: "Australia",
    property_type: "",
    bedrooms: "" as string | number,
    bathrooms: "" as string | number,
    price: "" as string | number,
    lot_size: "" as string | number,
    notes: "",
  });
  type PricefinderEnriched = {
    address?: string;
    bedrooms?: number | null;
    bathrooms?: number | null;
    property_type?: string | null;
    last_sale_price?: number | null;
    last_sale_date?: string | null;
    land_area_sqm?: number | null;
    carspaces?: number | null;
    lot_plan?: string | null;
  };
  const [enrichedData, setEnrichedData] = useState<PricefinderEnriched | null>(null);
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [enrichUnconfigured, setEnrichUnconfigured] = useState(false);

  const links = Array.isArray(property?.contact_property_links) ? property.contact_property_links : [];
  const linkedContactIds = useMemo(
    () => new Set(links.map((l) => l.contact_id)),
    [links]
  );
  const availableContacts = useMemo(
    () => (contacts as { id: string; name: string }[]).filter((c) => !linkedContactIds.has(c.id)),
    [contacts, linkedContactIds]
  );

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
        <Building2 className="w-12 h-12 mx-auto mb-4 text-white/60 opacity-50" />
        <p className="font-medium text-white mb-2">Couldn&apos;t load property</p>
        <p className="text-sm text-white/60 mb-4">Check your connection and migrations, then retry.</p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>Retry</Button>
          <Button variant="ghost" onClick={() => navigate("/properties")}>Back to Properties</Button>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="animate-fade-in text-center py-12">
        <p className="text-white/60">Property not found</p>
        <Button variant="outline" onClick={() => navigate("/properties")} className="mt-4">
          Back to Properties
        </Button>
      </div>
    );
  }

  const addr = formatPropertyAddress(property);

  const handleOpenAddOwner = () => {
    setAddOwnerContactId("");
    setAddOwnerRole("owner");
    setAddOwnerNotes("");
    setAddOwnerOpen(true);
  };

  const handleAddOwner = async () => {
    if (!id || !addOwnerContactId) {
      toast({ title: "Error", description: "Select a contact.", variant: "destructive" });
      return;
    }
    try {
      await createLink.mutateAsync({
        property_id: id,
        contact_id: addOwnerContactId,
        role: addOwnerRole as (typeof LINK_ROLES)[number],
        notes: addOwnerNotes.trim() || null,
      });
      toast({ title: "Success", description: "Contact linked." });
      setAddOwnerOpen(false);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      const msg = err?.message ?? (e instanceof Error ? e.message : "");
      const isDuplicate =
        err?.code === "23505" ||
        /duplicate|unique|already exists/i.test(String(msg));
      const isCheckConstraint = err?.code === "23514" || /check constraint|violates check/i.test(String(msg));
      let description = e instanceof Error ? e.message : "Failed to link contact";
      if (isDuplicate) description = "This contact is already linked to this property.";
      else if (isCheckConstraint) description = "That role isn’t supported yet. Try Owner, Buyer, Tenant, Interested, or Other.";
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    }
  };

  const hasImages = Array.isArray(property.images) && (property.images as string[]).length > 0;

  const handleOpenEdit = () => {
    if (!property) return;
    setEditForm({
      address_line1: property.address_line1 ?? "",
      address_line2: property.address_line2 ?? "",
      city: property.city ?? "",
      state: property.state ?? "",
      postcode: property.postcode ?? "",
      country: property.country ?? "Australia",
      property_type: property.property_type ?? "",
      bedrooms: property.bedrooms ?? "",
      bathrooms: property.bathrooms ?? "",
      price: property.price ?? "",
      lot_size: property.lot_size ?? "",
      notes: property.notes ?? "",
    });
    setEditPropertyOpen(true);
  };

  const handleEnrichFromPricefinder = async () => {
    const base = import.meta.env.VITE_SUPABASE_URL;
    const url = base ? `${base}/functions/v1/pricefinder-proxy` : null;
    if (!url) {
      toast({ title: "Error", description: "App URL not configured", variant: "destructive" });
      return;
    }
    setEnrichLoading(true);
    setEnrichUnconfigured(false);
    setEnrichedData(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Error", description: "Sign in to load property data", variant: "destructive" });
        return;
      }
      const address = formatPropertyAddress(property);
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          ...(anonKey && { apikey: anonKey }),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ full_address: address || property.address_line1 || "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 503) {
        setEnrichUnconfigured(true);
        return;
      }
      if (!res.ok) {
        const desc = [data?.message, data?.error, data?.status ? `(HTTP ${data.status})` : "", "Failed to load property data"].filter(Boolean).join(" ");
        toast({ title: "Error", description: desc, variant: "destructive" });
        return;
      }
      if (res.status === 404) {
        toast({ title: "Not found", description: data?.message || "No property match for this address", variant: "destructive" });
        return;
      }
      setEnrichedData(data);
      toast({ title: "Success", description: "Property data loaded from Pricefinder" });
    } catch {
      toast({ title: "Error", description: "Could not reach Pricefinder", variant: "destructive" });
    } finally {
      setEnrichLoading(false);
    }
  };

  const handleApplyEnrichedData = async () => {
    if (!id || !enrichedData) return;
    try {
      const updates: Record<string, unknown> = {};
      if (enrichedData.bedrooms != null) updates.bedrooms = enrichedData.bedrooms;
      if (enrichedData.bathrooms != null) updates.bathrooms = enrichedData.bathrooms;
      if (enrichedData.property_type) updates.property_type = enrichedData.property_type;
      if (enrichedData.land_area_sqm != null) updates.lot_size = enrichedData.land_area_sqm;
      if (enrichedData.last_sale_price != null && !property?.price) updates.price = enrichedData.last_sale_price;
      await updateProperty.mutateAsync({ id, ...updates });
      toast({ title: "Success", description: "Property updated with Pricefinder data" });
      setEnrichedData(null);
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to update", variant: "destructive" });
    }
  };

  const handleSaveProperty = async () => {
    if (!id) return;
    try {
      await updateProperty.mutateAsync({
        id,
        address_line1: editForm.address_line1.trim() || null,
        address_line2: editForm.address_line2.trim() || null,
        city: editForm.city.trim() || null,
        state: editForm.state || null,
        postcode: editForm.postcode.trim() || null,
        country: editForm.country || "Australia",
        property_type: editForm.property_type.trim() || null,
        bedrooms: editForm.bedrooms === "" ? null : Number(editForm.bedrooms),
        bathrooms: editForm.bathrooms === "" ? null : Number(editForm.bathrooms),
        price: editForm.price === "" ? null : Number(editForm.price),
        lot_size: editForm.lot_size === "" ? null : Number(editForm.lot_size),
        notes: editForm.notes.trim() || null,
      });
      toast({ title: "Success", description: "Property updated." });
      setEditPropertyOpen(false);
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to update", variant: "destructive" });
    }
  };

  return (
    <div className="animate-fade-in">
      <PageBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Properties", href: "/properties" },
          { label: addr || "Property" },
        ]}
        className="mb-4"
      />
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => navigate("/properties")} title="Back to list">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          {prevPropertyId && (
            <Button variant="ghost" size="icon" onClick={() => navigate(`/properties/${prevPropertyId}`)} title="Previous property">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          {nextPropertyId && (
            <Button variant="ghost" size="icon" onClick={() => navigate(`/properties/${nextPropertyId}`)} title="Next property">
              <ChevronRight className="w-5 h-5" />
            </Button>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2 truncate">
            <Building2 className="w-6 h-6 shrink-0" />
            {addr || "Property"}
          </h1>
          <p className="text-white/60 text-sm mt-0.5">Details and linked owners</p>
        </div>
        <Button variant="outline" onClick={handleOpenEdit} className="gap-2">
          <Edit className="w-4 h-4" /> Edit property
        </Button>
      </div>

      {hasImages && <PropertyGallery images={property.images} className="mb-6" />}

      <PropertyContactsCard property={property} onLinkClick={handleOpenAddOwner} className="mb-6" contactsList={contacts} />

      {id && (
        <div className="mb-6">
          <PropertySuiteCard
            propertyId={id}
            linkedContacts={(contacts as { id: string; name: string }[]).filter((c) => linkedContactIds.has(c.id)).map((c) => ({ id: c.id, name: c.name }))}
          />
        </div>
      )}

      <Card className="zoho-card p-6 mb-6 border-white/10">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Address</h2>
            <p className="text-foreground">{addr || "—"}</p>
            {(property.city || property.state || property.postcode) && (
              <p className="text-sm text-white/60 mt-1">
                {[property.city, property.state, property.postcode].filter(Boolean).join(", ")}
                {property.country && `, ${property.country}`}
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          {property.property_type && (
            <div>
              <span className="text-white/60">Type</span>
              <p className="font-medium capitalize">{property.property_type}</p>
            </div>
          )}
          {property.bedrooms != null && (
            <div>
              <span className="text-white/60">Bedrooms</span>
              <p className="font-medium">{property.bedrooms}</p>
            </div>
          )}
          {property.bathrooms != null && (
            <div>
              <span className="text-white/60">Bathrooms</span>
              <p className="font-medium">{property.bathrooms}</p>
            </div>
          )}
          {(property.price != null && property.price > 0) && (
            <div>
              <span className="text-white/60">Price</span>
              <p className="font-medium">${Number(property.price).toLocaleString()}</p>
            </div>
          )}
          {(property.price_listed != null && property.price_listed > 0) && (
            <div>
              <span className="text-white/60">Listed price</span>
              <p className="font-medium">${Number(property.price_listed).toLocaleString()}</p>
            </div>
          )}
          {(property.estimated_value != null && property.estimated_value > 0) && (
            <div>
              <span className="text-white/60">Estimated value</span>
              <p className="font-medium">${Number(property.estimated_value).toLocaleString()}</p>
            </div>
          )}
          {property.rental_yield != null && (
            <div>
              <span className="text-white/60">Rental yield</span>
              <p className="font-medium">{Number(property.rental_yield).toFixed(2)}%</p>
            </div>
          )}
          {property.cap_rate != null && (
            <div>
              <span className="text-white/60">Cap rate</span>
              <p className="font-medium">{Number(property.cap_rate).toFixed(2)}%</p>
            </div>
          )}
          {property.lot_size != null && (
            <div>
              <span className="text-white/60">Lot size</span>
              <p className="font-medium">{Number(property.lot_size).toLocaleString()} m²</p>
            </div>
          )}
          {property.building_size != null && (
            <div>
              <span className="text-white/60">Building size</span>
              <p className="font-medium">{Number(property.building_size).toLocaleString()} m²</p>
            </div>
          )}
          {property.year_built != null && (
            <div>
              <span className="text-white/60">Year built</span>
              <p className="font-medium">{property.year_built}</p>
            </div>
          )}
          {property.property_condition && (
            <div>
              <span className="text-white/60">Condition</span>
              <p className="font-medium capitalize">{property.property_condition}</p>
            </div>
          )}
          {property.status && (
            <div>
              <span className="text-white/60">Status</span>
              <p className="font-medium capitalize">{property.status}</p>
            </div>
          )}
        </div>
        {property.notes && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <span className="text-white/60 text-sm">Notes</span>
            <p className="text-foreground whitespace-pre-wrap mt-1">{property.notes}</p>
          </div>
        )}
        {/* Metadata Table */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <h4 className="text-xs font-semibold text-white/60 uppercase mb-3">
            Metadata
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-white/60 block mb-1">Primary Agent</span>
              <p className="font-medium text-foreground">
                {property.user_id ? "Current User" : "—"}
              </p>
            </div>
            <div>
              <span className="text-white/60 block mb-1">Source</span>
              <p className="font-medium text-foreground">—</p>
            </div>
            <div>
              <span className="text-white/60 block mb-1">First Created</span>
              <p className="font-medium text-foreground">
                {property.created_at
                  ? format(new Date(property.created_at), "PPp")
                  : "—"}
              </p>
            </div>
            <div>
              <span className="text-white/60 block mb-1">Last Modified</span>
              <p className="font-medium text-foreground">
                {property.updated_at
                  ? format(new Date(property.updated_at), "PPp")
                  : "—"}
              </p>
            </div>
            <div>
              <span className="text-white/60 block mb-1">Last Contact</span>
              <p className="font-medium text-foreground">
                {links.length > 0 ? "See linked contacts" : "—"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Property data from Pricefinder */}
      <Card className="zoho-card p-6 mb-6 border-white/10">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Property data from Pricefinder</h3>
        {enrichUnconfigured ? (
          <p className="text-sm text-muted-foreground">
            Pricefinder integration available with API key. See docs/PRICEFINDER_INTEGRATION.md.
          </p>
        ) : enrichedData ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {enrichedData.bedrooms != null && (
                <div>
                  <span className="text-white/60">Bedrooms</span>
                  <p className="font-medium">{enrichedData.bedrooms}</p>
                </div>
              )}
              {enrichedData.bathrooms != null && (
                <div>
                  <span className="text-white/60">Bathrooms</span>
                  <p className="font-medium">{enrichedData.bathrooms}</p>
                </div>
              )}
              {enrichedData.property_type && (
                <div>
                  <span className="text-white/60">Type</span>
                  <p className="font-medium capitalize">{enrichedData.property_type}</p>
                </div>
              )}
              {enrichedData.land_area_sqm != null && (
                <div>
                  <span className="text-white/60">Lot size</span>
                  <p className="font-medium">{enrichedData.land_area_sqm} m²</p>
                </div>
              )}
              {enrichedData.last_sale_price != null && (
                <div>
                  <span className="text-white/60">Last sale price</span>
                  <p className="font-medium">${Number(enrichedData.last_sale_price).toLocaleString()}</p>
                </div>
              )}
              {enrichedData.last_sale_date && (
                <div>
                  <span className="text-white/60">Last sale date</span>
                  <p className="font-medium">{enrichedData.last_sale_date}</p>
                </div>
              )}
              {enrichedData.carspaces != null && (
                <div>
                  <span className="text-white/60">Car spaces</span>
                  <p className="font-medium">{enrichedData.carspaces}</p>
                </div>
              )}
              {enrichedData.lot_plan && (
                <div>
                  <span className="text-white/60">Lot/plan</span>
                  <p className="font-medium">{enrichedData.lot_plan}</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleApplyEnrichedData} disabled={updateProperty.isPending}>
                {updateProperty.isPending ? "Applying..." : "Apply to property"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEnrichedData(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleEnrichFromPricefinder} disabled={enrichLoading}>
              {enrichLoading ? "Loading..." : "Enrich from Pricefinder"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Load beds, baths, lot size, last sale and more from Pricefinder.
            </p>
          </div>
        )}
      </Card>

      <Card className="zoho-card p-6 mb-6 border-white/10">
        <ActivityTimeline entityType="property" entityId={id} showAddNote={true} />
      </Card>

      <Dialog open={addOwnerOpen} onOpenChange={setAddOwnerOpen}>
        <DialogContent className="sm:max-w-[420px] bg-[#242424] border-white/10">
          <DialogHeader>
            <DialogTitle>Link contact to property</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Contact</Label>
              <Select
                value={addOwnerContactId}
                onValueChange={setAddOwnerContactId}
                disabled={availableContacts.length === 0}
              >
                <SelectTrigger className="w-full bg-input">
                  <SelectValue placeholder={availableContacts.length === 0 ? "No contacts available" : "Select contact..."} />
                </SelectTrigger>
                <SelectContent>
                  {availableContacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableContacts.length === 0 && (
                <p className="text-xs text-white/60">
                  Create contacts first, or they may all be linked already.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={addOwnerRole}
                onValueChange={setAddOwnerRole}
              >
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
                placeholder="e.g. Joint owner, primary contact..."
                value={addOwnerNotes}
                onChange={(e) => setAddOwnerNotes(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setAddOwnerOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddOwner}
              disabled={!addOwnerContactId || createLink.isPending}
            >
              {createLink.isPending ? "Linking..." : "Link contact"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editPropertyOpen} onOpenChange={setEditPropertyOpen}>
        <DialogContent className="sm:max-w-[520px] bg-[#242424] border-white/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit property</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 mt-4">
            <div className="grid gap-2">
              <Label>Address line 1</Label>
              <Input className="bg-input" value={editForm.address_line1} onChange={(e) => setEditForm((f) => ({ ...f, address_line1: e.target.value }))} placeholder="Street address" />
            </div>
            <div className="grid gap-2">
              <Label>Address line 2</Label>
              <Input className="bg-input" value={editForm.address_line2} onChange={(e) => setEditForm((f) => ({ ...f, address_line2: e.target.value }))} placeholder="Unit, suite" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>City</Label>
                <Input className="bg-input" value={editForm.city} onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>State</Label>
                <Input className="bg-input" value={editForm.state} onChange={(e) => setEditForm((f) => ({ ...f, state: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Postcode</Label>
                <Input className="bg-input" value={editForm.postcode} onChange={(e) => setEditForm((f) => ({ ...f, postcode: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Country</Label>
                <Input className="bg-input" value={editForm.country} onChange={(e) => setEditForm((f) => ({ ...f, country: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Input className="bg-input" value={editForm.property_type} onChange={(e) => setEditForm((f) => ({ ...f, property_type: e.target.value }))} placeholder="House, Unit..." />
              </div>
              <div className="grid gap-2">
                <Label>Bedrooms</Label>
                <Input type="number" min={0} className="bg-input" value={editForm.bedrooms} onChange={(e) => setEditForm((f) => ({ ...f, bedrooms: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Bathrooms</Label>
                <Input type="number" min={0} className="bg-input" value={editForm.bathrooms} onChange={(e) => setEditForm((f) => ({ ...f, bathrooms: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Price</Label>
                <Input type="number" min={0} className="bg-input" value={editForm.price} onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))} placeholder="0" />
              </div>
              <div className="grid gap-2">
                <Label>Lot size (m²)</Label>
                <Input type="number" min={0} className="bg-input" value={editForm.lot_size} onChange={(e) => setEditForm((f) => ({ ...f, lot_size: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea className="bg-input min-h-[80px]" value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setEditPropertyOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveProperty} disabled={updateProperty.isPending}>{updateProperty.isPending ? "Saving..." : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
