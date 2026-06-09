import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AddressAutocomplete, type AddressParts } from "@/components/ui/address-autocomplete";
import { MarketStreetViewPanel } from "@/components/markets/MarketStreetViewPanel";
import { PricefinderResearchPanel } from "@/components/pricefinder/PricefinderResearchPanel";
import { OwnerReviewDialog } from "@/components/pricefinder/OwnerReviewDialog";
import { useToast } from "@/hooks/use-toast";
import { useCreateProperty, formatPropertyAddress } from "@/hooks/useProperties";
import { usePropertyGeocode, tryGeocodePropertyAfterSave } from "@/hooks/usePropertyGeocode";
import { supabase } from "@/integrations/supabase/client";
import {
  applyPropertyReportToProperty,
  errorMessageFromUnknown,
} from "@/lib/applyPropertyReport";
import { splitOwnerNames } from "@/lib/ownerNameParse";
import type { ParsedPropertyReport } from "@/lib/parsePropertyReportPdf";
import type { ContactMarket } from "@/lib/contactMarkets";
import { geocodeAddressString } from "@/lib/propertyGeocode";
import { getGoogleMapsApiKey } from "@/lib/loadGoogleMaps";
import { mapPickToAddressLine, type MapProspectPick } from "@/lib/mapProspectPick";
import type { ParsedAddressParts } from "@/lib/addressFromGeocoder";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  pick: MapProspectPick;
  market: ContactMarket;
  pinDropMode: boolean;
  keepDropModeAfterSave: boolean;
  onKeepDropModeChange: (value: boolean) => void;
  onPickChange: (pick: MapProspectPick) => void;
  onClose: () => void;
  onDone: () => void;
  onPropertyCreated: (propertyId: string, coords?: { lat: number; lng: number }) => void;
};

function toAddressParts(parts: AddressParts): ParsedAddressParts {
  return {
    address_line1: parts.address_line1,
    address_line2: parts.address_line2,
    city: parts.city,
    state: parts.state,
    postcode: parts.postcode,
    country: parts.country,
  };
}

export function ProspectDrawer({
  open,
  pick,
  market,
  pinDropMode,
  keepDropModeAfterSave,
  onKeepDropModeChange,
  onPickChange,
  onClose,
  onDone,
  onPropertyCreated,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createProperty = useCreateProperty();
  const { saveCoords } = usePropertyGeocode();

  const suburbHint = market.suburbs[0] ?? market.label;
  const stateHint = market.state ?? "QLD";

  const [addressLine, setAddressLine] = useState("");
  const [addressParts, setAddressParts] = useState<AddressParts | null>(null);
  const [geocodingAddress, setGeocodingAddress] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savedPropertyId, setSavedPropertyId] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedPropertyReport | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [ownerDialogOpen, setOwnerDialogOpen] = useState(false);
  const lastParsedRef = useRef<ParsedPropertyReport | null>(null);
  const saveBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      setSavedPropertyId(null);
      setParsed(null);
      setOwnerDialogOpen(false);
      lastParsedRef.current = null;
      return;
    }
    setAddressLine(pick.addressLine ?? "");
    if (pick.addressParts) {
      setAddressParts({
        address_line1: pick.addressParts.address_line1 ?? "",
        address_line2: pick.addressParts.address_line2 ?? "",
        city: pick.addressParts.city ?? "",
        state: pick.addressParts.state ?? "",
        postcode: pick.addressParts.postcode ?? "",
        country: pick.addressParts.country ?? "Australia",
      });
    } else {
      setAddressParts(null);
    }
  }, [open, pick.lat, pick.lng, pick.addressLine, pick.addressParts]);

  const pinLabel = addressLine.trim() || mapPickToAddressLine(pick);
  const hasCoords = Number.isFinite(pick.lat) && Number.isFinite(pick.lng) && (pick.lat !== 0 || pick.lng !== 0);

  const handlePlaceSelected = useCallback(
    async (parts: AddressParts) => {
      setAddressParts(parts);
      const line = [parts.address_line1, parts.city, parts.state, parts.postcode].filter(Boolean).join(", ");
      setAddressLine(line);

      const apiKey = getGoogleMapsApiKey();
      if (!apiKey) return;

      setGeocodingAddress(true);
      try {
        const outcome = await geocodeAddressString(line, apiKey);
        if (outcome.ok) {
          onPickChange({
            ...pick,
            lat: outcome.lat,
            lng: outcome.lng,
            addressLine: line,
            addressParts: toAddressParts(parts),
            geocodeError: null,
            resolving: false,
          });
        }
      } finally {
        setGeocodingAddress(false);
      }
    },
    [onPickChange, pick],
  );

  const handleSave = async () => {
    const line1 = addressParts?.address_line1?.trim() || addressLine.trim();
    if (!line1) {
      toast({ title: "Address required", description: "Enter or select a street address.", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const property = await createProperty.mutateAsync({
        address_line1: line1,
        address_line2: addressParts?.address_line2?.trim() || null,
        city: addressParts?.city?.trim() || suburbHint,
        state: addressParts?.state?.trim() || stateHint,
        postcode: addressParts?.postcode?.trim() || null,
        country: addressParts?.country?.trim() || "Australia",
        suburb: addressParts?.city?.trim() || suburbHint,
      } as Parameters<typeof createProperty.mutateAsync>[0]);

      const coords = hasCoords ? { lat: pick.lat, lng: pick.lng } : null;

      if (coords) {
        await saveCoords.mutateAsync({ propertyId: property.id, lat: coords.lat, lng: coords.lng });
      } else {
        void tryGeocodePropertyAfterSave({
          id: property.id,
          address_line1: property.address_line1,
          suburb: (property as { suburb?: string | null }).suburb ?? property.city,
          city: property.city,
          state: property.state,
          postcode: property.postcode,
          latitude: (property as { latitude?: number | null }).latitude,
          longitude: (property as { longitude?: number | null }).longitude,
        });
      }

      setSavedPropertyId(property.id);
      await queryClient.invalidateQueries({ queryKey: ["properties"] });

      toast({
        title: "Saved to CRM",
        description: formatPropertyAddress(property),
      });

      onPropertyCreated(property.id, coords ?? undefined);
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Could not create property",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.includes("pdf")) {
      toast({ title: "Error", description: "Select a PDF file", variant: "destructive" });
      return;
    }
    setUploadLoading(true);
    setParsed(null);
    try {
      const { parsePropertyReportPdf } = await import("@/lib/parsePropertyReportPdf");
      const data = await parsePropertyReportPdf(file);
      setParsed(data);
      lastParsedRef.current = data;
    } catch (err) {
      toast({
        title: "Parse error",
        description: err instanceof Error ? err.message : "Could not parse PDF",
        variant: "destructive",
      });
    } finally {
      setUploadLoading(false);
      e.target.value = "";
    }
  };

  const handleApply = async () => {
    if (!parsed || !savedPropertyId) return;
    setApplyLoading(true);
    try {
      const result = await applyPropertyReportToProperty(supabase, savedPropertyId, parsed, null);
      await queryClient.invalidateQueries({ queryKey: ["properties"] });
      await queryClient.invalidateQueries({ queryKey: ["property", savedPropertyId] });
      await queryClient.invalidateQueries({ queryKey: ["contacts"] });

      toast({
        title: result.partialSave ? "Saved (partial)" : "Report applied",
        description: result.warnings[0] ?? "Pricefinder data saved to property",
      });

      const snapshot = parsed;
      lastParsedRef.current = snapshot;
      if (splitOwnerNames(snapshot.owner_names).length > 0) {
        setOwnerDialogOpen(true);
      }
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: errorMessageFromUnknown(e),
        variant: "destructive",
      });
    } finally {
      setApplyLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "TEXTAREA") return;
      if (creating || pick.resolving || geocodingAddress) return;
      if (savedPropertyId) return;
      e.preventDefault();
      void handleSave();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(v) => {
          if (!v) (savedPropertyId ? onDone() : onClose());
        }}
      >
        <SheetContent
          side="bottom"
          className={cn(
            "max-h-[min(72vh,560px)] overflow-y-auto rounded-t-xl px-4 pb-6 pt-4 sm:px-6",
            "data-[state=open]:slide-in-from-bottom",
          )}
        >
          <SheetHeader className="pb-2 text-left">
            <SheetTitle className="text-base">
              {savedPropertyId ? "Import Pricefinder report" : pinDropMode ? "Prospect pin" : "Search address"}
            </SheetTitle>
            <SheetDescription className="text-xs">
              {savedPropertyId
                ? "Optional — attach a Pricefinder PDF to pull owner details."
                : "Confirm the address, check Street View, then save to CRM."}
            </SheetDescription>
          </SheetHeader>

          {!savedPropertyId ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                {hasCoords ? (
                  <MarketStreetViewPanel
                    open
                    lat={pick.lat}
                    lng={pick.lng}
                    label={pinLabel}
                    onClose={() => undefined}
                    className="rounded-lg border border-border/60"
                  />
                ) : (
                  <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 text-center text-xs text-muted-foreground">
                    Search an address to preview Street View
                  </div>
                )}

                {pick.geocodeError ? (
                  <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    {pick.geocodeError}
                  </p>
                ) : null}

                {pick.resolving || geocodingAddress ? (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Looking up address…
                  </p>
                ) : hasCoords ? (
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    Pin at {pick.lat.toFixed(5)}, {pick.lng.toFixed(5)}
                    {pinDropMode ? " · drag purple pin on map to fine-tune" : ""}
                  </p>
                ) : null}
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="prospect-drawer-address">Property address</Label>
                  <AddressAutocomplete
                    value={addressLine}
                    onChange={setAddressLine}
                    onPlaceSelected={(parts) => void handlePlaceSelected(parts)}
                    placeholder={`Search ${suburbHint}, ${stateHint}…`}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="keep-drop-mode"
                    checked={keepDropModeAfterSave}
                    onCheckedChange={(v) => onKeepDropModeChange(v === true)}
                  />
                  <Label htmlFor="keep-drop-mode" className="text-xs font-normal text-muted-foreground">
                    Keep drop pin mode after save
                  </Label>
                </div>

                <Button
                  ref={saveBtnRef}
                  type="button"
                  className="w-full"
                  disabled={creating || pick.resolving || geocodingAddress || !addressLine.trim()}
                  onClick={() => void handleSave()}
                >
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save to CRM
                    </>
                  )}
                </Button>
                <Button type="button" variant="ghost" size="sm" className="w-full text-xs" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{pinLabel}</p>
              {applyLoading ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving report…
                </p>
              ) : (
                <PricefinderResearchPanel
                  propertyId={savedPropertyId}
                  address={pinLabel}
                  variant="compact"
                  parsedReport={parsed}
                  uploadLoading={uploadLoading}
                  applyLoading={applyLoading}
                  onUploadReport={(e) => void handleUpload(e)}
                  onApplyReport={() => void handleApply()}
                  onDismissReport={() => setParsed(null)}
                  showWidgetSlot={false}
                />
              )}
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={onDone}>
                Done
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {savedPropertyId ? (
        <OwnerReviewDialog
          open={ownerDialogOpen}
          onOpenChange={setOwnerDialogOpen}
          propertyId={savedPropertyId}
          propertyAddress={pinLabel}
          ownerNames={lastParsedRef.current?.owner_names}
          ownerPhones={lastParsedRef.current?.owner_phones}
          linkedContactIds={[]}
          linkedContactNames={[]}
          onComplete={() => {
            onPropertyCreated(savedPropertyId, hasCoords ? { lat: pick.lat, lng: pick.lng } : undefined);
          }}
        />
      ) : null}
    </>
  );
}
