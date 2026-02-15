import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
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
import { ArrowLeft, Home, Pencil, Calendar, Tag, User } from "lucide-react";
import { format } from "date-fns";
import { useListing, useUpdateListing, type Listing } from "@/hooks/useListings";
import { useContact } from "@/hooks/useContact";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { useToast } from "@/hooks/use-toast";

type ListingStatus = "active" | "pending" | "sold" | "withdrawn";

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: listing, isLoading, isError, refetch } = useListing(id);
  const { data: linkedContact } = useContact((listing as Listing & { contact_id?: string | null })?.contact_id ?? undefined);
  const updateListing = useUpdateListing();
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ address: "", price: null as number | null, bedrooms: null as number | null, bathrooms: null as number | null, status: "active" as ListingStatus, notes: "" });

  const listingWithContact = listing as (Listing & { contact_id?: string | null }) | null;
  const contactId = listingWithContact?.contact_id;

  const openEdit = () => {
    if (!listing) return;
    setEditForm({
      address: listing.address || "",
      price: listing.price != null ? Number(listing.price) : null,
      bedrooms: listing.bedrooms ?? null,
      bathrooms: listing.bathrooms != null ? Number(listing.bathrooms) : null,
      status: (listing.status as ListingStatus) || "active",
      notes: listing.notes || "",
    });
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
      });
      toast({ title: "Success", description: "Listing updated" });
      setEditOpen(false);
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

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <Skeleton className="h-10 w-48 mb-4" />
        <Skeleton className="h-48 w-full mb-6" />
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

  return (
    <div className="animate-fade-in">
      <PageBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Listings", href: "/dashboard" },
          { label: listing.address || "Listing" },
        ]}
        className="mb-4"
      />
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2 truncate">
            <Home className="w-6 h-6 shrink-0" />
            {listing.address || "Listing"}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {listing.pipeline_stage ? String(listing.pipeline_stage).replace(/-/g, " ") : "—"} · Updated {listing.updated_at ? format(new Date(listing.updated_at), "PP") : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={openEdit} className="gap-2">
            <Pencil className="w-4 h-4" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/calendar")} className="gap-2">
            <Calendar className="w-4 h-4" />
            Schedule showing
          </Button>
          {(listing.status === "active" || listing.status === "pending") && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleStatusChange("sold")} className="gap-2">
                <Tag className="w-4 h-4" />
                Mark as sold
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleStatusChange("withdrawn")}>
                Off-market
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Hero placeholder (no images in schema) */}
      <Card className="zoho-card mb-6 border-border overflow-hidden">
        <div className="aspect-video bg-muted/30 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Home className="w-16 h-16 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No images</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="zoho-card p-6 border-border lg:col-span-2">
          <h3 className="text-sm font-medium text-foreground/90 mb-4">Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {listing.price != null && (
              <div>
                <span className="text-muted-foreground">Price</span>
                <p className="font-medium">${Number(listing.price).toLocaleString()}</p>
              </div>
            )}
            {listing.property_type && (
              <div>
                <span className="text-muted-foreground">Type</span>
                <p className="font-medium capitalize">{listing.property_type}</p>
              </div>
            )}
            {listing.bedrooms != null && (
              <div>
                <span className="text-muted-foreground">Bedrooms</span>
                <p className="font-medium">{listing.bedrooms}</p>
              </div>
            )}
            {listing.bathrooms != null && (
              <div>
                <span className="text-muted-foreground">Bathrooms</span>
                <p className="font-medium">{listing.bathrooms}</p>
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
          </div>
        </Card>

        <Card className="zoho-card p-6 border-border">
          <h3 className="text-sm font-medium text-foreground/90 mb-4 flex items-center gap-2">
            <User className="w-4 h-4" />
            Linked contact
          </h3>
          {contactId && linkedContact ? (
            <div>
              <p className="font-medium text-foreground">{linkedContact.name}</p>
              {(linkedContact.email || (linkedContact as { phone?: string }).phone) && (
                <p className="text-sm text-muted-foreground mt-1">
                  {linkedContact.email ?? (linkedContact as { phone?: string }).phone}
                </p>
              )}
              <Button variant="ghost" size="sm" className="mt-2 px-0" onClick={() => navigate(`/contacts/${contactId}`)}>
                View contact →
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
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>Edit listing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
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
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={updateListing.isPending}>
                {updateListing.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
