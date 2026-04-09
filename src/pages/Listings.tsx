import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Plus, MapPin, Bed, Bath, Trash2, Pencil, Building2, User, Phone, Mail, Calendar, CheckSquare, Square, ChevronRight, LayoutList, LayoutGrid, Download } from "lucide-react";
import { formatPhoneDisplay } from "@/lib/formatPhone";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useListings, useCreateListing, useUpdateListing, useDeleteListing, Listing } from "@/hooks/useListings";
import { useContacts } from "@/hooks/useContacts";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  LEAD_TEMPERATURES,
  TIMEFRAME_CATEGORIES,
  ROLE_CATEGORIES,
  LEAD_TEMPERATURE_LABELS,
  TIMEFRAME_LABELS,
  ROLE_CATEGORY_LABELS,
} from "@/lib/leadCategories";

type ListingStatus = "active" | "pending" | "sold" | "withdrawn";
type PropertyType = "house" | "apartment" | "townhouse" | "land";

const createEmptyListing = () => ({
  address: "",
  price: 0,
  bedrooms: 0,
  bathrooms: 0,
  property_type: "house" as PropertyType,
  status: "active" as ListingStatus,
  notes: "",
  contact_id: "",
  // Additional fields stored in notes or as separate fields
  listing_description: "",
  key_features: "",
  open_house_dates: "",
  reserve_price: 0,
  commission_rate: 0,
  marketing_budget: 0,
  listing_date: "",
  expected_sale_date: "",
  settlement_date: "",
  agent_notes: "",
  vendor_requirements: "",
  special_conditions: "",
});

export type ListingsProps = {
  /** When true, omit the page header — the host route (e.g. listings hub) supplies title and primary actions. */
  embedded?: boolean;
};

export default function Listings({ embedded = false }: ListingsProps) {
  const { data: listings, isLoading } = useListings();
  const { data: contacts = [] } = useContacts();
  const createListing = useCreateListing();
  const updateListing = useUpdateListing();
  const deleteListing = useDeleteListing();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [formData, setFormData] = useState(createEmptyListing());
  const [selectedContact, setSelectedContact] = useState<typeof contacts[0] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [listView, setListView] = useState<"list" | "grid">("list");
  const [selectedListingIds, setSelectedListingIds] = useState<Set<string>>(new Set());
  const [actionsPopoverOpen, setActionsPopoverOpen] = useState(false);
  const [filterLeadTemperature, setFilterLeadTemperature] = useState("all");
  const [filterTimeframeCategory, setFilterTimeframeCategory] = useState("all");
  const [filterRoleCategory, setFilterRoleCategory] = useState("all");
  const { toast } = useToast();

  // Update selected contact when contact_id changes
  useEffect(() => {
    if (formData.contact_id) {
      const contact = contacts.find(c => c.id === formData.contact_id);
      setSelectedContact(contact || null);
    } else {
      setSelectedContact(null);
    }
  }, [formData.contact_id, contacts]);

  const handleOpenDialog = (listing?: Listing) => {
    if (listing) {
      setEditingListing(listing);
      setFormData({
        ...createEmptyListing(),
        address: listing.address,
        price: Number(listing.price) || 0,
        bedrooms: listing.bedrooms || 0,
        bathrooms: Number(listing.bathrooms) || 0,
        property_type: (listing.property_type as PropertyType) || "house",
        status: (listing.status as ListingStatus) || "active",
        notes: listing.notes || "",
        contact_id: (listing as any).contact_id || "",
      });
    } else {
      setEditingListing(null);
      setFormData(createEmptyListing());
    }
    setIsDialogOpen(true);
  };

  const handleSaveListing = async () => {
    if (!formData.address.trim()) {
      toast({ title: "Error", description: "Please enter an address", variant: "destructive" });
      return;
    }

    try {
      // Combine all additional fields into notes for now (or extend schema later)
      const combinedNotes = [
        formData.notes,
        formData.listing_description && `Description: ${formData.listing_description}`,
        formData.key_features && `Features: ${formData.key_features}`,
        formData.open_house_dates && `Open House: ${formData.open_house_dates}`,
        formData.agent_notes && `Agent Notes: ${formData.agent_notes}`,
        formData.vendor_requirements && `Vendor Requirements: ${formData.vendor_requirements}`,
        formData.special_conditions && `Special Conditions: ${formData.special_conditions}`,
        formData.reserve_price > 0 && `Reserve: $${formData.reserve_price.toLocaleString()}`,
        formData.commission_rate > 0 && `Commission: ${formData.commission_rate}%`,
        formData.marketing_budget > 0 && `Marketing Budget: $${formData.marketing_budget.toLocaleString()}`,
        formData.listing_date && `Listed: ${formData.listing_date}`,
        formData.expected_sale_date && `Expected Sale: ${formData.expected_sale_date}`,
        formData.settlement_date && `Settlement: ${formData.settlement_date}`,
      ]
        .filter(Boolean)
        .join("\n\n");

      const listingData = {
        address: formData.address,
        price: formData.price,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        property_type: formData.property_type,
        status: formData.status,
        notes: combinedNotes || null,
        contact_id: formData.contact_id || null,
      };

      if (editingListing) {
        await updateListing.mutateAsync({
          id: editingListing.id,
          ...listingData,
        });
        toast({ title: "Success", description: "Listing updated!" });
      } else {
        await createListing.mutateAsync(listingData);
        toast({ title: "Success", description: "Listing added!" });
      }
      setIsDialogOpen(false);
      setFormData(createEmptyListing());
      setEditingListing(null);
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save listing", 
        variant: "destructive" 
      });
    }
  };

  const handleDeleteListing = async (id: string) => {
    try {
      await deleteListing.mutateAsync(id);
      toast({ title: "Deleted", description: "Listing removed" });
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete listing", 
        variant: "destructive" 
      });
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "$0";
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(price);
  };

  const getStatusVariant = (status: string | null) => {
    switch (status) {
      case "active": return "active";
      case "pending": return "warm";
      case "sold": return "completed";
      case "withdrawn": return "cancelled";
      default: return "default";
    }
  };

  const getContactForListing = (listing: Listing) => {
    const contactId = (listing as any).contact_id;
    if (!contactId) return null;
    return contacts.find(c => c.id === contactId);
  };

  const filteredListings = useMemo(() => {
    let list = [...(listings ?? [])];
    if (filterLeadTemperature !== "all") {
      list = list.filter((l) => (l.lead_temperature ?? "") === filterLeadTemperature);
    }
    if (filterTimeframeCategory !== "all") {
      list = list.filter((l) => (l.timeframe_category ?? "") === filterTimeframeCategory);
    }
    if (filterRoleCategory !== "all") {
      list = list.filter((l) => (l.role_category ?? "") === filterRoleCategory);
    }
    return list;
  }, [listings, filterLeadTemperature, filterTimeframeCategory, filterRoleCategory]);

  const handleExportCSV = (selectedOnly?: boolean) => {
    const list = selectedOnly && selectedListingIds.size > 0
      ? filteredListings.filter((l) => selectedListingIds.has(l.id))
      : filteredListings;
    if (list.length === 0) {
      toast({ title: "No data", description: "No listings to export", variant: "destructive" });
      return;
    }
    const headers = ["Address", "Type", "Status", "Price", "Bedrooms", "Bathrooms", "Contact", "Listed"];
    const rows = list.map((l) => {
      const owner = getContactForListing(l);
      return [
        l.address ?? "",
        l.property_type ?? "",
        l.status ?? "",
        String(l.price ?? ""),
        String(l.bedrooms ?? ""),
        String(l.bathrooms ?? ""),
        owner?.name ?? "",
        l.created_at ? format(new Date(l.created_at), "yyyy-MM-dd") : "",
      ];
    });
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `listings-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${list.length} listings exported to CSV` });
  };

  const listActionButtons = (listing: Listing) => (
    <div className="flex gap-0.5 items-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto" onClick={(e) => e.stopPropagation()}>
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={(e) => { e.stopPropagation(); handleOpenDialog(listing); }}>
        <Pencil className="w-4 h-4" />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0">
            <Trash2 className="w-4 h-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Listing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this listing? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteListing(listing.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </div>
  );

  function renderListingListRow(listing: Listing) {
    const owner = getContactForListing(listing);
    return (
      <>
        <td className="w-10 py-2 px-2 md:px-3 align-middle" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedListingIds((prev) => {
              const next = new Set(prev);
              if (next.has(listing.id)) next.delete(listing.id);
              else next.add(listing.id);
              return next;
            })}
            aria-label={selectedListingIds.has(listing.id) ? "Deselect" : "Select"}
          >
            {selectedListingIds.has(listing.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </Button>
        </td>
        <td className="py-2 px-3 md:py-2 md:px-4 align-middle">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-foreground text-sm truncate block" title={listing.address ?? ""}>{listing.address ?? "—"}</span>
          </div>
        </td>
        <td className="py-2 px-3 md:py-2 md:px-4 align-middle">
          {listing.property_type ? (
            <Badge variant="secondary" className="text-xs capitalize">{listing.property_type}</Badge>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          )}
        </td>
        <td className="py-2 px-3 md:py-2 md:px-4 align-middle">
          <StatusBadge variant={getStatusVariant(listing.status)} className="text-xs w-fit">{listing.status ?? "active"}</StatusBadge>
        </td>
        <td className="py-2 px-3 md:py-2 md:px-4 align-middle text-foreground font-medium whitespace-nowrap">
          {formatPrice(Number(listing.price))}
        </td>
        <td className="py-2 px-3 md:py-2 md:px-4 align-middle text-muted-foreground text-sm">
          {listing.bedrooms != null ? listing.bedrooms : "—"}
        </td>
        <td className="py-2 px-3 md:py-2 md:px-4 align-middle text-muted-foreground text-sm">
          {listing.bathrooms != null ? listing.bathrooms : "—"}
        </td>
        <td className="py-2 px-3 md:py-2 md:px-4 align-middle text-muted-foreground text-sm truncate max-w-[140px]" title={owner?.name ?? ""}>
          <span className="truncate block">{owner?.name ?? "—"}</span>
        </td>
        <td className="py-2 px-3 md:py-2 md:px-4 align-middle text-muted-foreground text-sm">
          {listing.created_at ? format(new Date(listing.created_at), "MMM d, yyyy") : "—"}
        </td>
        <td className="py-2 px-3 md:py-2 md:px-4 align-middle w-[1%] whitespace-nowrap">
          {listActionButtons(listing)}
        </td>
      </>
    );
  }

  // Pagination
  const paginatedListings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredListings.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredListings, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredListings.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterLeadTemperature, filterTimeframeCategory, filterRoleCategory]);

  if (isLoading) {
    return (
      <div className={cn("animate-fade-in", embedded && "pt-0")}>
        {!embedded && (
          <PageHeader title="Listings & Deals" description="Manage your property listings and link property owners" />
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("animate-fade-in", embedded && "pt-0")}>
      {!embedded && (
      <PageHeader
        title="Listings & Deals"
        description="Manage your property listings and link property owners"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (open) {
              handleOpenDialog();
            } else {
              setFormData(createEmptyListing());
              setEditingListing(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Listing
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-popover border-border max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>{editingListing ? "Edit Listing" : "Add New Listing"}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="flex-1 pr-4">
                <Tabs defaultValue="basic" className="mt-4">
                  <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="basic">Basic</TabsTrigger>
                    <TabsTrigger value="property">Property</TabsTrigger>
                    <TabsTrigger value="marketing">Marketing</TabsTrigger>
                    <TabsTrigger value="financial">Financial</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                  </TabsList>
                  <TabsContent value="basic" className="space-y-4 mt-4">
                    {/* Property Owner Section */}
                    <div className="space-y-2 p-4 bg-secondary rounded-lg">
                  <Label className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Property Owner
                  </Label>
                  <Select
                    value={formData.contact_id}
                    onValueChange={(value) => setFormData({ ...formData, contact_id: value })}
                  >
                    <SelectTrigger className="bg-input">
                      <SelectValue placeholder="Select property owner (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name} {contact.email ? `(${contact.email})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedContact && (
                    <div className="mt-2 p-3 zoho-card rounded border border-white/10">
                      <p className="text-sm font-medium text-white">{selectedContact.name}</p>
                      {selectedContact.phone && (
                        <p className="text-xs text-white/60 flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3" /> {formatPhoneDisplay(selectedContact.phone)}
                        </p>
                      )}
                      {selectedContact.email && (
                        <p className="text-xs text-white/60 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {selectedContact.email}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Address *</Label>
                  <Input
                    placeholder="Street address"
                    className="bg-input"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Price</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      className="bg-input"
                      value={formData.price || ""}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Property Type</Label>
                    <Select
                      value={formData.property_type}
                      onValueChange={(value: PropertyType) => setFormData({ ...formData, property_type: value })}
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bedrooms</Label>
                    <Input
                      type="number"
                      className="bg-input"
                      value={formData.bedrooms || ""}
                      onChange={(e) => setFormData({ ...formData, bedrooms: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bathrooms</Label>
                    <Input
                      type="number"
                      step="0.5"
                      className="bg-input"
                      value={formData.bathrooms || ""}
                      onChange={(e) => setFormData({ ...formData, bathrooms: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: ListingStatus) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="bg-input">
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
                  </TabsContent>
                  <TabsContent value="property" className="space-y-4 mt-4">
                    {/* Property Details Section */}
                    <div className="space-y-2">
                    <Label className="text-base font-semibold">Property Details</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Land Size (sqm)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          className="bg-input"
                          onChange={(e) => {
                            // Store in notes for now, or extend schema later
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Building Size (sqm)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          className="bg-input"
                          onChange={(e) => {
                            // Store in notes for now
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Year Built</Label>
                        <Input
                          type="number"
                          placeholder="YYYY"
                          className="bg-input"
                          onChange={(e) => {
                            // Store in notes
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Condition</Label>
                        <Select>
                          <SelectTrigger className="bg-input">
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="excellent">Excellent</SelectItem>
                            <SelectItem value="good">Good</SelectItem>
                            <SelectItem value="fair">Fair</SelectItem>
                            <SelectItem value="needs-work">Needs Work</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  </TabsContent>
                  <TabsContent value="marketing" className="space-y-4 mt-4">
                    {/* Marketing Section */}
                    <div className="space-y-2">
                    <Label className="text-base font-semibold">Marketing</Label>
                    <div className="space-y-2">
                      <Label>Listing Description</Label>
                      <Textarea
                        placeholder="Detailed property description for marketing..."
                        className="bg-input min-h-[100px]"
                        value={formData.listing_description}
                        onChange={(e) =>
                          setFormData({ ...formData, listing_description: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Key Features</Label>
                      <Textarea
                        placeholder="Pool, garage, views, etc. (one per line)"
                        className="bg-input min-h-[80px]"
                        value={formData.key_features}
                        onChange={(e) =>
                          setFormData({ ...formData, key_features: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Open House Dates/Times</Label>
                      <Textarea
                        placeholder="e.g., Sat 2pm-4pm, Sun 11am-1pm"
                        className="bg-input min-h-[60px]"
                        value={formData.open_house_dates}
                        onChange={(e) =>
                          setFormData({ ...formData, open_house_dates: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  </TabsContent>
                  <TabsContent value="financial" className="space-y-4 mt-4">
                    {/* Financial Section */}
                    <div className="space-y-2">
                    <Label className="text-base font-semibold">Financial</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Reserve Price</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          className="bg-input"
                          value={formData.reserve_price || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              reserve_price: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Commission Rate (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="0"
                          className="bg-input"
                          value={formData.commission_rate || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              commission_rate: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Marketing Budget</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        className="bg-input"
                        value={formData.marketing_budget || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            marketing_budget: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>
                  </TabsContent>
                  <TabsContent value="timeline" className="space-y-4 mt-4">
                    {/* Timeline Section */}
                    <div className="space-y-2">
                    <Label className="text-base font-semibold">Timeline</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Listing Date</Label>
                        <Input
                          type="date"
                          className="bg-input"
                          value={formData.listing_date}
                          onChange={(e) =>
                            setFormData({ ...formData, listing_date: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Expected Sale Date</Label>
                        <Input
                          type="date"
                          className="bg-input"
                          value={formData.expected_sale_date}
                          onChange={(e) =>
                            setFormData({ ...formData, expected_sale_date: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Settlement Date</Label>
                        <Input
                          type="date"
                          className="bg-input"
                          value={formData.settlement_date}
                          onChange={(e) =>
                            setFormData({ ...formData, settlement_date: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  </TabsContent>
                  <TabsContent value="notes" className="space-y-4 mt-4">
                    {/* Notes Section */}
                    <div className="space-y-2">
                    <Label className="text-base font-semibold">Additional Notes</Label>
                    <div className="space-y-2">
                      <Label>Agent Notes</Label>
                      <Textarea
                        placeholder="Internal notes, observations, etc."
                        className="bg-input min-h-[80px]"
                        value={formData.agent_notes}
                        onChange={(e) =>
                          setFormData({ ...formData, agent_notes: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Vendor Requirements</Label>
                      <Textarea
                        placeholder="What the vendor needs, preferences, etc."
                        className="bg-input min-h-[80px]"
                        value={formData.vendor_requirements}
                        onChange={(e) =>
                          setFormData({ ...formData, vendor_requirements: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Special Conditions</Label>
                      <Textarea
                        placeholder="Any special conditions or requirements"
                        className="bg-input min-h-[80px]"
                        value={formData.special_conditions}
                        onChange={(e) =>
                          setFormData({ ...formData, special_conditions: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>General Notes</Label>
                      <Textarea
                        placeholder="Additional notes..."
                        className="bg-input min-h-[80px]"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>
                  </div>
                  </TabsContent>
                </Tabs>
              </ScrollArea>
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/10">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button 
                  onClick={handleSaveListing}
                  disabled={createListing.isPending || updateListing.isPending}
                >
                  {(createListing.isPending || updateListing.isPending) ? "Saving..." : editingListing ? "Update" : "Add"} Listing
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      )}

      {/* Listings: same paginated table layout as Contacts */}
      {listings && listings.length > 0 ? (
        <>
          <div className="flex-1 min-w-0">
            {/* Toolbar: title, total, view toggle, Add Listing, Actions, per page — same as Contacts */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider shrink-0">
                Classification
              </span>
              <Select value={filterLeadTemperature} onValueChange={setFilterLeadTemperature}>
                <SelectTrigger className="w-[140px] sm:w-[160px] bg-input border-border h-9">
                  <SelectValue placeholder="Temperature" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All temps</SelectItem>
                  {LEAD_TEMPERATURES.map((t) => (
                    <SelectItem key={t} value={t}>{LEAD_TEMPERATURE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterTimeframeCategory} onValueChange={setFilterTimeframeCategory}>
                <SelectTrigger className="w-[140px] sm:w-[180px] bg-input border-border h-9">
                  <SelectValue placeholder="Timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All timeframes</SelectItem>
                  {TIMEFRAME_CATEGORIES.map((t) => (
                    <SelectItem key={t} value={t}>{TIMEFRAME_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterRoleCategory} onValueChange={setFilterRoleCategory}>
                <SelectTrigger className="w-[160px] sm:min-w-[200px] bg-input border-border h-9 max-w-[min(100%,280px)]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent className="max-h-[min(280px,50vh)]">
                  <SelectItem value="all">All roles</SelectItem>
                  {ROLE_CATEGORIES.map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_CATEGORY_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(filterLeadTemperature !== "all" || filterTimeframeCategory !== "all" || filterRoleCategory !== "all") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 text-muted-foreground"
                  onClick={() => {
                    setFilterLeadTemperature("all");
                    setFilterTimeframeCategory("all");
                    setFilterRoleCategory("all");
                  }}
                >
                  Clear classification filters
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4 min-w-0">
                <span className="font-semibold text-foreground truncate">My Properties</span>
                <span className="text-sm text-muted-foreground shrink-0">
                  Showing {filteredListings.length} of {listings.length}
                </span>
                <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
                  <button
                    type="button"
                    aria-label="List view"
                    onClick={() => setListView("list")}
                    className={cn("rounded-md px-3 py-1.5", listView === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                  >
                    <LayoutList className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Grid view"
                    onClick={() => setListView("grid")}
                    className={cn("rounded-md px-3 py-1.5", listView === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4" />
                  Add Listing
                </Button>
                <Popover open={actionsPopoverOpen} onOpenChange={setActionsPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="text-foreground border-border hover:bg-muted">
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
                <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[100px] bg-popover border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bulk Actions — same card style as Contacts */}
            {selectedListingIds.size > 0 && (
              <div className="mb-4 p-3 zoho-card rounded-lg flex items-center justify-between">
                <span className="text-sm text-foreground">
                  {selectedListingIds.size} listing{selectedListingIds.size !== 1 ? "s" : ""} selected
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { handleExportCSV(true); setSelectedListingIds(new Set()); }}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedListingIds(new Set())}>
                    Clear
                  </Button>
                </div>
              </div>
            )}

            <p className="text-sm text-muted-foreground mb-4">
              Showing {(currentPage - 1) * itemsPerPage + 1}–
              {Math.min(currentPage * itemsPerPage, listings.length)} of {listings.length} listings
            </p>

          {listView === "list" ? (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <th className="w-10 py-2.5 px-2 md:px-3 font-medium align-middle">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            const pageIds = new Set(paginatedListings.map((l) => l.id));
                            const allOnPageSelected = pageIds.size > 0 && [...pageIds].every((id) => selectedListingIds.has(id));
                            setSelectedListingIds((prev) => {
                              const next = new Set(prev);
                              if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
                              else pageIds.forEach((id) => next.add(id));
                              return next;
                            });
                          }}
                          aria-label={paginatedListings.every((l) => selectedListingIds.has(l.id)) ? "Deselect all on page" : "Select all on page"}
                        >
                          {paginatedListings.length > 0 && paginatedListings.every((l) => selectedListingIds.has(l.id)) ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </Button>
                      </th>
                      <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium">Address</th>
                      <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium w-[100px]">Type</th>
                      <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium w-[90px]">Status</th>
                      <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium">Price</th>
                      <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium w-[60px]">Beds</th>
                      <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium w-[60px]">Baths</th>
                      <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium">Contact</th>
                      <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium">Listed</th>
                      <th className="w-[1%] py-2.5 px-3 md:py-2 md:px-4" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedListings.map((listing) => (
                      <tr
                        key={listing.id}
                        className="group border-b border-border/60 last:border-b-0 hover:bg-muted/40 transition-colors cursor-pointer"
                        onClick={() => handleOpenDialog(listing)}
                      >
                        {renderListingListRow(listing)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedListings.map((listing) => {
                const owner = getContactForListing(listing);
                return (
                  <Card key={listing.id} className="zoho-card p-0 overflow-hidden hover:shadow-md transition-shadow border border-border group cursor-pointer" onClick={() => handleOpenDialog(listing)}>
                    <div className="w-full h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Building2 className="w-16 h-16 text-primary/40" />
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {listing.property_type && (
                              <Badge variant="secondary" className="text-xs capitalize">{listing.property_type}</Badge>
                            )}
                            <StatusBadge variant={getStatusVariant(listing.status)} className="text-xs">{listing.status || "active"}</StatusBadge>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono mb-1">ID: {listing.id.slice(0, 8)}</p>
                        </div>
                        <div className="flex gap-0.5 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {listActionButtons(listing)}
                        </div>
                      </div>
                      <h3 className="font-semibold text-foreground mb-2 line-clamp-2">{listing.address}</h3>
                      <p className="text-2xl font-bold text-primary mb-3">{formatPrice(Number(listing.price))}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        {listing.bedrooms != null && <span className="flex items-center gap-1.5"><Bed className="w-4 h-4" />{listing.bedrooms}</span>}
                        {listing.bathrooms != null && <span className="flex items-center gap-1.5"><Bath className="w-4 h-4" />{listing.bathrooms}</span>}
                      </div>
                      {listing.created_at && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                          <Calendar className="w-3 h-3" /> Listed: {format(new Date(listing.created_at), "MMM d, yyyy")}
                        </div>
                      )}
                      {owner && (
                        <div className="pt-3 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-1">Property Owner</p>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium text-foreground">{owner.name}</span>
                          </div>
                          {owner.phone && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Phone className="w-3 h-3" /> {formatPhoneDisplay(owner.phone)}</p>}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {totalPages > 1 && listView === "list" && (
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
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-white/60">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No listings yet. Add your first property listing!</p>
        </div>
      )}
    </div>
  );
}
