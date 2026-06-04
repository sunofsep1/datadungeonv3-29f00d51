import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AddressAutocomplete, type AddressParts } from "@/components/ui/address-autocomplete";
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
import { PricefinderResearchPanel } from "@/components/pricefinder/PricefinderResearchPanel";
import { OwnerReviewDialog } from "@/components/pricefinder/OwnerReviewDialog";
import type { ParsedAddressParts } from "@/lib/addressFromGeocoder";

export type ProspectMapSeed = {
  lat: number;
  lng: number;
  addressLine?: string;
  addressParts?: ParsedAddressParts | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  market: ContactMarket;
  seed?: ProspectMapSeed | null;
  onPropertyCreated?: (propertyId: string, coords?: { lat: number; lng: number }) => void;
};

type Step = "address" | "report";

export function ProspectFromMapDialog({
  open,
  onOpenChange,
  market,
  seed = null,
  onPropertyCreated,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createProperty = useCreateProperty();
  const { saveCoords } = usePropertyGeocode();

  const [step, setStep] = useState<Step>("address");
  const [addressLine, setAddressLine] = useState("");
  const [addressParts, setAddressParts] = useState<AddressParts | null>(null);
  const [mapSeed, setMapSeed] = useState<ProspectMapSeed | null>(null);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [parsed, setParsed] = useState<ParsedPropertyReport | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [ownerDialogOpen, setOwnerDialogOpen] = useState(false);
  const lastParsedRef = useRef<ParsedPropertyReport | null>(null);

  const suburbHint = market.suburbs[0] ?? market.label;
  const stateHint = market.state ?? "QLD";

  const reset = useCallback(() => {
    setStep("address");
    setAddressLine("");
    setAddressParts(null);
    setMapSeed(null);
    setPropertyId(null);
    setParsed(null);
    setOwnerDialogOpen(false);
    lastParsedRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) return;
    if (!seed) return;
    setMapSeed(seed);
    setAddressLine(seed.addressLine ?? "");
    if (seed.addressParts) {
      setAddressParts({
        address_line1: seed.addressParts.address_line1,
        address_line2: seed.addressParts.address_line2,
        city: seed.addressParts.city,
        state: seed.addressParts.state,
        postcode: seed.addressParts.postcode,
        country: seed.addressParts.country,
      });
    } else {
      setAddressParts(null);
    }
  }, [open, seed]);

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handlePlaceSelected = (parts: AddressParts) => {
    setAddressParts(parts);
    setAddressLine(
      [parts.address_line1, parts.city, parts.state, parts.postcode].filter(Boolean).join(", "),
    );
  };

  const handleCreateProperty = async () => {
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

      setPropertyId(property.id);

      const coords =
        mapSeed != null
          ? { lat: mapSeed.lat, lng: mapSeed.lng }
          : null;

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

      onPropertyCreated?.(property.id, coords ?? undefined);
      await queryClient.invalidateQueries({ queryKey: ["properties"] });

      toast({ title: "Property created", description: formatPropertyAddress(property) });
      setStep("report");
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
    if (!parsed || !propertyId) return;
    setApplyLoading(true);
    try {
      const result = await applyPropertyReportToProperty(supabase, propertyId, parsed, null);
      await queryClient.invalidateQueries({ queryKey: ["properties"] });
      await queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
      await queryClient.invalidateQueries({ queryKey: ["contacts"] });

      toast({
        title: result.partialSave ? "Saved (partial)" : "Report applied",
        description: result.warnings[0] ?? "Pricefinder data saved to property",
      });

      const snapshot = parsed;
      lastParsedRef.current = snapshot;
      if (splitOwnerNames(snapshot.owner_names).length > 0) {
        setOwnerDialogOpen(true);
      } else {
        handleClose(false);
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

  const displayAddress =
    addressLine ||
    (addressParts
      ? [addressParts.address_line1, addressParts.city, addressParts.state].filter(Boolean).join(", ")
      : "");

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {step === "address" ? "Prospect address" : "Import Pricefinder report"}
            </DialogTitle>
          </DialogHeader>

          {step === "address" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {mapSeed
                  ? `Confirm the address for your map pin in ${suburbHint}, or edit before creating the property.`
                  : `Add a new property pin in ${suburbHint} for street-by-street prospecting.`}
              </p>
              {mapSeed ? (
                <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                  Pin placed at {mapSeed.lat.toFixed(5)}, {mapSeed.lng.toFixed(5)}
                </p>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="prospect-address">Street address</Label>
                <AddressAutocomplete
                  value={addressLine}
                  onChange={setAddressLine}
                  onPlaceSelected={handlePlaceSelected}
                  placeholder={`Search ${suburbHint}, ${stateHint}…`}
                />
              </div>
              <Button
                type="button"
                className="w-full"
                disabled={creating || !addressLine.trim()}
                onClick={() => void handleCreateProperty()}
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating property…
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-4 w-4" />
                    Create property & continue
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">{displayAddress}</p>
              {applyLoading ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving report…
                </p>
              ) : (
                <PricefinderResearchPanel
                  propertyId={propertyId ?? undefined}
                  address={displayAddress}
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
            </>
          )}
        </DialogContent>
      </Dialog>

      {propertyId ? (
        <OwnerReviewDialog
          open={ownerDialogOpen}
          onOpenChange={(v) => {
            setOwnerDialogOpen(v);
            if (!v) handleClose(false);
          }}
          propertyId={propertyId}
          propertyAddress={displayAddress}
          ownerNames={lastParsedRef.current?.owner_names}
          ownerPhones={lastParsedRef.current?.owner_phones}
          linkedContactIds={[]}
          linkedContactNames={[]}
          onComplete={() => {
            onPropertyCreated?.(propertyId, mapSeed ? { lat: mapSeed.lat, lng: mapSeed.lng } : undefined);
            handleClose(false);
          }}
        />
      ) : null}
    </>
  );
}
