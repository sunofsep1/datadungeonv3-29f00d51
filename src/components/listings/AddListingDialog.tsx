import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { useProperties } from "@/hooks/useProperties";
import { useContacts } from "@/hooks/useContacts";
import { useCreateListing } from "@/hooks/useListings";
import { cn } from "@/lib/utils";
import { supabaseErrorMessage } from "@/lib/supabaseErrorMessage";
import {
  formatPropertyAddressLine,
  getFirstPropertyImageUrl,
  getPrimaryVendorContactId,
  propertyEligibleForSalesListing,
  vendorContactDisplayName,
} from "@/lib/listingFromProperty";
import {
  QLD_CONDITION_DAY_OPTIONS,
  QLD_CONTRACT_CONDITIONS,
  selectValueToDays,
  type QldConditionField,
} from "@/lib/qldContractConditions";
import { Check, ChevronsUpDown, Home, ImageIcon } from "lucide-react";
import type { PropertyForListing } from "@/lib/listingFromProperty";

const QLD_UNSET = "__none__";

type StageOption = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: readonly StageOption[];
  /** When "appraisal", dialog copy targets open-appraisal stock (Appraisals hub). */
  createMode?: "appraisal" | "listing";
};

export function AddListingDialog({ open, onOpenChange, stages, createMode = "listing" }: Props) {
  const { toast } = useToast();
  const { data: properties = [], isLoading: propsLoading, isError: propsError } = useProperties();
  const { data: contacts = [] } = useContacts();
  const createListing = useCreateListing();

  const dnc = useMemo(() => {
    const m = new Map<string, boolean>();
    contacts.forEach((c) => m.set(c.id, Boolean(c.do_not_contact)));
    return m;
  }, [contacts]);

  const contactNameById = useMemo(() => {
    const m = new Map<string, string>();
    contacts.forEach((c) => m.set(c.id, c.name?.trim() || "Contact"));
    return m;
  }, [contacts]);

  const eligibleProperties = useMemo(() => {
    return (properties as PropertyForListing[]).filter((p) => {
      if (!propertyEligibleForSalesListing(p)) return false;
      const cid = getPrimaryVendorContactId(p);
      if (!cid) return false;
      return !dnc.get(cid);
    });
  }, [properties, dnc]);

  const [propertyOpen, setPropertyOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [addressOverride, setAddressOverride] = useState("");
  const [price, setPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [propertyType, setPropertyType] = useState("house");
  const [stage, setStage] = useState("appraisal");
  const [listingStatus, setListingStatus] = useState<"active" | "pending">("active");
  const [methodOfSale, setMethodOfSale] = useState("");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [qldDays, setQldDays] = useState<Partial<Record<QldConditionField, string>>>({});

  const isAppraisalCreate = createMode === "appraisal";
  const entityNoun = isAppraisalCreate ? "appraisal" : "listing";
  const entityNounTitle = isAppraisalCreate ? "Appraisal" : "Listing";
  const showStagePicker = stages.length > 1;

  const selectedProperty = useMemo(
    () => (selectedPropertyId ? (properties as PropertyForListing[]).find((p) => p.id === selectedPropertyId) : null),
    [properties, selectedPropertyId]
  );

  useEffect(() => {
    if (!open) return;
    setStage(stages[0]?.id ?? "appraisal");
  }, [open, stages]);

  useEffect(() => {
    if (!selectedProperty) return;
    const addr = formatPropertyAddressLine(selectedProperty);
    setAddressOverride(addr === "—" ? "" : addr);
    const listPx = selectedProperty.list_price ?? selectedProperty.price_listed ?? selectedProperty.price;
    setPrice(listPx != null && listPx !== "" ? String(listPx) : "");
    setBedrooms(selectedProperty.bedrooms != null ? String(selectedProperty.bedrooms) : "");
    setBathrooms(selectedProperty.bathrooms != null ? String(selectedProperty.bathrooms) : "");
    setPropertyType((selectedProperty.property_type || "house").toLowerCase());
  }, [selectedProperty]);

  const resetForm = useCallback(() => {
    setSelectedPropertyId(null);
    setAddressOverride("");
    setPrice("");
    setBedrooms("");
    setBathrooms("");
    setPropertyType("house");
    setStage("appraisal");
    setListingStatus("active");
    setMethodOfSale("");
    setNotes("");
    setInternalNotes("");
    setQldDays({});
    setPropertyOpen(false);
  }, []);

  useEffect(() => {
    if (!open) resetForm();
  }, [open, resetForm]);

  const heroUrl = selectedProperty ? getFirstPropertyImageUrl(selectedProperty.images) : null;

  const handleSave = async () => {
    if (!selectedPropertyId || !selectedProperty) {
      toast({ title: "Select a property", variant: "destructive" });
      return;
    }
    const addr = addressOverride.trim() || formatPropertyAddressLine(selectedProperty);
    if (!addr || addr === "—") {
      toast({ title: "Address required", variant: "destructive" });
      return;
    }
    const contactId = getPrimaryVendorContactId(selectedProperty);
    if (!contactId) {
      toast({ title: "No vendor on property", variant: "destructive" });
      return;
    }

    const imageUrl = getFirstPropertyImageUrl(selectedProperty.images);
    const beds = bedrooms.trim() ? parseInt(bedrooms, 10) : null;
    const baths = bathrooms.trim() ? parseFloat(bathrooms) : null;
    const combinedNotes = [internalNotes.trim() && `Internal: ${internalNotes.trim()}`, notes.trim() && notes.trim()]
      .filter(Boolean)
      .join("\n\n");

    const rawPrice = price.trim() ? Number(price) : null;
    const listPrice = rawPrice != null && Number.isFinite(rawPrice) ? rawPrice : null;
    const payload: Record<string, unknown> = {
      address: addr,
      contact_id: contactId,
      property_id: selectedPropertyId,
      listing_image_url: imageUrl,
      price: listPrice,
      bedrooms: Number.isFinite(beds) ? beds : null,
      bathrooms: Number.isFinite(baths as number) ? baths : null,
      property_type: propertyType,
      pipeline_stage: stage,
      status: listingStatus,
      notes: combinedNotes || null,
      contract_finance_days: selectValueToDays((qldDays.contract_finance_days ?? QLD_UNSET) === QLD_UNSET ? "" : qldDays.contract_finance_days!),
      contract_building_pest_days: selectValueToDays((qldDays.contract_building_pest_days ?? QLD_UNSET) === QLD_UNSET ? "" : qldDays.contract_building_pest_days!),
      contract_due_diligence_days: selectValueToDays((qldDays.contract_due_diligence_days ?? QLD_UNSET) === QLD_UNSET ? "" : qldDays.contract_due_diligence_days!),
      contract_subject_sale_days: selectValueToDays((qldDays.contract_subject_sale_days ?? QLD_UNSET) === QLD_UNSET ? "" : qldDays.contract_subject_sale_days!),
      contract_body_corporate_days: selectValueToDays((qldDays.contract_body_corporate_days ?? QLD_UNSET) === QLD_UNSET ? "" : qldDays.contract_body_corporate_days!),
    };

    if (methodOfSale.trim()) {
      payload.notes = [String(payload.notes || "").trim(), `Method of sale: ${methodOfSale.trim()}`]
        .filter(Boolean)
        .join("\n\n");
    }

    if (stage === "appraisal") {
      payload.lead_temperature = "LEAD_WARM";
      payload.journey_stage = "SELLER_CONSIDERING";
      payload.role_category = "SELLER_OWNER_OCCUPIER";
      payload.classification_meta = {
        lead_temperature: { source: "derived" },
        journey_stage: { source: "derived" },
        role_category: { source: "derived" },
      };
    }

    try {
      await createListing.mutateAsync(payload as never);
      toast({ title: `${entityNounTitle} added` });
      onOpenChange(false);
    } catch (e) {
      toast({
        title: `Could not create ${entityNoun}`,
        description: supabaseErrorMessage(e),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[min(640px,96vw)] max-h-[min(92vh,900px)] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle>Add {entityNoun}</DialogTitle>
          <DialogDescription className="sr-only">
            Create a new {entityNoun} from a property record.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          <div className="space-y-2">
            <Label>Property *</Label>
            <Popover open={propertyOpen} onOpenChange={setPropertyOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={propertyOpen}
                  disabled={propsLoading}
                  className="w-full justify-between font-normal bg-input border-border h-auto min-h-10 py-2"
                >
                  <span className="truncate text-left">
                    {selectedProperty
                      ? formatPropertyAddressLine(selectedProperty)
                      : propsLoading
                        ? "Loading properties…"
                        : "Search properties…"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 border-border" align="start">
                <Command>
                  <CommandInput placeholder="Search by address or suburb…" />
                  <CommandList>
                    <CommandEmpty>
                      {propsError ? "Could not load properties." : eligibleProperties.length === 0 ? "No eligible properties." : "No match."}
                    </CommandEmpty>
                    <CommandGroup>
                      {eligibleProperties.map((p) => {
                        const label = formatPropertyAddressLine(p);
                        const thumb = getFirstPropertyImageUrl(p.images);
                        const cid = getPrimaryVendorContactId(p);
                        const vendor =
                          vendorContactDisplayName(p) || (cid ? contactNameById.get(cid) : undefined) || null;
                        return (
                          <CommandItem
                            key={p.id}
                            value={`${p.id} ${label} ${vendor ?? ""}`}
                            onSelect={() => {
                              setSelectedPropertyId(p.id);
                              setPropertyOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="h-12 w-14 shrink-0 rounded-md overflow-hidden bg-muted border border-border">
                                {thumb ? (
                                  <img src={thumb} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                    <Home className="h-5 w-5 opacity-50" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">{label}</p>
                                {vendor && <p className="text-xs text-muted-foreground truncate">Vendor: {vendor}</p>}
                              </div>
                            </div>
                            <Check
                              className={cn(
                                "h-4 w-4 shrink-0",
                                selectedPropertyId === p.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {selectedProperty && (
            <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
              <div className="aspect-[16/9] max-h-48 w-full bg-muted relative flex items-center justify-center">
                {heroUrl ? (
                  <img src={heroUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground p-6 min-h-[120px]">
                    <ImageIcon className="h-10 w-10 opacity-40" />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Listing address (editable)</Label>
              <Input
                className="bg-input"
                value={addressOverride}
                onChange={(e) => setAddressOverride(e.target.value)}
                placeholder="Matches portal / contract wording"
              />
            </div>
            <div className="space-y-2">
              <Label>Guide / list price</Label>
              <Input
                type="number"
                className="bg-input"
                placeholder="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Method of sale</Label>
              <Select value={methodOfSale || "__unset"} onValueChange={(v) => setMethodOfSale(v === "__unset" ? "" : v)}>
                <SelectTrigger className="bg-input">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unset">Not specified</SelectItem>
                  <SelectItem value="Private treaty">Private treaty</SelectItem>
                  <SelectItem value="Auction">Auction</SelectItem>
                  <SelectItem value="Expressions of interest">Expressions of interest</SelectItem>
                  <SelectItem value="Tender">Tender</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bedrooms</Label>
              <Input className="bg-input" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} placeholder="—" />
            </div>
            <div className="space-y-2">
              <Label>Bathrooms</Label>
              <Input className="bg-input" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} placeholder="—" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={propertyType} onValueChange={setPropertyType}>
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
              <Label>{entityNounTitle} status</Label>
              <Select value={listingStatus} onValueChange={(v) => setListingStatus(v as "active" | "pending")}>
                <SelectTrigger className="bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active (on market)</SelectItem>
                  <SelectItem value="pending">Pending / pre-launch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {showStagePicker ? (
              <div className="space-y-2">
                <Label>Starting column</Label>
                <Select value={stage} onValueChange={setStage}>
                  <SelectTrigger className="bg-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">QLD condition days (optional)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {QLD_CONTRACT_CONDITIONS.map(({ field, title }) => {
                const val = qldDays[field] ?? QLD_UNSET;
                return (
                  <div key={field} className="space-y-1.5">
                    <Label className="text-xs">{title}</Label>
                    <Select
                      value={val}
                      onValueChange={(v) =>
                        setQldDays((prev) => ({
                          ...prev,
                          [field]: v === QLD_UNSET ? undefined : v,
                        }))
                      }
                    >
                      <SelectTrigger className="bg-input h-9 text-xs">
                        <SelectValue placeholder="Days" />
                      </SelectTrigger>
                      <SelectContent>
                        {QLD_CONDITION_DAY_OPTIONS.map((o) => (
                          <SelectItem key={o.value || QLD_UNSET} value={o.value ? o.value : QLD_UNSET}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Marketing / portal notes</Label>
            <Textarea
              className="bg-input min-h-[72px]"
              placeholder="Headline angles, inclusions, open home times…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Internal notes (private)</Label>
            <Textarea
              className="bg-input min-h-[64px]"
              placeholder="Commission discussion, motivation, risks — not for portals"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
            />
          </div>

          <Button className="w-full" onClick={() => void handleSave()} disabled={createListing.isPending}>
            {createListing.isPending ? "Saving…" : `Create ${entityNoun}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
