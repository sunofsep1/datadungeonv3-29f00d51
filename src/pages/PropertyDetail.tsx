import React, { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

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
import { ArrowLeft, Building2, Plus, Edit, ChevronLeft, ChevronRight, Printer, Images } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { format } from "date-fns";
import { useProperty, useUpdateProperty, useProperties, formatPropertyAddress } from "@/hooks/useProperties";
import { useContacts, getContactDisplayName } from "@/hooks/useContacts";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useCreateContactPropertyLink } from "@/hooks/useContactPropertyLinks";
import { useToast } from "@/hooks/use-toast";
import { PropertyContactsCard } from "@/components/properties/PropertyContactsCard";
import { PropertySuiteCard } from "@/components/properties/PropertySuiteCard";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { supabase } from "@/integrations/supabase/client";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import type { ParsedPropertyReport } from "@/lib/parsePropertyReportPdf";
import { normalizePropertyType, PROPERTY_TYPE_VALUES } from "@/lib/propertyType";
import { usePricefinderPropertyEnrich, type PricefinderPropertyData } from "@/hooks/usePricefinderEnrich";
import { isPricefinderConfiguredError } from "@/lib/pricefinderClient";
import { markPricefinderApiUnavailable } from "@/lib/pricefinderMode";
import {
  applyPropertyReportToProperty,
  errorMessageFromUnknown,
} from "@/lib/applyPropertyReport";
import { splitOwnerNames } from "@/lib/ownerNameParse";
import { PricefinderResearchPanel } from "@/components/pricefinder/PricefinderResearchPanel";
import { OwnerReviewDialog } from "@/components/pricefinder/OwnerReviewDialog";
import { PropertyHeroMosaic } from "@/components/properties/PropertyHeroMosaic";
import { PropertyPhotosSheet } from "@/components/properties/PropertyPhotosSheet";
import { isLongHoldProperty, yearsSinceLastSale } from "@/lib/propertyReportIntel";

const LINK_ROLES = ["owner", "seller", "buyer", "tenant", "investor", "agent", "interested", "other"] as const;

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
  const [enrichedData, setEnrichedData] = useState<PricefinderPropertyData | null>(null);
  const [parsedReportData, setParsedReportData] = useState<ParsedPropertyReport | null>(null);
  const enrichMutation = usePricefinderPropertyEnrich();
  const [uploadReportLoading, setUploadReportLoading] = useState(false);
  const [enrichUnconfigured, setEnrichUnconfigured] = useState(false);
  const [ownerSuggestionOpen, setOwnerSuggestionOpen] = useState(false);
  const [lastAppliedReport, setLastAppliedReport] = useState<ParsedPropertyReport | null>(null);
  const [photosSheetOpen, setPhotosSheetOpen] = useState(false);
  const [photosInitialIndex, setPhotosInitialIndex] = useState(0);

  const links = Array.isArray(property?.contact_property_links) ? property.contact_property_links : [];
  const linkedContactIds = useMemo(
    () => new Set(links.map((l) => l.contact_id)),
    [links]
  );
  const availableContacts = useMemo(
    () => (contacts ?? []).filter((c) => !linkedContactIds.has(c.id)),
    [contacts, linkedContactIds],
  );

  const selectedLinkContact = useMemo(
    () => availableContacts.find((c) => c.id === addOwnerContactId),
    [availableContacts, addOwnerContactId],
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
  const propertyImages = Array.isArray(property.images) ? (property.images as string[]) : [];
  const displayPrice =
    (property.price_listed ?? property.price ?? 0) > 0
      ? `$${(property.price_listed ?? property.price ?? 0).toLocaleString()}`
      : null;

  const openPhotosSheet = (index = 0) => {
    setPhotosInitialIndex(index);
    setPhotosSheetOpen(true);
  };

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
    setEnrichUnconfigured(false);
    setEnrichedData(null);
    const address = formatPropertyAddress(property) || property.address_line1 || "";
    try {
      const data = await enrichMutation.mutateAsync(address);
      setEnrichedData(data);
      toast({ title: "Success", description: "Property data loaded from Pricefinder" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not reach Pricefinder";
      if (isPricefinderConfiguredError(msg)) {
        markPricefinderApiUnavailable();
        setEnrichUnconfigured(true);
        return;
      }
      toast({ title: "Error", description: msg, variant: "destructive" });
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
      const { parsePropertyReportPdf } = await import("@/lib/parsePropertyReportPdf");
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

  const handleApplyReportData = async () => {
    if (!id || !parsedReportData) return;
    const existingReport =
      property?.property_report && typeof property.property_report === "object"
        ? (property.property_report as Record<string, unknown>)
        : null;
    const snapshot = parsedReportData;

    try {
      const result = await applyPropertyReportToProperty(supabase, id, parsedReportData, existingReport);
      await queryClient.invalidateQueries({ queryKey: ["properties"] });
      await queryClient.invalidateQueries({ queryKey: ["property", id] });
      await queryClient.invalidateQueries({ queryKey: ["contacts"] });
      const description =
        result.warnings.length > 0
          ? `Property updated. ${result.warnings[0]}`
          : "Property updated from report";
      toast({ title: result.partialSave ? "Saved (partial)" : "Success", description });
      setParsedReportData(null);

      if (splitOwnerNames(snapshot.owner_names).length > 0) {
        setLastAppliedReport(snapshot);
        setOwnerSuggestionOpen(true);
      }
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: errorMessageFromUnknown(e),
        variant: "destructive",
      });
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

      {id ? (
        <PropertyHeroMosaic
          className="mb-4"
          images={propertyImages}
          onOpenGallery={openPhotosSheet}
          onAddPhotos={() => openPhotosSheet(0)}
        />
      ) : null}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex shrink-0 items-center gap-1">
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
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 truncate text-xl font-bold text-foreground sm:text-2xl">
              <Building2 className="h-6 w-6 shrink-0" />
              {addr || "Property"}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {property.property_type ? (
                <Badge variant="secondary" className="text-xs capitalize">
                  {property.property_type}
                </Badge>
              ) : null}
              {property.bedrooms != null ? (
                <Badge variant="outline" className="text-xs">
                  {property.bedrooms} bed
                </Badge>
              ) : null}
              {property.bathrooms != null ? (
                <Badge variant="outline" className="text-xs">
                  {property.bathrooms} bath
                </Badge>
              ) : null}
              {property.car_spaces != null && property.car_spaces > 0 ? (
                <Badge variant="outline" className="text-xs">
                  {property.car_spaces} car
                </Badge>
              ) : null}
              {displayPrice ? (
                <Badge variant="outline" className="text-xs font-semibold tabular-nums">
                  {displayPrice}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {id ? (
            <Button variant="outline" onClick={() => openPhotosSheet(0)} className="gap-2">
              <Images className="h-4 w-4" />
              Photos
              {propertyImages.length > 0 ? (
                <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 px-1.5 text-xs">
                  {propertyImages.length}
                </Badge>
              ) : null}
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => navigate(`/properties/${id}/print`)} className="gap-2">
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button variant="outline" onClick={handleOpenEdit} className="gap-2">
            <Edit className="h-4 w-4" /> Edit property
          </Button>
        </div>
      </div>

      {id ? (
        <PropertyPhotosSheet
          open={photosSheetOpen}
          onOpenChange={setPhotosSheetOpen}
          propertyId={id}
          images={propertyImages}
          initialIndex={photosInitialIndex}
        />
      ) : null}

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
        <div className="py-1">
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

      {/* Property data: Pricefinder research + PDF import */}
      <Card className="zoho-card p-6 mb-6 border-white/10" id="pricefinder-research">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Property data</h3>
          {isLongHoldProperty(report as Record<string, unknown>) ? (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200">
              Long hold · {yearsSinceLastSale(report as Record<string, unknown>)}y since sale
            </span>
          ) : null}
        </div>
        <PricefinderResearchPanel
          propertyId={id}
          address={formatPropertyAddress(property)}
          parsedReport={parsedReportData}
          enrichedData={enrichedData}
          uploadLoading={uploadReportLoading}
          applyLoading={updateProperty.isPending}
          enrichLoading={enrichMutation.isPending}
          onUploadReport={handleUploadReport}
          onApplyReport={handleApplyReportData}
          onDismissReport={() => setParsedReportData(null)}
          onApplyEnriched={handleApplyEnrichedData}
          onDismissEnriched={() => setEnrichedData(null)}
          onEnrichFromApi={() => void handleEnrichFromPricefinder()}
          uploadInputId="property-report-upload-detail"
        />
        {enrichUnconfigured ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Live API needs OAuth credentials in Supabase. Use Upload Property Report or Open in Pricefinder.
          </p>
        ) : null}
      </Card>

      <OwnerReviewDialog
        open={ownerSuggestionOpen}
        onOpenChange={setOwnerSuggestionOpen}
        propertyId={id!}
        propertyAddress={formatPropertyAddress(property!)}
        ownerNames={lastAppliedReport?.owner_names}
        ownerPhones={lastAppliedReport?.owner_phones}
        linkedContactIds={links.map((l) => l.contact_id)}
        linkedContactNames={links
          .map((l) => contacts?.find((c) => c.id === l.contact_id)?.name?.trim())
          .filter(Boolean) as string[]}
        onComplete={() => void refetch()}
      />

      <Card className="zoho-card p-6 mb-6 border-white/10">
        <ActivityTimeline entityType="property" entityId={id} showAddNote={true} />
      </Card>

      <Dialog
        open={addOwnerOpen}
        onOpenChange={(open) => {
          setAddOwnerOpen(open);
          if (!open) setAddOwnerContactId("");
        }}
      >
        <DialogContent className="sm:max-w-md bg-[#242424] border-white/10">
          <DialogHeader>
            <DialogTitle>Link contact to property</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Contact</Label>
              {availableContacts.length === 0 ? (
                <p className="text-sm text-white/60 rounded-md border border-white/10 px-3 py-2">
                  Create contacts first, or they may all be linked already.
                </p>
              ) : (
                <>
                  {selectedLinkContact ? (
                    <p className="text-sm text-foreground">
                      Selected:{" "}
                      <span className="font-medium text-teal">{getContactDisplayName(selectedLinkContact)}</span>
                    </p>
                  ) : null}
                  <Command className="rounded-md border border-white/10 bg-input">
                    <CommandInput placeholder="Search contacts…" />
                    <CommandList className="max-h-[220px]">
                      <CommandEmpty>No contacts found.</CommandEmpty>
                      <CommandGroup>
                        {availableContacts.map((c) => {
                          const label = getContactDisplayName(c);
                          const searchValue = [label, (c as { email?: string }).email, (c as { phone?: string }).phone]
                            .filter(Boolean)
                            .join(" ");
                          return (
                          <CommandItem
                            key={c.id}
                            value={searchValue}
                            onSelect={() => setAddOwnerContactId(c.id)}
                          >
                            {label}
                          </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </>
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
