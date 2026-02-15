import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, GripVertical, Home, DollarSign, User, Clock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useListings, useCreateListing, useUpdateListing, Listing, ListingWithContact } from "@/hooks/useListings";
import { useContacts } from "@/hooks/useContacts";
import { useLogListingStageMove } from "@/hooks/useEvents";
import { differenceInDays, format } from "date-fns";
import { cn } from "@/lib/utils";

// Lifecycle: Appraisal → Listing → Under Contract → Settled → Past Client
const PIPELINE_STAGES = [
  { id: "appraisal", name: "Appraisal", color: "bg-blue-500" },
  { id: "listing", name: "Listing", color: "bg-cyan-500" },
  { id: "under_contract", name: "Under Contract", color: "bg-purple-500" },
  { id: "settled", name: "Settled", color: "bg-green-500" },
  { id: "past_client", name: "Past Client", color: "bg-slate-500" },
];

// Stage warning thresholds (days)
const STAGE_WARNINGS: Record<string, number> = {
  appraisal: 7,
  listing: 30,
  under_contract: 60,
  settled: Infinity,
  past_client: Infinity,
};

export default function Pipeline() {
  const navigate = useNavigate();
  const { data: listings = [], isLoading } = useListings();
  const { data: contacts = [] } = useContacts();
  const createListing = useCreateListing();
  const updateListing = useUpdateListing();
  const { logStageMove } = useLogListingStageMove();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newDeal, setNewDeal] = useState({ address: "", price: "", stage: "appraisal", propertyType: "house" });
  const [draggedItem, setDraggedItem] = useState<Listing | null>(null);
  const { toast } = useToast();

  // Create a map of contact_id to contact for quick lookup
  const contactMap = useMemo(() => {
    const map = new Map();
    contacts.forEach((c) => map.set(c.id, c));
    return map;
  }, [contacts]);

  const getListingsByStage = (stageId: string) => {
    return listings.filter((listing) => (listing.pipeline_stage || "appraisal") === stageId);
  };

  const handleAddDeal = async () => {
    if (!newDeal.address.trim()) {
      toast({ title: "Error", description: "Please enter an address", variant: "destructive" });
      return;
    }
    try {
      await createListing.mutateAsync({
        address: newDeal.address,
        price: newDeal.price ? Number(newDeal.price) : null,
        pipeline_stage: newDeal.stage,
        property_type: newDeal.propertyType,
      });
      setNewDeal({ address: "", price: "", stage: "new", propertyType: "house" });
      setIsDialogOpen(false);
      toast({ title: "Success", description: "Deal added to pipeline!" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to add deal", variant: "destructive" });
    }
  };

  const handleDragStart = (e: React.DragEvent, listing: Listing) => {
    setDraggedItem(listing);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.pipeline_stage === stageId) {
      setDraggedItem(null);
      return;
    }
    
    const oldStage = draggedItem.pipeline_stage || "appraisal";
    const newStageName = PIPELINE_STAGES.find((s) => s.id === stageId)?.name || stageId;
    
    try {
      await updateListing.mutateAsync({
        id: draggedItem.id,
        pipeline_stage: stageId,
      });
      
      // Log activity event for stage movement
      try {
        await logStageMove(
          draggedItem.id,
          draggedItem.contact_id,
          oldStage,
          stageId,
          draggedItem.address
        );
      } catch (err) {
        // Don't fail the stage update if activity logging fails
        console.error("Failed to log stage movement:", err);
      }
      
      toast({
        title: "Stage Updated",
        description: `Moved to ${newStageName}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update stage",
        variant: "destructive",
      });
    }
    setDraggedItem(null);
  };

  // Calculate days in current stage and get warning status
  const getDaysInStage = (listing: Listing): number => {
    if (!listing.updated_at) return 0;
    const updated = new Date(listing.updated_at);
    return differenceInDays(new Date(), updated);
  };

  const getStageWarning = (listing: Listing): "none" | "warning" | "critical" => {
    const days = getDaysInStage(listing);
    const threshold = STAGE_WARNINGS[listing.pipeline_stage || "appraisal"] || 30;
    
    if (days > threshold * 1.5) return "critical";
    if (days > threshold) return "warning";
    return "none";
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(value);
  };

  const totalPipelineValue = listings.reduce((sum, l) => sum + (l.price || 0), 0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Sales Pipeline"
        description={`${listings.length} deals · ${formatCurrency(totalPipelineValue)} total value`}
        actions={
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Deal
          </Button>
        }
      />

      {/* Pipeline Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {PIPELINE_STAGES.map((stage) => {
          const stageListings = getListingsByStage(stage.id);
          const stageValue = stageListings.reduce((sum, l) => sum + (l.price || 0), 0);

          return (
            <div 
              key={stage.id} 
              className="pipeline-column min-h-[400px]"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <div className="pipeline-column-header border-b border-border">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                  <span className="font-medium text-foreground text-sm">{stage.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{stageListings.length}</span>
              </div>
              <div className="text-xs text-muted-foreground mb-4">{formatCurrency(stageValue)}</div>
              
              <div className="space-y-2">
                {stageListings.map((listing) => {
                  // Get contact from listing.contacts (if joined) or fallback to contactMap
                  const contact =
                    (listing as ListingWithContact).contacts ||
                    (listing.contact_id ? contactMap.get(listing.contact_id) : null);
                  const daysInStage = getDaysInStage(listing);
                  const warning = getStageWarning(listing);
                  
                  return (
                    <Card
                      key={listing.id}
                      className={cn(
                        "p-3 bg-muted/50 border border-border cursor-grab hover:bg-muted transition-colors active:cursor-grabbing zoho-card",
                        warning === "critical" && "border-yellow-500/50 bg-yellow-500/5",
                        warning === "warning" && "border-yellow-400/30 bg-yellow-400/5"
                      )}
                      draggable
                      onDragStart={(e) => handleDragStart(e, listing)}
                      onClick={() => navigate(`/listings`)} // Could navigate to listing detail if exists
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          {/* Contact Name */}
                          {contact && (
                            <div className="flex items-center gap-1.5 mb-1">
                              <User className="w-3 h-3 text-muted-foreground" />
                              <p className="font-medium text-xs text-foreground truncate">
                                {contact.name}
                              </p>
                            </div>
                          )}
                          
                          {/* Property Address */}
                          <p className="font-medium text-sm text-foreground truncate">
                            {listing.address}
                          </p>
                          
                          {/* Price */}
                          <div className="flex items-center gap-2 mt-1">
                            <DollarSign className="w-3 h-3 text-primary" />
                            <span className="text-sm text-primary font-medium">
                              {formatCurrency(listing.price)}
                            </span>
                          </div>
                          
                          {/* Days in Stage & Warning */}
                          <div className="flex items-center gap-2 mt-1.5">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {daysInStage} day{daysInStage !== 1 ? "s" : ""} in stage
                            </span>
                            {warning !== "none" && (
                              <Badge
                                variant={warning === "critical" ? "destructive" : "default"}
                                className="text-[10px] px-1.5 py-0"
                              >
                                <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                                {warning === "critical" ? "Stale" : "Warning"}
                              </Badge>
                            )}
                          </div>
                          
                          {/* Property Type */}
                          {listing.property_type && (
                            <div className="flex items-center gap-1 mt-1">
                              <Home className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground capitalize">
                                {listing.property_type}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {listings.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground mt-8">
          <Home className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No deals in pipeline. Add your first deal to get started!</p>
        </div>
      )}

      {/* Add Deal Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>Add Deal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Property Address *</Label>
              <Input
                placeholder="123 Main Street, Sydney"
                className="bg-input"
                value={newDeal.address}
                onChange={(e) => setNewDeal({ ...newDeal, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Price</Label>
              <Input
                type="number"
                placeholder="0"
                className="bg-input"
                value={newDeal.price}
                onChange={(e) => setNewDeal({ ...newDeal, price: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Property Type</Label>
                <Select value={newDeal.propertyType} onValueChange={(v) => setNewDeal({ ...newDeal, propertyType: v })}>
                  <SelectTrigger className="bg-input"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="house">House</SelectItem>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="townhouse">Townhouse</SelectItem>
                    <SelectItem value="land">Land</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select value={newDeal.stage} onValueChange={(v) => setNewDeal({ ...newDeal, stage: v })}>
                  <SelectTrigger className="bg-input"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STAGES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddDeal} disabled={createListing.isPending}>
              {createListing.isPending ? "Adding..." : "Add Deal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
