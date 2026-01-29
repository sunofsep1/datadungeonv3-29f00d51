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
import { MapPin, User, ArrowLeft, Building2, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useProperty, formatPropertyAddress } from "@/hooks/useProperties";
import { useContacts } from "@/hooks/useContacts";
import {
  useCreateContactPropertyLink,
  useDeleteContactPropertyLink,
} from "@/hooks/useContactPropertyLinks";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const LINK_ROLES = ["owner", "buyer", "tenant", "interested", "other"] as const;

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: property, isLoading, isError, refetch } = useProperty(id);
  const { data: contacts = [] } = useContacts();
  const createLink = useCreateContactPropertyLink();
  const deleteLink = useDeleteContactPropertyLink();

  const [addOwnerOpen, setAddOwnerOpen] = useState(false);
  const [addOwnerContactId, setAddOwnerContactId] = useState<string>("");
  const [addOwnerRole, setAddOwnerRole] = useState<string>("owner");
  const [addOwnerNotes, setAddOwnerNotes] = useState("");

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
  const links = property.contact_property_links ?? [];
  const linkedContactIds = useMemo(
    () => new Set(links.map((l) => l.contact_id)),
    [links]
  );
  const availableContacts = useMemo(
    () => (contacts as { id: string; name: string }[]).filter((c) => !linkedContactIds.has(c.id)),
    [contacts, linkedContactIds]
  );

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
        role: addOwnerRole as "owner" | "buyer" | "tenant" | "interested" | "other",
        notes: addOwnerNotes.trim() || null,
      });
      toast({ title: "Success", description: "Owner linked." });
      setAddOwnerOpen(false);
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to link owner",
        variant: "destructive",
      });
    }
  };

  const handleRemoveLink = async (
    linkId: string,
    propertyId: string,
    contactId: string
  ) => {
    try {
      await deleteLink.mutateAsync({ id: linkId, property_id: propertyId, contact_id: contactId });
      toast({ title: "Removed", description: "Owner unlinked." });
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to unlink",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/properties")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Property
          </h1>
          <p className="text-white/60">Details and linked owners</p>
        </div>
      </div>

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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
          {property.price != null && property.price > 0 && (
            <div>
              <span className="text-white/60">Price</span>
              <p className="font-medium">
                ${Number(property.price).toLocaleString()}
              </p>
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

      <Card className="zoho-card p-6 border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <User className="w-4 h-4" />
            Linked owners
          </h3>
          <Button size="sm" onClick={handleOpenAddOwner} className="gap-1">
            <Plus className="w-4 h-4" /> Add owner
          </Button>
        </div>
        {links.length === 0 ? (
          <p className="text-white/60 text-sm">No linked contacts yet. Add owners to link contacts to this property.</p>
        ) : (
          <ul className="space-y-2">
            {links.map((l) => (
              <li
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-secondary/50"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/contacts/${l.contact_id}`);
                    }}
                    className="font-medium text-foreground hover:underline text-left"
                  >
                    {l.contacts?.name ?? "Unknown"}
                  </button>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {l.role || "owner"}
                  </Badge>
                </div>
                {l.notes && (
                  <p className="text-sm text-white/60 w-full mt-1">{l.notes}</p>
                )}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/contacts/${l.contact_id}`);
                    }}
                  >
                    View contact
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveLink(l.id, property.id, l.contact_id);
                    }}
                    disabled={deleteLink.isPending}
                    title="Unlink owner"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog open={addOwnerOpen} onOpenChange={setAddOwnerOpen}>
        <DialogContent className="sm:max-w-[420px] bg-[#242424] border-white/10">
          <DialogHeader>
            <DialogTitle>Link owner to property</DialogTitle>
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
              {createLink.isPending ? "Linking..." : "Add owner"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
