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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, ChevronRight, Building2, User, Search, Plus, Pencil } from "lucide-react";
import { useProperties, formatPropertyAddress, useCreateProperty, useUpdateProperty, type PropertyWithLinks } from "@/hooks/useProperties";
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
  const { data: properties, isLoading, isError, refetch } = useProperties();
  const { data: contacts = [] } = useContacts();
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const createLink = useCreateContactPropertyLink();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyWithLinks | null>(null);
  const [formData, setFormData] = useState(createEmptyProperty());
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const filtered = useMemo(() => {
    return (properties ?? []).filter((p) => {
      const addr = formatPropertyAddress(p).toLowerCase();
      const q = searchQuery.trim().toLowerCase();
      return !q || addr.includes(q);
    });
  }, [properties, searchQuery]);

  // Pagination
  const paginatedProperties = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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
          property_type: formData.property_type || null,
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
    return (
      <div className="animate-fade-in">
        <PageHeader title="Properties" description="Properties and linked owners" />
        <div className="text-center py-12 text-white/60 mt-6">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium text-white mb-2">Couldn&apos;t load properties</p>
          <p className="text-sm mb-4">Check your connection and migrations, then retry.</p>
          <Button onClick={() => refetch()} variant="outline">
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
            <DialogContent className="sm:max-w-[600px] bg-[#242424] border-white/10 max-h-[90vh] overflow-hidden flex flex-col text-white">
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
                        <div className="border border-white/10 rounded-md p-3 bg-input min-h-[100px] max-h-[150px] overflow-y-auto">
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
                            <p className="text-sm text-white/60">
                              No contacts available. Create contacts first.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-white/60">Property owners cannot be edited after creation.</p>
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
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/10">
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
      <div className="relative mt-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
        <Input
          placeholder="Search by address..."
          className="pl-10 bg-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-white/60 mt-6 rounded-lg border border-white/10 bg-[#242424]/50 p-8">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-70 text-white/60" />
          <p className="text-white/80 font-medium mb-1">No properties to show</p>
          <p className="text-sm">
            {!properties?.length
              ? "Add your first property using the Add Property button above, or import via Contacts."
              : "No properties match your search. Try clearing the search box."}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3 mt-6">
            {paginatedProperties.map((p) => (
            <PropertyRow
              key={p.id}
              property={p}
              onSelect={() => navigate(`/properties/${p.id}`)}
              onEdit={(e) => {
                e.stopPropagation();
                handleOpenDialog(p);
              }}
            />
            ))}
          </div>
          {totalPages > 1 && (
            <Pagination className="mt-6">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  return null;
                })}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}

function PropertyRow({
  property,
  onSelect,
  onEdit,
}: {
  property: PropertyWithLinks;
  onSelect: () => void;
  onEdit: (e: React.MouseEvent) => void;
}) {
  const addr = formatPropertyAddress(property);
  const owners = (property.contact_property_links ?? [])
    .filter((l) => l.role === "owner" || !l.role)
    .map((l) => l.contacts?.name ?? "Unknown")
    .filter(Boolean);

  return (
    <div
      className="flex flex-wrap items-center gap-4 p-4 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer zoho-card"
      onClick={onSelect}
    >
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
        <MapPin className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white">{addr || "—"}</p>
        {owners.length > 0 && (
          <p className="text-sm text-white/60 mt-0.5 flex items-center gap-1">
            <User className="w-3 h-3" />
            {owners.join(", ")}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onEdit}
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <ChevronRight className="w-5 h-5 text-white/50" />
      </div>
    </div>
  );
}
