import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Search, Plus, LayoutGrid, List } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
} from "@/components/ui/alert-dialog";
import { useProperties, useCreateProperty, useUpdateProperty, useDeleteProperty, formatPropertyAddress, type PropertyWithLinks } from "@/hooks/useProperties";
import { PropertyList } from "@/components/PropertyManagement/PropertyList";
import { useContacts } from "@/hooks/useContacts";
import { useCreateContactPropertyLink } from "@/hooks/useContactPropertyLinks";
import { useToast } from "@/hooks/use-toast";

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
  notes: "",
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
  
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyWithLinks | null>(null);
  const [formData, setFormData] = useState(createEmptyProperty());
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [propertyToDelete, setPropertyToDelete] = useState<PropertyWithLinks | null>(null);
  const [viewMode, setViewMode] = useState<PropertyViewMode>("list");
  const [sortBy, setSortBy] = useState<"address" | "price-asc" | "price-desc" | "newest">("address");
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const filtered = useMemo(() => {
    return (properties ?? []).filter((p) => {
      const addr = formatPropertyAddress(p).toLowerCase();
      const q = debouncedSearch.trim().toLowerCase();
      return !q || addr.includes(q);
    });
  }, [properties, debouncedSearch]);

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

  const handleOpenDialog = (property?: PropertyWithLinks) => {
    if (property) {
      setEditingProperty(property);
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
        notes: property.notes || "",
      });
      const ownerIds = (property.contact_property_links ?? [])
        .filter((l) => l.role === "owner" || !l.role)
        .map((l) => l.contact_id);
      setSelectedOwnerIds(ownerIds);
    } else {
      setEditingProperty(null);
      setFormData(createEmptyProperty());
      setSelectedOwnerIds([]);
    }
    setIsDialogOpen(true);
  };

  const handleSaveProperty = async () => {
    if (!formData.address_line1.trim()) {
      toast({
        title: "Error",
        description: "Please enter an address",
        variant: "destructive",
      });
      return;
    }
    const beds = formData.bedrooms;
    const baths = formData.bathrooms;
    const priceVal = formData.price;
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
      if (editingProperty) {
        const updated = await updateProperty.mutateAsync({
          id: editingProperty.id,
          address_line1: formData.address_line1 || null,
          address_line2: formData.address_line2 || null,
          city: formData.city || null,
          state: formData.state || null,
          postcode: formData.postcode || null,
          country: formData.country || null,
          property_type: formData.property_type || null,
          bedrooms: formData.bedrooms,
          bathrooms: formData.bathrooms,
          price: formData.price,
          notes: formData.notes || null,
        });
        propertyId = updated.id;
        toast({ title: "Success", description: "Property updated!" });
      } else {
        const created = await createProperty.mutateAsync({
          address_line1: formData.address_line1 || null,
          address_line2: formData.address_line2 || null,
          city: formData.city || null,
          state: formData.state || null,
          postcode: formData.postcode || null,
          country: formData.country || null,
          property_type: formData.property_type || "house", // schema requires NOT NULL
          bedrooms: formData.bedrooms,
          bathrooms: formData.bathrooms,
          price: formData.price,
          notes: formData.notes || null,
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

      setIsDialogOpen(false);
      setFormData(createEmptyProperty());
      setSelectedOwnerIds([]);
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
                setSelectedOwnerIds([]);
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
            <DialogContent className="sm:max-w-[600px] bg-card border-border max-h-[90vh] overflow-hidden flex flex-col text-foreground">
              <DialogHeader>
                <DialogTitle>
                  {editingProperty ? "Edit Property" : "Add New Property"}
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="flex-1 pr-4">
                <Tabs defaultValue="address" className="mt-4">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="address">Address</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="owners">Owners</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                  </TabsList>
                  <TabsContent value="address" className="space-y-4 mt-4">
                    <div className="space-y-2">
                    <Label>Address Line 1 *</Label>
                    <Input
                      placeholder="Street address"
                      className="bg-input"
                      value={formData.address_line1}
                      onChange={(e) =>
                        setFormData({ ...formData, address_line1: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Address Line 2</Label>
                    <Input
                      placeholder="Unit, apartment, etc."
                      className="bg-input"
                      value={formData.address_line2}
                      onChange={(e) =>
                        setFormData({ ...formData, address_line2: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        placeholder="City"
                        className="bg-input"
                        value={formData.city}
                        onChange={(e) =>
                          setFormData({ ...formData, city: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input
                        placeholder="State"
                        className="bg-input"
                        value={formData.state}
                        onChange={(e) =>
                          setFormData({ ...formData, state: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Postcode</Label>
                      <Input
                        placeholder="Postcode"
                        className="bg-input"
                        value={formData.postcode}
                        onChange={(e) =>
                          setFormData({ ...formData, postcode: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input
                        placeholder="Country"
                        className="bg-input"
                        value={formData.country}
                        onChange={(e) =>
                          setFormData({ ...formData, country: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  </TabsContent>
                  <TabsContent value="details" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Property Type</Label>
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
                      <Label>Price</Label>
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
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Bedrooms</Label>
                      <Input
                        type="number"
                        className="bg-input"
                        value={formData.bedrooms || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            bedrooms: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bathrooms</Label>
                      <Input
                        type="number"
                        step="0.5"
                        className="bg-input"
                        value={formData.bathrooms || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            bathrooms: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                    </div>
                  </div>
                  </TabsContent>
                  <TabsContent value="owners" className="space-y-4 mt-4">
                    {!editingProperty ? (
                      <div className="space-y-2">
                        <Label>Property Owners</Label>
                        <div className="border border-border rounded-md p-3 bg-input min-h-[100px] max-h-[150px] overflow-y-auto">
                          {contacts && contacts.length > 0 ? (
                            <div className="flex flex-col gap-2">
                              {contacts.map((contact) => (
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
                                    {contact.name}
                                  </Label>
                                </div>
                              ))}
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
    </div>
  );
}
