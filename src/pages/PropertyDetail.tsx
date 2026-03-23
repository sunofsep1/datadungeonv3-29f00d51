import React, { useState, useMemo, useRef } from "react";

/** Show only main-points text; hide disclaimer and long boilerplate */
function reportDisplayValue(s: unknown, maxLen = 120): string | null {
  if (s == null || typeof s !== "string") return null;
  let t = s.trim();
  const stop = [
    "The materials are provided",
    "State of Queensland",
    "propertydatacodeofconduct",
    "no warranty",
    "Prepared on ",
    "Property Data Solutions",
  ];
  for (const phrase of stop) {
    const i = t.indexOf(phrase);
    if (i !== -1) t = t.slice(0, i).trim();
  }
  if (t.length > maxLen) t = t.slice(0, maxLen).trim();
  return t.length ? t : null;
}
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
import { MapPin, ArrowLeft, Building2, Plus, Edit, ChevronLeft, ChevronRight, Upload, ImageIcon, GripVertical, Trash2 } from "lucide-react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, rectSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/input";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { format } from "date-fns";
import { useProperty, useUpdateProperty, useProperties, formatPropertyAddress } from "@/hooks/useProperties";
import { useContacts } from "@/hooks/useContacts";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateContactPropertyLink } from "@/hooks/useContactPropertyLinks";
import { useToast } from "@/hooks/use-toast";
import { PropertyContactsCard } from "@/components/properties/PropertyContactsCard";
import { PropertySuiteCard } from "@/components/properties/PropertySuiteCard";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { supabase } from "@/integrations/supabase/client";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { parsePropertyReportPdf, normalizePropertyType, PROPERTY_TYPE_VALUES, type ParsedPropertyReport } from "@/lib/parsePropertyReportPdf";

const LINK_ROLES = ["owner", "seller", "buyer", "tenant", "investor", "agent", "interested", "other"] as const;

function SortableImageCard({
  url,
  index,
  isFirst,
  size,
  uploadImageLoading,
  updatePending,
  onAddAnother,
  onDelete,
}: {
  url: string;
  index: number;
  isFirst: boolean;
  size: "hero" | "thumb";
  uploadImageLoading: boolean;
  updatePending: boolean;
  onAddAnother: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isHero = size === "hero";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl overflow-hidden border border-white/10 bg-muted/30 relative group shrink-0 ${
        isHero ? "aspect-[16/10] sm:aspect-[2/1] max-h-[420px]" : "w-[140px] h-[100px] sm:w-[160px] sm:h-[110px]"
      } ${isDragging ? "z-50 opacity-90 ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
    >
      <img
        src={url}
        alt=""
        className="w-full h-full object-cover pointer-events-none"
        loading={index === 0 ? "eager" : "lazy"}
      />
      <div className="absolute inset-0 flex items-end justify-between p-1.5 sm:p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/60 to-transparent">
        <button
          type="button"
          className="p-1 rounded-md bg-white/90 hover:bg-white text-black cursor-grab active:cursor-grabbing touch-none"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className={isHero ? "w-4 h-4" : "w-3.5 h-3.5"} />
        </button>
        <div className="flex gap-1">
          {isFirst && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1 opacity-90 shadow-lg h-7 text-xs sm:h-8"
              disabled={uploadImageLoading || updatePending}
              onClick={onAddAnother}
            >
              <Upload className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              {uploadImageLoading ? "…" : "Add"}
            </Button>
          )}
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className={`opacity-90 shadow-lg ${isHero ? "h-8 w-8" : "h-7 w-7"}`}
            disabled={updatePending}
            onClick={onDelete}
            aria-label="Remove image"
          >
            <Trash2 className={isHero ? "w-4 h-4" : "w-3.5 h-3.5"} />
          </Button>
        </div>
      </div>
    </div>
  );
}

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
    car_spaces: "" as string | number,
    price: "" as string | number,
    lot_size: "" as string | number,
    building_size: "" as string | number,
    notes: "",
  });
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState({
    property_type: "",
    bedrooms: "" as string | number,
    bathrooms: "" as string | number,
    car_spaces: "" as string | number,
    area_land: "" as string | number,
    area_building: "" as string | number,
    price: "" as string | number,
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
  const [parsedReportData, setParsedReportData] = useState<ParsedPropertyReport | null>(null);
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [uploadReportLoading, setUploadReportLoading] = useState(false);
  const [uploadImageLoading, setUploadImageLoading] = useState(false);
  const [enrichUnconfigured, setEnrichUnconfigured] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

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

  const report = (property?.property_report ?? {}) as Record<string, unknown>;
  const landSize = property?.lot_size ?? (property as { land_area_sqm?: number | null })?.land_area_sqm ?? report?.area_land;
  const carSpacesVal = property?.car_spaces ?? report?.car_spaces;

  const handleOpenEdit = () => {
    if (!property) return;
    setEditForm({
      address_line1: property.address_line1 ?? "",
      address_line2: property.address_line2 ?? "",
      city: property.city ?? "",
      state: property.state ?? "",
      postcode: property.postcode ?? "",
      country: property.country ?? "Australia",
      property_type: property.property_type ? normalizePropertyType(property.property_type) : "",
      bedrooms: property.bedrooms ?? "",
      bathrooms: property.bathrooms ?? "",
      car_spaces: carSpacesVal ?? "",
      price: property.price ?? "",
      lot_size: landSize ?? "",
      building_size: property.building_size ?? report.area_building ?? "",
      notes: property.notes ?? "",
    });
    setEditPropertyOpen(true);
  };

  const startEditingDetails = () => {
    if (!property) return;
    const rawType = property.property_type ?? (report.property_type_full as string) ?? "";
    setDetailsForm({
      property_type: rawType ? normalizePropertyType(rawType) : "",
      bedrooms: property.bedrooms ?? report.bedrooms ?? "",
      bathrooms: property.bathrooms ?? report.bathrooms ?? "",
      car_spaces: carSpacesVal ?? "",
      area_land: landSize ?? "",
      area_building: property.building_size ?? report.area_building ?? "",
      price: property.price ?? "",
      notes: property.notes ?? "",
    });
    setEditingDetails(true);
  };

  const cancelEditingDetails = () => {
    setEditingDetails(false);
  };

  const saveDetails = async () => {
    if (!id) return;
    const core: Record<string, unknown> = {
      property_type: detailsForm.property_type.trim() ? normalizePropertyType(detailsForm.property_type) : null,
      bedrooms: detailsForm.bedrooms === "" ? null : Number(detailsForm.bedrooms),
      bathrooms: detailsForm.bathrooms === "" ? null : Number(detailsForm.bathrooms),
      price: detailsForm.price === "" ? null : Number(detailsForm.price),
      notes: detailsForm.notes.trim() || null,
    };
    const areaLand = detailsForm.area_land === "" ? null : Number(detailsForm.area_land);
    const areaBuilding = detailsForm.area_building === "" ? null : Number(detailsForm.area_building);
    const carSpaces = detailsForm.car_spaces === "" ? null : Number(detailsForm.car_spaces);
    const existingReport = (property?.property_report && typeof property.property_report === "object"
      ? { ...(property.property_report as Record<string, unknown>) }
      : {}) as Record<string, unknown>;
    const mergedReport = {
      ...existingReport,
      area_land: areaLand,
      area_building: areaBuilding,
      car_spaces: carSpaces,
      bedrooms: core.bedrooms,
      bathrooms: core.bathrooms,
    };
    const getErrMsg = (err: unknown) =>
      err != null && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : err instanceof Error ? err.message : String(err);

    const payloadWithReport = { ...core, property_report: mergedReport };
    try {
      await updateProperty.mutateAsync({ id, ...payloadWithReport });
      toast({ title: "Saved", description: "Property details updated." });
      setEditingDetails(false);
    } catch (e: unknown) {
      const msg = getErrMsg(e);
      const isColumnError = /column.*does not exist|property_report|schema cache|could not find/i.test(msg);
      if (isColumnError) {
        try {
          await updateProperty.mutateAsync({ id, ...core });
          toast({ title: "Saved", description: "Core details saved (land/cars need property_report column in DB)." });
          setEditingDetails(false);
        } catch (retryErr: unknown) {
          toast({ title: "Error", description: getErrMsg(retryErr) || "Failed to save", variant: "destructive" });
        }
      } else {
        toast({ title: "Error", description: msg, variant: "destructive" });
      }
    }
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
      if (enrichedData.property_type) updates.property_type = normalizePropertyType(enrichedData.property_type);
      if (enrichedData.land_area_sqm != null) updates.lot_size = enrichedData.land_area_sqm;
      if (enrichedData.carspaces != null) updates.car_spaces = enrichedData.carspaces;
      if (enrichedData.last_sale_price != null && !property?.price) updates.price = enrichedData.last_sale_price;
      await updateProperty.mutateAsync({ id, ...updates });
      toast({ title: "Success", description: "Property updated with Pricefinder data" });
      setEnrichedData(null);
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to update", variant: "destructive" });
    }
  };

  const handleUploadReport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.includes("pdf")) {
      toast({ title: "Error", description: "Please select a PDF file", variant: "destructive" });
      return;
    }
    setUploadReportLoading(true);
    setParsedReportData(null);
    try {
      const parsed = await parsePropertyReportPdf(file);
      setParsedReportData(parsed);
      toast({ title: "Success", description: "Property report parsed. Review and apply to property." });
    } catch (err) {
      toast({
        title: "Parse error",
        description: err instanceof Error ? err.message : "Could not parse PDF",
        variant: "destructive",
      });
    } finally {
      setUploadReportLoading(false);
      e.target.value = "";
    }
  };

  const handleUploadPropertyImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id || !user) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Error", description: "Please choose a JPEG, PNG, WebP or GIF image", variant: "destructive" });
      return;
    }
    setUploadImageLoading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("property-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("property-images").getPublicUrl(path);
      const currentImages = Array.isArray(property?.images) ? (property.images as string[]) : [];
      const newImages = [...currentImages, urlData.publicUrl];
      await updateProperty.mutateAsync({ id, images: newImages });
      toast({ title: "Success", description: "Hero image added. It will show on the property card and here." });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not upload image";
      const hint = /bucket not found|Bucket not found/i.test(String(msg))
        ? " Create the storage bucket first: see docs/PROPERTY_IMAGES_BUCKET.md"
        : "";
      toast({ title: "Upload failed", description: msg + hint, variant: "destructive" });
    } finally {
      setUploadImageLoading(false);
      e.target.value = "";
    }
  };

  const handleApplyReportData = async () => {
    if (!id || !parsedReportData) return;
    const updates: Record<string, unknown> = {};
    // Only send columns that exist in the minimal properties schema (so apply always succeeds)
    if (parsedReportData.address_line1) updates.address_line1 = parsedReportData.address_line1;
    if (parsedReportData.city) updates.city = parsedReportData.city;
    if (parsedReportData.state) updates.state = parsedReportData.state;
    if (parsedReportData.postcode) updates.postcode = parsedReportData.postcode;
    if (parsedReportData.property_type) updates.property_type = normalizePropertyType(parsedReportData.property_type);
    if (parsedReportData.bedrooms != null) updates.bedrooms = parsedReportData.bedrooms;
    if (parsedReportData.bathrooms != null) updates.bathrooms = parsedReportData.bathrooms;
    if (parsedReportData.price != null) updates.price = parsedReportData.price;
    if (parsedReportData.notes) updates.notes = parsedReportData.notes;
    // Everything else (lot_size, car_spaces, estimated_value, etc.) goes in property_report only
    const reportPayload = {
      property_type_full: parsedReportData.property_type_full,
      rpd: parsedReportData.lot_plan,
      valuation_amounts: parsedReportData.valuation_amounts,
      land_use: parsedReportData.land_use,
      zoning: parsedReportData.zoning,
      council: parsedReportData.council,
      features: parsedReportData.features?.slice(0, 20) ?? null,
      area_land: parsedReportData.lot_size,
      area_building: parsedReportData.building_size,
      area_per_m2: parsedReportData.area_per_m2,
      water_sewerage: parsedReportData.water_sewerage,
      property_id: parsedReportData.property_id,
      ubd_ref: parsedReportData.ubd_ref,
      bedrooms: parsedReportData.bedrooms,
      bathrooms: parsedReportData.bathrooms,
      car_spaces: parsedReportData.car_spaces,
    };
    const hasReportData = Object.values(reportPayload).some((v) => v != null && (Array.isArray(v) ? v.length > 0 : true));
    if (hasReportData) updates.property_report = reportPayload;

    try {
      await updateProperty.mutateAsync({ id, ...updates });
      toast({ title: "Success", description: "Property updated from report" });
      setParsedReportData(null);
    } catch (e: unknown) {
      const msg =
        e != null && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : e instanceof Error
            ? e.message
            : String(e);
      const isColumnError = /column.*does not exist|property_report|car_spaces|building_size/i.test(msg);
      if (isColumnError) {
        try {
          const coreOnly = { ...updates };
          delete coreOnly.property_report;
          delete coreOnly.car_spaces;
          delete coreOnly.building_size;
          await updateProperty.mutateAsync({ id, ...coreOnly });
          toast({ title: "Saved basics", description: "Property updated (report fields need migration: run 20260311000000_properties_report_data.sql in Supabase)." });
          setParsedReportData(null);
        } catch (retryErr: unknown) {
          const retryMsg =
            retryErr != null && typeof retryErr === "object" && "message" in retryErr
              ? String((retryErr as { message: unknown }).message)
              : retryErr instanceof Error
                ? retryErr.message
                : String(retryErr);
          toast({ title: "Error", description: retryMsg + " Run migration: supabase/migrations/20260311000000_properties_report_data.sql", variant: "destructive" });
        }
      } else {
        toast({ title: "Error", description: msg, variant: "destructive" });
      }
    }
  };

  const handleSaveProperty = async () => {
    if (!id) return;
    const updates: Record<string, unknown> = {
      address_line1: editForm.address_line1.trim() || null,
      address_line2: editForm.address_line2.trim() || null,
      city: editForm.city.trim() || null,
      state: editForm.state || null,
      postcode: editForm.postcode.trim() || null,
      country: editForm.country || "Australia",
      property_type: editForm.property_type.trim() ? normalizePropertyType(editForm.property_type) : null,
      bedrooms: editForm.bedrooms === "" ? null : Number(editForm.bedrooms),
      bathrooms: editForm.bathrooms === "" ? null : Number(editForm.bathrooms),
      price: editForm.price === "" ? null : Number(editForm.price),
      notes: editForm.notes.trim() || null,
    };
    const areaLand = editForm.lot_size === "" ? null : Number(editForm.lot_size);
    const areaBuilding = editForm.building_size === "" ? null : Number(editForm.building_size);
    const carSpaces = editForm.car_spaces === "" ? null : Number(editForm.car_spaces);
    const existingReport = (property?.property_report && typeof property.property_report === "object"
      ? { ...(property.property_report as Record<string, unknown>) }
      : {}) as Record<string, unknown>;
    const mergedReport = { ...existingReport, area_land: areaLand, area_building: areaBuilding, car_spaces: carSpaces };
    updates.property_report = mergedReport;
    try {
      await updateProperty.mutateAsync({ id, ...updates });
      toast({ title: "Success", description: "Property updated." });
      setEditPropertyOpen(false);
    } catch (e: unknown) {
      const msg = e != null && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : e instanceof Error ? e.message : String(e);
      if (/column.*does not exist|property_report|schema cache/i.test(msg)) {
        delete updates.property_report;
        try {
          await updateProperty.mutateAsync({ id, ...updates });
          toast({ title: "Success", description: "Property updated (extra fields in report need migration)." });
          setEditPropertyOpen(false);
        } catch (retryErr: unknown) {
          toast({ title: "Error", description: retryErr instanceof Error ? retryErr.message : "Failed to update", variant: "destructive" });
        }
      } else {
        toast({ title: "Error", description: msg, variant: "destructive" });
      }
    }
  };

  const imageUrls = Array.isArray(property?.images) ? (property.images as string[]) : [];
  const imageCount = imageUrls.length;

  const handleImageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !id) return;
    const oldIndex = imageUrls.indexOf(active.id as string);
    const newIndex = imageUrls.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(imageUrls, oldIndex, newIndex);
    updateProperty.mutate({ id, images: reordered });
  };

  const handleDeleteImage = (index: number) => {
    if (!id) return;
    const next = imageUrls.filter((_, i) => i !== index);
    updateProperty.mutate({ id, images: next });
    toast({ title: "Image removed", description: "The image has been removed from this property." });
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

      {/* Property images – one hero, or grid of all (side by side, same size) */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        aria-label="Upload property image"
        onChange={handleUploadPropertyImage}
      />
      <div className="mb-6">
        {imageCount === 0 ? (
          <div className="rounded-xl overflow-hidden border border-white/10 bg-muted/30 aspect-[16/10] sm:aspect-[2/1] max-h-[420px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <ImageIcon className="w-14 h-14 opacity-50" />
            <p className="text-sm font-medium">No hero image yet</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={uploadImageLoading}
              onClick={() => imageInputRef.current?.click()}
            >
              <Upload className="w-4 h-4" />
              {uploadImageLoading ? "Uploading…" : "Upload hero image"}
            </Button>
            <p className="text-xs text-muted-foreground/80">Shows on this page and on property cards</p>
          </div>
        ) : (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleImageDragEnd}>
            <SortableContext items={imageUrls} strategy={rectSortingStrategy}>
              <div className="space-y-3">
                {/* Hero: first image, same size as before */}
                <SortableImageCard
                  key={imageUrls[0]}
                  url={imageUrls[0]}
                  index={0}
                  isFirst={true}
                  size="hero"
                  uploadImageLoading={uploadImageLoading}
                  updatePending={updateProperty.isPending}
                  onAddAnother={() => imageInputRef.current?.click()}
                  onDelete={() => handleDeleteImage(0)}
                />
                {/* More photos: smaller previews in a row (or just Add when only hero) */}
                <div className="flex flex-wrap items-center gap-2">
                  {imageUrls.length > 1 && (
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mr-1 w-full sm:w-auto">More photos</span>
                  )}
                  {imageUrls.slice(1).map((url, i) => (
                    <SortableImageCard
                      key={url}
                      url={url}
                      index={i + 1}
                      isFirst={false}
                      size="thumb"
                      uploadImageLoading={uploadImageLoading}
                      updatePending={updateProperty.isPending}
                      onAddAnother={() => imageInputRef.current?.click()}
                      onDelete={() => handleDeleteImage(i + 1)}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-[140px] h-[100px] sm:w-[160px] sm:h-[110px] rounded-xl border-dashed shrink-0 gap-2"
                    disabled={uploadImageLoading || updateProperty.isPending}
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <Upload className="w-5 h-5" />
                    Add photo
                  </Button>
                </div>
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

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
        {/* Address */}
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-white/60 uppercase tracking-wide mb-1">Address</h2>
            <p className="text-foreground text-lg">{addr || "—"}</p>
          </div>
        </div>

        {/* Property details – editable section: type, beds, baths, cars, land, building, price, notes */}
        <div className="py-4 border-t border-white/10">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-xs font-medium text-white/60 uppercase tracking-wide">Property details</h3>
            {!editingDetails ? (
              <Button variant="ghost" size="sm" onClick={startEditingDetails} className="gap-1.5 text-primary hover:text-primary">
                <Edit className="w-3.5 h-3.5" /> Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={cancelEditingDetails}>Cancel</Button>
                <Button size="sm" onClick={saveDetails} disabled={updateProperty.isPending}>
                  {updateProperty.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </div>
          {editingDetails ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <Label className="text-white/60 text-xs">Type</Label>
                <Select
                  value={detailsForm.property_type || "house"}
                  onValueChange={(v) => setDetailsForm((f) => ({ ...f, property_type: v }))}
                >
                  <SelectTrigger className="mt-1 bg-white/5 border-white/10">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPE_VALUES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v.charAt(0).toUpperCase() + v.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/60 text-xs">Bedrooms</Label>
                <Input
                  type="number"
                  min={0}
                  value={detailsForm.bedrooms === "" ? "" : detailsForm.bedrooms}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, bedrooms: e.target.value === "" ? "" : Number(e.target.value) }))}
                  placeholder="—"
                  className="mt-1 bg-white/5 border-white/10"
                />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Bathrooms</Label>
                <Input
                  type="number"
                  min={0}
                  value={detailsForm.bathrooms === "" ? "" : detailsForm.bathrooms}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, bathrooms: e.target.value === "" ? "" : Number(e.target.value) }))}
                  placeholder="—"
                  className="mt-1 bg-white/5 border-white/10"
                />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Car spaces</Label>
                <Input
                  type="number"
                  min={0}
                  value={detailsForm.car_spaces === "" ? "" : detailsForm.car_spaces}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, car_spaces: e.target.value === "" ? "" : Number(e.target.value) }))}
                  placeholder="—"
                  className="mt-1 bg-white/5 border-white/10"
                />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Land size (m²)</Label>
                <Input
                  type="number"
                  min={0}
                  value={detailsForm.area_land === "" ? "" : detailsForm.area_land}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, area_land: e.target.value === "" ? "" : Number(e.target.value) }))}
                  placeholder="—"
                  className="mt-1 bg-white/5 border-white/10"
                />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Building size (m²)</Label>
                <Input
                  type="number"
                  min={0}
                  value={detailsForm.area_building === "" ? "" : detailsForm.area_building}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, area_building: e.target.value === "" ? "" : Number(e.target.value) }))}
                  placeholder="—"
                  className="mt-1 bg-white/5 border-white/10"
                />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Price ($)</Label>
                <Input
                  type="number"
                  min={0}
                  value={detailsForm.price === "" ? "" : detailsForm.price}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, price: e.target.value === "" ? "" : Number(e.target.value) }))}
                  placeholder="—"
                  className="mt-1 bg-white/5 border-white/10"
                />
              </div>
              <div className="col-span-2 sm:col-span-4">
                <Label className="text-white/60 text-xs">Notes</Label>
                <Textarea
                  value={detailsForm.notes}
                  onChange={(e) => setDetailsForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Notes…"
                  rows={3}
                  className="mt-1 bg-white/5 border-white/10 resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 text-sm">
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide">Type</p>
                <p className="font-medium capitalize">{property.property_type || report.property_type_full || "—"}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide">Bedrooms</p>
                <p className="font-medium">{property.bedrooms ?? report.bedrooms ?? "—"}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide">Bathrooms</p>
                <p className="font-medium">{property.bathrooms ?? report.bathrooms ?? "—"}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide">Car spaces</p>
                <p className="font-medium">{carSpacesVal ?? "—"}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide">Land size</p>
                <p className="font-medium">
                  {landSize != null ? `${Number(landSize).toLocaleString()} m²` : "—"}
                </p>
              </div>
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide">Building size</p>
                <p className="font-medium">
                  {(property.building_size ?? report.area_building) != null ? `${Number(property.building_size ?? report.area_building).toLocaleString()} m²` : "—"}
                </p>
              </div>
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide">Price</p>
                <p className="font-medium">
                  {property.price != null && property.price > 0 ? `$${Number(property.price).toLocaleString()}` : "—"}
                </p>
              </div>
              {(property.estimated_value != null && property.estimated_value > 0) || (property.price_listed != null && property.price_listed > 0) ? (
                <div>
                  <p className="text-white/60 text-xs uppercase tracking-wide">Other</p>
                  <p className="font-medium">
                    {[
                      property.estimated_value != null && property.estimated_value > 0 ? `Est. $${Number(property.estimated_value).toLocaleString()}` : null,
                      property.price_listed != null && property.price_listed > 0 ? `Listed $${Number(property.price_listed).toLocaleString()}` : null,
                    ].filter(Boolean).join(" · ")}
                  </p>
                </div>
              ) : null}
              {property.notes ? (
                <div className="col-span-2 sm:col-span-4">
                  <p className="text-white/60 text-xs uppercase tracking-wide">Notes</p>
                  <p className="font-medium text-foreground whitespace-pre-wrap">{property.notes}</p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Property details (from report) – RPD, valuations, zoning, features, etc. */}
        {property.property_report && typeof property.property_report === "object" && (
          <div className="py-4 border-b border-white/10">
            <h3 className="text-xs font-medium text-white/60 uppercase tracking-wide mb-3">Property details (from report)</h3>
            <dl className="space-y-2 text-sm">
              {reportDisplayValue((property.property_report as Record<string, unknown>).property_type_full) && (
                <>
                  <dt className="text-white/60">Property Type</dt>
                  <dd className="font-medium">{reportDisplayValue((property.property_report as Record<string, unknown>).property_type_full)!}</dd>
                </>
              )}
              {reportDisplayValue((property.property_report as Record<string, unknown>).rpd) && (
                <>
                  <dt className="text-white/60">RPD</dt>
                  <dd className="font-medium">{reportDisplayValue((property.property_report as Record<string, unknown>).rpd)!}</dd>
                </>
              )}
              {Array.isArray((property.property_report as Record<string, unknown>).valuation_amounts) &&
                ((property.property_report as Record<string, unknown>).valuation_amounts as Array<{ amount: number; date?: string }>).length > 0 &&
                ((property.property_report as Record<string, unknown>).valuation_amounts as Array<{ amount: number; date?: string }>).map((v, i) => (
                  <React.Fragment key={i}>
                    <dt className="text-white/60">Valuation Amount</dt>
                    <dd className="font-medium">${v.amount.toLocaleString()}{v.date ? ` - Site Value on ${v.date}` : ""}</dd>
                  </React.Fragment>
                ))}
              {reportDisplayValue((property.property_report as Record<string, unknown>).land_use) && (
                <>
                  <dt className="text-white/60">Land Use</dt>
                  <dd className="font-medium">{reportDisplayValue((property.property_report as Record<string, unknown>).land_use)!}</dd>
                </>
              )}
              {reportDisplayValue((property.property_report as Record<string, unknown>).zoning) && (
                <>
                  <dt className="text-white/60">Zoning</dt>
                  <dd className="font-medium">{reportDisplayValue((property.property_report as Record<string, unknown>).zoning)!}</dd>
                </>
              )}
              {reportDisplayValue((property.property_report as Record<string, unknown>).council) && (
                <>
                  <dt className="text-white/60">Council</dt>
                  <dd className="font-medium">{reportDisplayValue((property.property_report as Record<string, unknown>).council)!}</dd>
                </>
              )}
              {Array.isArray((property.property_report as Record<string, unknown>).features) &&
                ((property.property_report as Record<string, unknown>).features as string[]).length > 0 && (() => {
                  const feats = ((property.property_report as Record<string, unknown>).features as string[])
                    .map((f) => reportDisplayValue(f, 40))
                    .filter(Boolean) as string[];
                  if (feats.length === 0) return null;
                  return (
                    <>
                      <dt className="text-white/60">Features</dt>
                      <dd className="font-medium">{feats.join(", ")}</dd>
                    </>
                  );
                })()}
              {(function () {
                const land = (property.property_report as Record<string, unknown>)?.area_land ?? property.lot_size;
                const building = (property.property_report as Record<string, unknown>)?.area_building ?? property.building_size;
                if (land == null && building == null) return null;
                return (
                  <>
                    <dt className="text-white/60">Area</dt>
                    <dd className="font-medium">
                      {land != null ? `${Number(land).toLocaleString()} m²` : ""}
                      {land != null && building != null ? " " : ""}
                      {building != null ? `(${Number(building).toLocaleString()} m²)` : ""}
                    </dd>
                  </>
                );
              })()}
              {reportDisplayValue((property.property_report as Record<string, unknown>).area_per_m2, 30) && (
                <>
                  <dt className="text-white/60">Area $/m2</dt>
                  <dd className="font-medium">{reportDisplayValue((property.property_report as Record<string, unknown>).area_per_m2, 30)!}</dd>
                </>
              )}
              {reportDisplayValue((property.property_report as Record<string, unknown>).water_sewerage) && (
                <>
                  <dt className="text-white/60">Water/Sewerage</dt>
                  <dd className="font-medium">{reportDisplayValue((property.property_report as Record<string, unknown>).water_sewerage)!}</dd>
                </>
              )}
              {reportDisplayValue((property.property_report as Record<string, unknown>).property_id, 80) && (
                <>
                  <dt className="text-white/60">Property ID</dt>
                  <dd className="font-medium">{reportDisplayValue((property.property_report as Record<string, unknown>).property_id, 80)!}</dd>
                </>
              )}
              {reportDisplayValue((property.property_report as Record<string, unknown>).ubd_ref, 20) && (
                <>
                  <dt className="text-white/60">UBD Ref</dt>
                  <dd className="font-medium">{reportDisplayValue((property.property_report as Record<string, unknown>).ubd_ref, 20)!}</dd>
                </>
              )}
            </dl>
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

      {/* Property data: Upload Report (primary) or Enrich from API (fallback) */}
      <Card className="zoho-card p-6 mb-6 border-white/10">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Property data</h3>
        {parsedReportData ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Parsed from uploaded Pricefinder report. Review and apply below.</p>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h4 className="text-xs font-medium text-white/60 uppercase tracking-wide mb-3">Property details</h4>
              <dl className="space-y-2 text-sm">
                {parsedReportData.address_line1 && (
                  <>
                    <dt className="text-white/60">Address</dt>
                    <dd className="font-medium">{[parsedReportData.address_line1, parsedReportData.city, parsedReportData.state, parsedReportData.postcode].filter(Boolean).join(", ")}</dd>
                  </>
                )}
                {parsedReportData.property_type_full && (
                  <>
                    <dt className="text-white/60">Property Type</dt>
                    <dd className="font-medium">{parsedReportData.property_type_full}</dd>
                  </>
                )}
                {parsedReportData.lot_plan && (
                  <>
                    <dt className="text-white/60">RPD</dt>
                    <dd className="font-medium">{parsedReportData.lot_plan}</dd>
                  </>
                )}
                {parsedReportData.valuation_amounts?.length
                  ? parsedReportData.valuation_amounts.map((v, i) => (
                      <React.Fragment key={i}>
                        <dt className="text-white/60">Valuation Amount</dt>
                        <dd className="font-medium">${v.amount.toLocaleString()}{v.date ? ` - Site Value on ${v.date}` : ""}</dd>
                      </React.Fragment>
                    ))
                  : null}
                {parsedReportData.land_use && (
                  <>
                    <dt className="text-white/60">Land Use</dt>
                    <dd className="font-medium">{parsedReportData.land_use}</dd>
                  </>
                )}
                {parsedReportData.zoning && (
                  <>
                    <dt className="text-white/60">Zoning</dt>
                    <dd className="font-medium">{parsedReportData.zoning}</dd>
                  </>
                )}
                {parsedReportData.council && (
                  <>
                    <dt className="text-white/60">Council</dt>
                    <dd className="font-medium">{parsedReportData.council}</dd>
                  </>
                )}
                {(parsedReportData.bedrooms != null || parsedReportData.bathrooms != null || parsedReportData.car_spaces != null) && (
                  <>
                    <dt className="text-white/60">Bedrooms / Bathrooms / Car spaces</dt>
                    <dd className="font-medium">{parsedReportData.bedrooms ?? "—"} / {parsedReportData.bathrooms ?? "—"} / {parsedReportData.car_spaces ?? "—"}</dd>
                  </>
                )}
                {parsedReportData.features?.length ? (
                  <>
                    <dt className="text-white/60">Features</dt>
                    <dd className="font-medium">{parsedReportData.features.join(", ")}</dd>
                  </>
                ) : null}
                {(parsedReportData.lot_size != null || parsedReportData.building_size != null) && (
                  <>
                    <dt className="text-white/60">Area</dt>
                    <dd className="font-medium">
                      {parsedReportData.lot_size != null ? `${parsedReportData.lot_size.toLocaleString()} m²` : ""}
                      {parsedReportData.lot_size != null && parsedReportData.building_size != null ? " " : ""}
                      {parsedReportData.building_size != null ? `(${parsedReportData.building_size.toLocaleString()} m²)` : ""}
                    </dd>
                  </>
                )}
                {parsedReportData.area_per_m2 && (
                  <>
                    <dt className="text-white/60">Area $/m2</dt>
                    <dd className="font-medium">{parsedReportData.area_per_m2}</dd>
                  </>
                )}
                {parsedReportData.water_sewerage && (
                  <>
                    <dt className="text-white/60">Water/Sewerage</dt>
                    <dd className="font-medium">{parsedReportData.water_sewerage}</dd>
                  </>
                )}
                {parsedReportData.property_id && (
                  <>
                    <dt className="text-white/60">Property ID</dt>
                    <dd className="font-medium">{parsedReportData.property_id}</dd>
                  </>
                )}
                {parsedReportData.ubd_ref && (
                  <>
                    <dt className="text-white/60">UBD Ref</dt>
                    <dd className="font-medium">{parsedReportData.ubd_ref}</dd>
                  </>
                )}
                {parsedReportData.price != null && (
                  <>
                    <dt className="text-white/60">Price</dt>
                    <dd className="font-medium">${parsedReportData.price.toLocaleString()}</dd>
                  </>
                )}
              </dl>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="default" size="sm" onClick={handleApplyReportData} disabled={updateProperty.isPending}>
                {updateProperty.isPending ? "Applying..." : "Apply to property"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setParsedReportData(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        ) : enrichedData ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Data from Pricefinder API. Review and apply below.</p>
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
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="property-report-upload-detail"
                type="file"
                accept=".pdf,application/pdf"
                className="sr-only"
                onChange={handleUploadReport}
                aria-label="Upload Pricefinder property report PDF"
              />
              <label
                htmlFor="property-report-upload-detail"
                className={`inline-flex items-center justify-center gap-1.5 rounded-md border border-primary bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground cursor-pointer hover:bg-primary/90 ${uploadReportLoading ? "pointer-events-none opacity-50" : ""}`}
              >
                <Upload className="w-4 h-4" />
                {uploadReportLoading ? "Parsing..." : "Upload Property Report"}
              </label>
              <span className="text-xs text-muted-foreground">Upload a Pricefinder PDF report (no API key needed)</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
              <Button variant="outline" size="sm" onClick={handleEnrichFromPricefinder} disabled={enrichLoading}>
                {enrichLoading ? "Loading..." : "Enrich from Pricefinder API"}
              </Button>
              <span className="text-xs text-muted-foreground">
                Live lookup by address (requires API key)
              </span>
            </div>
            {enrichUnconfigured && (
              <p className="text-xs text-muted-foreground">
                Pricefinder API not configured. See docs/PRICEFINDER_INTEGRATION.md. Use Upload Property Report instead.
              </p>
            )}
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
              <AddressAutocomplete
                className="bg-input"
                value={editForm.address_line1}
                onChange={(value) =>
                  setEditForm((f) => ({ ...f, address_line1: value }))
                }
                onPlaceSelected={(parts) =>
                  setEditForm((f) => ({
                    ...f,
                    address_line1: parts.address_line1 || f.address_line1,
                    city: parts.city || f.city,
                    state: parts.state || f.state,
                    postcode: parts.postcode || f.postcode,
                    country: parts.country || f.country || "Australia",
                  }))
                }
                placeholder="Street address"
              />
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select
                  value={editForm.property_type ? normalizePropertyType(editForm.property_type) : "house"}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, property_type: v }))}
                >
                  <SelectTrigger className="bg-input">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPE_VALUES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v.charAt(0).toUpperCase() + v.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Bedrooms</Label>
                <Input type="number" min={0} className="bg-input" value={editForm.bedrooms} onChange={(e) => setEditForm((f) => ({ ...f, bedrooms: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Bathrooms</Label>
                <Input type="number" min={0} className="bg-input" value={editForm.bathrooms} onChange={(e) => setEditForm((f) => ({ ...f, bathrooms: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Car spaces</Label>
                <Input type="number" min={0} className="bg-input" value={editForm.car_spaces} onChange={(e) => setEditForm((f) => ({ ...f, car_spaces: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Price</Label>
                <Input type="number" min={0} className="bg-input" value={editForm.price} onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))} placeholder="0" />
              </div>
              <div className="grid gap-2">
                <Label>Land size (m²)</Label>
                <Input type="number" min={0} className="bg-input" value={editForm.lot_size} onChange={(e) => setEditForm((f) => ({ ...f, lot_size: e.target.value }))} placeholder="0" />
              </div>
              <div className="grid gap-2">
                <Label>Building size (m²)</Label>
                <Input type="number" min={0} className="bg-input" value={editForm.building_size} onChange={(e) => setEditForm((f) => ({ ...f, building_size: e.target.value }))} placeholder="0" />
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
