import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PropertyAddressFields } from "@/components/properties/PropertyAddressFields";
import {
  emptyLegalFields,
  emptyStructuredAddress,
  googlePlacesToStructured,
  legalFieldsFromReport,
  mergeLegalIntoReport,
  parseAddressLineIntoStructured,
  structuredAddressToStorage,
  validateStructuredAddress,
  type PropertyLegalFields,
  type StructuredPropertyAddress,
} from "@/lib/australianPropertyAddress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { SegmentedTabsList, SegmentedTabsTrigger } from "@/components/ui/segmented-tabs";
import { Building2, Search, Plus, LayoutGrid, List, Download, CheckSquare, Square, Upload, GitMerge } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PropertyViewMode } from "@/components/PropertyManagement/PropertyList";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
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
import { useProperties, useCreateProperty, useUpdateProperty, useDeleteProperty, useProperty, formatPropertyAddress, type PropertyWithLinks } from "@/hooks/useProperties";
import {
  PropertyImagesGallery,
  PropertyImagesPendingPicker,
  uploadPendingPropertyImages,
} from "@/components/properties/PropertyImagesGallery";
import { bucketNotFoundHint } from "@/lib/propertyImageUpload";
import { useAuth } from "@/contexts/AuthContext";
import { PropertyList } from "@/components/PropertyManagement/PropertyList";
import { MergePropertiesDialog } from "@/components/PropertyManagement/MergePropertiesDialog";
import { getContactDisplayName, useContacts } from "@/hooks/useContacts";
import { useCreateContactPropertyLink } from "@/hooks/useContactPropertyLinks";
import { useToast } from "@/hooks/use-toast";
import type { ParsedPropertyReport } from "@/lib/parsePropertyReportPdf";

type PropertyType = "house" | "apartment" | "townhouse" | "land";

const createEmptyProperty = () => ({
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  postcode: "",
  country: "Australia",
  property_type: "house" as PropertyType,
  bedrooms: null as number | null,
  bathrooms: null as number | null,
  price: null as number | null,
  lot_size: null as number | null,
  car_spaces: null as number | null,
  building_size: null as number | null,
  estimated_value: null as number | null,
  year_built: null as number | null,
  garages: null as number | null,
  carports: null as number | null,
  notes: "",
  property_report: null as Record<string, unknown> | null,
});

export default function Properties() {
  const navigate = useNavigate();
  const { data: properties, isLoading, isError, error, refetch } = useProperties();
  const { data: contacts = [] } = useContacts();
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const deleteProperty = useDeleteProperty();
  const createLink = useCreateContactPropertyLink();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyWithLinks | null>(null);
  const [formData, setFormData] = useState(createEmptyProperty());
  const [structuredAddress, setStructuredAddress] = useState<StructuredPropertyAddress>(() => emptyStructuredAddress());
  const [legalFields, setLegalFields] = useState<PropertyLegalFields>(() => emptyLegalFields());
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<string[]>([]);
  const [ownerSearchQuery, setOwnerSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [propertyToDelete, setPropertyToDelete] = useState<PropertyWithLinks | null>(null);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set());
  const [actionsPopoverOpen, setActionsPopoverOpen] = useState(false);
  const [viewMode, setViewMode] = useState<PropertyViewMode>("grid");
  const [sortBy, setSortBy] = useState<"address" | "price-asc" | "price-desc" | "newest">("newest");
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [uploadReportLoading, setUploadReportLoading] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [pendingImageFiles, setPendingImageFiles] = useState<File[]>([]);

  const { data: editingPropertyLive } = useProperty(
    isDialogOpen && editingProperty?.id ? editingProperty.id : undefined,
  );

  const filtered = useMemo(() => {
    return (properties ?? []).filter((p) => {
      const addr = formatPropertyAddress(p).toLowerCase();
      const q = debouncedSearch.trim().toLowerCase();
      return !q || addr.includes(q);
    });
  }, [properties, debouncedSearch]);

  const mergeDialogProperties = useMemo(
    () => (properties ?? []).filter((p) => selectedPropertyIds.has(p.id)),
    [properties, selectedPropertyIds],
  );

  const filteredOwners = useMemo(() => {
    const q = ownerSearchQuery.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((contact) => {
      const name = getContactDisplayName(contact).toLowerCase();
      const email = String(contact.email ?? "").toLowerCase();
      const phone = String(contact.phone ?? "").toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [contacts, ownerSearchQuery]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    const addr = (p: PropertyWithLinks) => formatPropertyAddress(p).toLowerCase();
    const price = (p: PropertyWithLinks) => p.price_listed ?? p.price ?? 0;
    const created = (p: PropertyWithLinks) => new Date(p.created_at ?? 0).getTime();
    if (sortBy === "address") list.sort((a, b) => addr(a).localeCompare(addr(b)));
    else if (sortBy === "price-asc") list.sort((a, b) => price(a) - price(b));
    else if (sortBy === "price-desc") list.sort((a, b) => price(b) - price(a));
    else if (sortBy === "newest") list.sort((a, b) => created(b) - created(a));
    return list;
  }, [filtered, sortBy]);

  const totalPages = Math.ceil(sorted.length / itemsPerPage);

  // Reset to page 1 when search, sort, or itemsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, sortBy, itemsPerPage]);

  const handleDeleteProperty = async (property: PropertyWithLinks) => {
    try {
      await deleteProperty.mutateAsync(property.id);
      toast({ title: "Deleted", description: "Property removed." });
      setPropertyToDelete(null);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete property",
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = (selectedOnly?: boolean) => {
    const list =
      selectedOnly && selectedPropertyIds.size > 0
        ? sorted.filter((p) => selectedPropertyIds.has(p.id))
        : sorted;
    if (list.length === 0) {
      toast({
        title: "No data",
        description: "No properties to export (maybe filters hide all)",
        variant: "destructive",
      });
      return;
    }
    const headers = ["Address", "Type", "Bedrooms", "Bathrooms", "Price", "Owners", "Created At"];
    const rows = list.map((p) => {
      const addr = formatPropertyAddress(p);
      const owners = (p.contact_property_links ?? [])
        .filter((l) => l.role === "owner" || !l.role)
        .map((l) => (l.contacts as { name?: string } | null)?.name ?? "")
        .filter(Boolean)
        .join("; ");
      return [
        addr,
        p.property_type ?? "",
        p.bedrooms ?? "",
        p.bathrooms ?? "",
        (p.price_listed ?? p.price ?? 0) || "",
        owners,
        p.created_at ? new Date(p.created_at).toLocaleDateString() : "",
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
    a.download = `properties-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${rows.length} properties exported to CSV` });
  };

  const handleOpenDialog = (property?: PropertyWithLinks) => {
    setOwnerSearchQuery("");
    if (property) {
      setEditingProperty(property);
      const report =
        property.property_report && typeof property.property_report === "object"
          ? (property.property_report as Record<string, unknown>)
          : null;
      const parsed = parseAddressLineIntoStructured(property.address_line1 || "", property.address_line2 || "");
      setStructuredAddress({
        property_name: String(report?.property_name ?? ""),
        level_no: parsed.level_no,
        unit_no: parsed.unit_no,
        street_no: parsed.street_no,
        street_name: parsed.street_name,
        street_type: parsed.street_type,
        suburb: property.suburb || property.city || "",
        state: property.state || "",
        postcode: property.postcode || "",
        country: property.country || "Australia",
      });
      setLegalFields(legalFieldsFromReport(report));
      setFormData({
        address_line1: property.address_line1 || "",
        address_line2: property.address_line2 || "",
        city: property.city || "",
        state: property.state || "",
        postcode: property.postcode || "",
        country: property.country || "Australia",
        property_type: (property.property_type as PropertyType) || "house",
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        price: property.price,
        lot_size: property.lot_size ?? (property as { land_area_sqm?: number | null }).land_area_sqm ?? null,
        car_spaces: property.car_spaces ?? null,
        building_size:
          property.building_size ?? (property as { floor_area_sqm?: number | null }).floor_area_sqm ?? null,
        estimated_value: property.estimated_value ?? null,
        year_built: property.year_built ?? null,
        garages: report?.garages != null ? Number(report.garages) : null,
        carports: report?.carports != null ? Number(report.carports) : null,
        notes: property.notes || "",
        property_report: report,
      });
      const ownerIds = (property.contact_property_links ?? [])
        .filter((l) => l.role === "owner" || !l.role)
        .map((l) => l.contact_id);
      setSelectedOwnerIds(ownerIds);
    } else {
      setEditingProperty(null);
      setFormData(createEmptyProperty());
      setStructuredAddress(emptyStructuredAddress());
      setLegalFields(emptyLegalFields());
      setSelectedOwnerIds([]);
    }
    setIsDialogOpen(true);
  };

  const handleUploadReport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.includes("pdf")) {
      toast({ title: "Error", description: "Please select a PDF file", variant: "destructive" });
      return;
    }
    setUploadReportLoading(true);
    try {
      const { parsePropertyReportPdf } = await import("@/lib/parsePropertyReportPdf");
      const parsed: ParsedPropertyReport = await parsePropertyReportPdf(file);
      setFormData((prev) => ({
        ...prev,
        address_line1: parsed.address_line1 || prev.address_line1,
        city: parsed.city || prev.city,
        state: parsed.state || prev.state,
        postcode: parsed.postcode || prev.postcode,
        property_type: (parsed.property_type as PropertyType) || prev.property_type,
        bedrooms: parsed.bedrooms ?? prev.bedrooms,
        bathrooms: parsed.bathrooms ?? prev.bathrooms,
        price: parsed.price ?? prev.price,
        lot_size: parsed.lot_size ?? prev.lot_size,
        car_spaces: parsed.car_spaces ?? prev.car_spaces,
        building_size: parsed.building_size ?? prev.building_size,
        estimated_value: parsed.estimated_value ?? prev.estimated_value,
        notes: parsed.features?.length ? parsed.features.join(", ") : prev.notes,
        property_report: {
          property_type_full: parsed.property_type_full,
          rpd: parsed.lot_plan,
          valuation_amounts: parsed.valuation_amounts,
          land_use: parsed.land_use,
          zoning: parsed.zoning,
          council: parsed.council,
          features: parsed.features?.slice(0, 20) ?? null,
          area_land: parsed.lot_size,
          area_building: parsed.building_size,
          area_per_m2: parsed.area_per_m2,
          water_sewerage: parsed.water_sewerage,
          property_id: parsed.property_id,
          ubd_ref: parsed.ubd_ref,
          owner_names: parsed.owner_names,
          owner_phones: parsed.owner_phones,
          sales_history: parsed.sales_history?.slice(0, 10) ?? null,
          last_sale_price: parsed.price ?? parsed.sales_history?.[0]?.amount ?? null,
          last_sale_date: parsed.sales_history?.[0]?.date ?? null,
          source: "pricefinder_pdf",
        } as Record<string, unknown>,
      }));
      setStructuredAddress(
        googlePlacesToStructured({
          address_line1: parsed.address_line1 || "",
          address_line2: "",
          city: parsed.city || "",
          state: parsed.state || "",
          postcode: parsed.postcode || "",
          country: "Australia",
        }),
      );
      if (parsed.lot_plan) {
        setLegalFields((prev) => ({ ...prev, deposited_plan: parsed.lot_plan ?? prev.deposited_plan }));
      }
      toast({ title: "Success", description: "Property report parsed. Review and save." });
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

  const handleSaveProperty = async () => {
    const addressError = validateStructuredAddress(structuredAddress);
    if (addressError) {
      toast({ title: "Address incomplete", description: addressError, variant: "destructive" });
      return;
    }
    const storedAddress = structuredAddressToStorage(structuredAddress);
    const beds = formData.bedrooms;
    const baths = formData.bathrooms;
    const priceVal = formData.price;
    const isLand = formData.property_type === "land";
    if (!editingProperty) {
      if (!formData.property_type?.trim()) {
        toast({ title: "Error", description: "Please choose a property type.", variant: "destructive" });
        return;
      }
      if (!isLand && (beds == null || Number.isNaN(Number(beds)))) {
        toast({ title: "Error", description: "Please enter bedrooms (or choose Land as type).", variant: "destructive" });
        return;
      }
      if (!isLand && (baths == null || Number.isNaN(Number(baths)))) {
        toast({ title: "Error", description: "Please enter bathrooms (or choose Land as type).", variant: "destructive" });
        return;
      }
    }
    if (beds != null && (Number.isNaN(Number(beds)) || beds < 0 || Math.floor(beds) !== beds)) {
      toast({ title: "Error", description: "Bedrooms must be a non-negative whole number", variant: "destructive" });
      return;
    }
    if (baths != null && (Number.isNaN(Number(baths)) || baths < 0)) {
      toast({ title: "Error", description: "Bathrooms must be a non-negative number", variant: "destructive" });
      return;
    }
    if (priceVal != null && (Number.isNaN(Number(priceVal)) || priceVal < 0)) {
      toast({ title: "Error", description: "Price must be a non-negative number", variant: "destructive" });
      return;
    }

    try {
      let propertyId: string;
      let reportPayload = mergeLegalIntoReport(formData.property_report, legalFields);
      if (structuredAddress.property_name.trim()) {
        reportPayload = { ...reportPayload, property_name: structuredAddress.property_name.trim() };
      }
      if (formData.garages != null) reportPayload = { ...reportPayload, garages: formData.garages };
      if (formData.carports != null) reportPayload = { ...reportPayload, carports: formData.carports };

      const savePayload = {
        ...storedAddress,
        property_type: formData.property_type || null,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        price: formData.price,
        lot_size: formData.lot_size ?? null,
        land_area_sqm: formData.lot_size ?? null,
        car_spaces: formData.car_spaces ?? null,
        building_size: formData.building_size ?? null,
        floor_area_sqm: formData.building_size ?? null,
        estimated_value: formData.estimated_value ?? null,
        year_built: formData.year_built ?? null,
        notes: formData.notes || null,
        property_report: Object.keys(reportPayload).length > 0 ? reportPayload : null,
      };

      if (editingProperty) {
        const updated = await updateProperty.mutateAsync({
          id: editingProperty.id,
          ...savePayload,
        });
        propertyId = updated.id;
        toast({ title: "Success", description: "Property updated!" });
      } else {
        const created = await createProperty.mutateAsync({
          ...savePayload,
          property_type: formData.property_type || "house",
        });
        propertyId = created.id;
        toast({ title: "Success", description: "Property added!" });
      }

      // Handle owner links
      if (!editingProperty) {
        // For new properties, add all selected owners
        for (const contactId of selectedOwnerIds) {
          await createLink.mutateAsync({
            contact_id: contactId,
            property_id: propertyId,
            role: "owner",
            notes: null,
          });
        }
      }

      if (!editingProperty && pendingImageFiles.length > 0 && user) {
        const { urls, failed } = await uploadPendingPropertyImages(propertyId, user.id, pendingImageFiles);
        if (urls.length > 0) {
          await updateProperty.mutateAsync({ id: propertyId, images: urls });
        }
        if (failed.length > 0) {
          toast({
            title: urls.length > 0 ? "Some photos failed" : "Photo upload failed",
            description: `${failed.map((f) => f.name).join(", ")}${bucketNotFoundHint(failed[0]?.message ?? "")}`,
            variant: "destructive",
          });
        } else if (urls.length > 0) {
          toast({
            title: "Photos uploaded",
            description: `${urls.length} photo${urls.length === 1 ? "" : "s"} added to the property.`,
          });
        }
      }

      setIsDialogOpen(false);
      setFormData(createEmptyProperty());
      setStructuredAddress(emptyStructuredAddress());
      setLegalFields(emptyLegalFields());
      setSelectedOwnerIds([]);
      setPendingImageFiles([]);
      setEditingProperty(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save property",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Properties" description="Properties and linked owners" />
        <div className="space-y-3 mt-6">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    const isMissingTable =
      error instanceof Error &&
      (error.message.includes("not set up") ||
        error.message.includes("schema cache") ||
        error.message.includes("does not exist") ||
        error.message.includes("could not find"));
    return (
      <div className="animate-fade-in">
        <PageHeader title="Properties" description="Properties and linked owners" />
        <div className="text-center py-12 rounded-lg border border-border bg-card/80 p-8 max-w-lg mx-auto mt-6">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-70 text-muted-foreground" />
          <p className="font-medium text-foreground mb-2">Couldn&apos;t load properties</p>
          <p className="text-sm text-muted-foreground mb-4">
            {error instanceof Error ? error.message : "Check your connection and migrations, then retry."}
          </p>
            {isMissingTable && (
            <p className="text-xs text-muted-foreground mb-4 text-left bg-muted/50 rounded p-3">
              Run migrations so the <code className="text-[#00BCD4]">properties</code> table exists:{" "}
              <code className="block mt-2 text-muted-foreground">npm run db:push</code> or in Supabase Dashboard → SQL Editor run the SQL from{" "}
              <code className="text-[#00BCD4]">supabase/migrations/RUN_IN_SUPABASE_DASHBOARD_properties_only.sql</code>.
            </p>
          )}
          <Button onClick={() => refetch()} variant="outline" className="border-border text-foreground hover:bg-muted">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in min-h-[60vh]">
      <PageHeader
        title="Properties"
        description="Properties and linked owners"
        actions={
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setFormData(createEmptyProperty());
                setStructuredAddress(emptyStructuredAddress());
                setLegalFields(emptyLegalFields());
                setSelectedOwnerIds([]);
                setPendingImageFiles([]);
                setEditingProperty(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Property</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[720px] bg-card border-border max-h-[90vh] overflow-hidden flex flex-col text-foreground">
              <DialogHeader>
                <DialogTitle>
                  {editingProperty ? "Edit Property" : "Add New Property"}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-2 mb-2">
                <input
                  id="property-report-upload"
                  type="file"
                  accept=".pdf,application/pdf"
                  className="sr-only"
                  onChange={handleUploadReport}
                  aria-label="Upload Pricefinder property report PDF"
                />
                <label
                  htmlFor="property-report-upload"
                  className={`inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground ${uploadReportLoading ? "pointer-events-none opacity-50" : ""}`}
                >
                  <Upload className="w-4 h-4" />
                  {uploadReportLoading ? "Parsing PDF..." : "Upload Property Report"}
                </label>
                <p className="text-xs text-muted-foreground mt-1">Upload a Pricefinder PDF to auto-fill fields</p>
              </div>
              <ScrollArea className="flex-1 pr-4">
                <Tabs defaultValue="address" className="mt-4">
                  <SegmentedTabsList className="grid-cols-2 sm:grid-cols-5">
                    <SegmentedTabsTrigger value="address">Address</SegmentedTabsTrigger>
                    <SegmentedTabsTrigger value="details">Details</SegmentedTabsTrigger>
                    <SegmentedTabsTrigger value="photos">Photos</SegmentedTabsTrigger>
                    <SegmentedTabsTrigger value="owners">Owners</SegmentedTabsTrigger>
                    <SegmentedTabsTrigger value="notes">Notes</SegmentedTabsTrigger>
                  </SegmentedTabsList>
                  <TabsContent value="address" className="space-y-4 mt-4">
                    <PropertyAddressFields
                      address={structuredAddress}
                      legal={legalFields}
                      onAddressChange={setStructuredAddress}
                      onLegalChange={setLegalFields}
                    />
                  </TabsContent>
                  <TabsContent value="details" className="space-y-4 mt-4">
                    <p className="text-xs text-muted-foreground">
                      Property specs — matches Agentbox bedrooms, land/home size, parking and year built.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Property type *</Label>
                      <Select
                        value={formData.property_type}
                        onValueChange={(value: PropertyType) =>
                          setFormData({ ...formData, property_type: value })
                        }
                      >
                        <SelectTrigger className="bg-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="house">House</SelectItem>
                          <SelectItem value="apartment">Apartment</SelectItem>
                          <SelectItem value="townhouse">Townhouse</SelectItem>
                          <SelectItem value="land">Land</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Guide / last sale price ($)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        className="bg-input"
                        value={formData.price || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            price: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Estimated value ($)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        className="bg-input"
                        value={formData.estimated_value ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            estimated_value: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Bedrooms{formData.property_type !== "land" ? " *" : ""}</Label>
                      <Input
                        type="number"
                        className="bg-input"
                        value={formData.bedrooms ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            bedrooms: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bathrooms{formData.property_type !== "land" ? " *" : ""}</Label>
                      <Input
                        type="number"
                        step="0.5"
                        className="bg-input"
                        value={formData.bathrooms ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            bathrooms: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Land size (m²)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        className="bg-input"
                        value={formData.lot_size ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            lot_size: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Home / floor area (m²)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        className="bg-input"
                        value={formData.building_size ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            building_size: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Car spaces (total)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        className="bg-input"
                        value={formData.car_spaces ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            car_spaces: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Garages</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        className="bg-input"
                        value={formData.garages ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            garages: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Carports</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        className="bg-input"
                        value={formData.carports ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            carports: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Year built</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 2018"
                        className="bg-input"
                        value={formData.year_built ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            year_built: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                    </div>
                  </div>
                  </TabsContent>
                  <TabsContent value="photos" className="space-y-4 mt-4">
                    {editingProperty?.id ? (
                      <PropertyImagesGallery
                        propertyId={editingProperty.id}
                        images={
                          Array.isArray(editingPropertyLive?.images)
                            ? (editingPropertyLive.images as string[])
                            : Array.isArray(editingProperty.images)
                              ? (editingProperty.images as string[])
                              : []
                        }
                        compact
                      />
                    ) : (
                      <PropertyImagesPendingPicker
                        files={pendingImageFiles}
                        onFilesChange={setPendingImageFiles}
                      />
                    )}
                  </TabsContent>
                  <TabsContent value="owners" className="space-y-4 mt-4">
                    {!editingProperty ? (
                      <div className="space-y-2">
                        <Label>Property Owners</Label>
                        <Input
                          placeholder="Search contacts by name, email, or phone..."
                          className="bg-input"
                          value={ownerSearchQuery}
                          onChange={(e) => setOwnerSearchQuery(e.target.value)}
                        />
                        <div className="border border-border rounded-md p-3 bg-input min-h-[100px] max-h-[150px] overflow-y-auto">
                          {contacts && contacts.length > 0 ? (
                            <div className="flex flex-col gap-2">
                              {filteredOwners.map((contact) => (
                                <div key={contact.id} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`owner-${contact.id}`}
                                    checked={selectedOwnerIds.includes(contact.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedOwnerIds((prev) => [...prev, contact.id]);
                                      } else {
                                        setSelectedOwnerIds((prev) =>
                                          prev.filter((id) => id !== contact.id)
                                        );
                                      }
                                    }}
                                  />
                                  <Label
                                    htmlFor={`owner-${contact.id}`}
                                    className="text-sm font-normal cursor-pointer flex-1"
                                  >
                                    {getContactDisplayName(contact)}
                                  </Label>
                                </div>
                              ))}
                              {filteredOwners.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No contacts match your search.</p>
                              ) : null}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No contacts available. Create contacts first.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Property owners cannot be edited after creation.</p>
                    )}
                  </TabsContent>
                  <TabsContent value="notes" className="space-y-4 mt-4">
                    <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      placeholder="Property notes, features, condition, etc."
                      className="bg-input min-h-[100px]"
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
                  onClick={handleSaveProperty}
                  disabled={createProperty.isPending || updateProperty.isPending}
                >
                  {createProperty.isPending || updateProperty.isPending
                    ? "Saving..."
                    : editingProperty
                      ? "Update"
                      : "Add"}{" "}
                  Property
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      {/* Toolbar: total, search, view toggle, sort, per page */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-6 mb-4">
        <div className="flex items-center gap-4 min-w-0">
          <span className="font-semibold text-foreground truncate">My Properties</span>
          <span className="text-sm text-muted-foreground shrink-0">
            Total records {sorted.length}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          <div className="relative w-full sm:w-auto sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by address..."
              className="pl-10 bg-input h-11"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as PropertyViewMode)}
            className="border border-border rounded-md p-0.5 bg-input"
          >
            <ToggleGroupItem value="grid" aria-label="Grid view" className="gap-1.5 px-3">
              <LayoutGrid className="w-4 h-4" /> Grid
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view" className="gap-1.5 px-3">
              <List className="w-4 h-4" /> List
            </ToggleGroupItem>
          </ToggleGroup>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[160px] h-11 bg-input border-border">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="address">Address (A–Z)</SelectItem>
              <SelectItem value="price-asc">Price (low–high)</SelectItem>
              <SelectItem value="price-desc">Price (high–low)</SelectItem>
              <SelectItem value="newest">Newest first</SelectItem>
            </SelectContent>
          </Select>
          <Popover open={actionsPopoverOpen} onOpenChange={setActionsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-11 text-foreground border-border hover:bg-muted">
                Actions
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-1 bg-popover border-border text-foreground">
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
          <Select
            value={String(itemsPerPage)}
            onValueChange={(v) => {
              setItemsPerPage(Number(v));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[110px] h-11 bg-popover border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20 per page</SelectItem>
              <SelectItem value="25">25 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {selectedPropertyIds.size > 0 && (
        <div className="mb-4 p-3 zoho-card rounded-lg flex items-center justify-between">
          <span className="text-sm text-foreground">
            {selectedPropertyIds.size} propert{selectedPropertyIds.size !== 1 ? "ies" : "y"} selected
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedPropertyIds(new Set())}
            >
              Clear selection
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCSV(true)}
            >
              <Download className="w-4 h-4 mr-2" />
              Export selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              title={selectedPropertyIds.size < 2 ? "Select two or more properties" : "Merge into one property row"}
              onClick={() => {
                if (selectedPropertyIds.size < 2) {
                  toast({
                    title: "Select properties to merge",
                    description: "Choose at least two rows using the checkboxes, then click Merge.",
                  });
                  return;
                }
                setMergeDialogOpen(true);
              }}
            >
              <GitMerge className="w-4 h-4 opacity-70" />
              Merge
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Delete selected
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {selectedPropertyIds.size} propert{selectedPropertyIds.size !== 1 ? "ies" : "y"}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. The selected propert{selectedPropertyIds.size !== 1 ? "ies will" : "y will"} be permanently removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async () => {
                      try {
                        for (const id of selectedPropertyIds) {
                          await deleteProperty.mutateAsync(id);
                        }
                        toast({ title: "Deleted", description: `${selectedPropertyIds.size} propert${selectedPropertyIds.size !== 1 ? "ies" : "y"} removed` });
                        setSelectedPropertyIds(new Set());
                      } catch (e: unknown) {
                        toast({
                          title: "Error",
                          description: e instanceof Error ? e.message : "Failed to delete",
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
          </div>
        </div>
      )}
      <PropertyList
        properties={sorted}
        viewMode={viewMode}
        isLoading={isLoading}
        isError={isError}
        error={error instanceof Error ? error : null}
        onRetry={refetch}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        selectedPropertyIds={selectedPropertyIds}
        onToggleSelect={(p) => {
          setSelectedPropertyIds((prev) => {
            const next = new Set(prev);
            if (next.has(p.id)) next.delete(p.id);
            else next.add(p.id);
            return next;
          });
        }}
        onToggleSelectAll={(pageProperties) => {
          const pageIds = new Set(pageProperties.map((x) => x.id));
          const allSelected = pageIds.size > 0 && [...pageIds].every((id) => selectedPropertyIds.has(id));
          setSelectedPropertyIds((prev) => {
            const next = new Set(prev);
            if (allSelected) pageIds.forEach((id) => next.delete(id));
            else pageIds.forEach((id) => next.add(id));
            return next;
          });
        }}
        onSelectProperty={(p) => navigate(`/properties/${p.id}`)}
        onEditProperty={(p, e) => {
          e.stopPropagation();
          handleOpenDialog(p);
        }}
        onDeleteProperty={(p, e) => {
          e.stopPropagation();
          setPropertyToDelete(p);
        }}
        showEditButton
        showResultCount
        emptyMessage={
          !properties?.length
            ? "Add your first property using the Add Property button above, or import via Contacts."
            : "No properties match your search. Try clearing the search box."
        }
      />
      <AlertDialog open={!!propertyToDelete} onOpenChange={(open) => !open && setPropertyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {propertyToDelete ? formatPropertyAddress(propertyToDelete) : "this property"}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => propertyToDelete && handleDeleteProperty(propertyToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <MergePropertiesDialog
        open={mergeDialogOpen}
        onOpenChange={setMergeDialogOpen}
        properties={mergeDialogProperties}
        onMerged={(primaryId) => {
          setSelectedPropertyIds(new Set());
          navigate(`/properties/${primaryId}`);
        }}
      />
    </div>
  );
}
