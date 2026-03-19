import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAddContactAddress,
  useUpdateContactAddress,
  type ContactAddress,
  type ContactAddressInsert,
} from "@/hooks/useContactAddresses";
import { useToast } from "@/hooks/use-toast";

const ADDRESS_TYPES = ["home", "work", "billing", "other"];

type GoogleAddressComponent = {
  types?: string[];
  short_name?: string;
  long_name?: string;
};

type GooglePlaceResult = {
  formatted_address?: string;
  address_components?: GoogleAddressComponent[];
};

type GoogleAutocompleteInstance = {
  getPlace: () => GooglePlaceResult | undefined;
  addListener: (eventName: string, handler: () => void) => unknown;
};

type GoogleAutocompleteOptions = {
  types?: string[];
  componentRestrictions?: { country?: string };
  fields?: string[];
};

type GooglePlacesNamespace = {
  Autocomplete: new (
    input: HTMLInputElement,
    options?: GoogleAutocompleteOptions
  ) => GoogleAutocompleteInstance;
};

type GoogleMapsNamespace = {
  places?: GooglePlacesNamespace;
};

declare global {
  interface Window {
    google?: { maps?: GoogleMapsNamespace };
    __googlePlacesScriptPromise?: Promise<void>;
  }
}

const AU_STATE_LONG_TO_SHORT: Record<string, string> = {
  "New South Wales": "NSW",
  Victoria: "VIC",
  Queensland: "QLD",
  "South Australia": "SA",
  "Western Australia": "WA",
  Tasmania: "TAS",
  "Northern Territory": "NT",
  "Australian Capital Territory": "ACT",
};

function cleanPostcode(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, "");
  const trimmed = digits.slice(0, 4);
  return trimmed || null;
}

function getComponent(
  components: GoogleAddressComponent[] | undefined,
  type: string,
  value: "short_name" | "long_name"
): string | null {
  const match = components?.find((c) => Array.isArray(c?.types) && c.types.includes(type));
  return (match?.[value] as string | undefined) ?? null;
}

function loadGooglePlacesScript(apiKey: string): Promise<void> {
  if (window.google?.maps?.places) return Promise.resolve();
  if (window.__googlePlacesScriptPromise) return window.__googlePlacesScriptPromise;

  window.__googlePlacesScriptPromise = new Promise((resolve, reject) => {
    // Avoid injecting duplicates if multiple dialogs mount.
    const existing = document.querySelector(
      'script[data-google-places-script="true"]'
    ) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Places script")));
      return;
    }

    const script = document.createElement("script");
    script.dataset.googlePlacesScript = "true";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=places&v=weekly`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Places script"));
    document.head.appendChild(script);
  });

  return window.__googlePlacesScriptPromise;
}

interface EditAddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string | null;
  /** If provided, edit this address; otherwise add new */
  address: ContactAddress | null;
  onSuccess?: () => void;
}

const emptyForm: ContactAddressInsert & { address_line1: string; address_line2: string; city: string; state: string; postal_code: string; country: string; address_type: string } = {
  contact_id: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "Australia",
  address_type: "home",
  is_primary: false,
};

export function EditAddressModal({
  open,
  onOpenChange,
  contactId,
  address,
  onSuccess,
}: EditAddressModalProps) {
  const { toast } = useToast();
  const addAddress = useAddContactAddress();
  const updateAddress = useUpdateContactAddress();

  const [form, setForm] = useState(emptyForm);
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<GoogleAutocompleteInstance | null>(null);

  useEffect(() => {
    if (address) {
      setForm({
        contact_id: address.contact_id,
        address_line1: address.address_line1 ?? "",
        address_line2: address.address_line2 ?? "",
        city: address.city ?? "",
        state: address.state ?? "",
        postal_code: address.postal_code ?? "",
        country: address.country ?? "Australia",
        address_type: address.address_type ?? "home",
        is_primary: address.is_primary ?? false,
      });
    } else if (contactId) {
      setForm({ ...emptyForm, contact_id: contactId });
    }
  }, [address, contactId, open]);

  // Attach Google Places autocomplete to the "Address line 1" field.
  useEffect(() => {
    if (!open) {
      autocompleteRef.current = null;
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    if (!apiKey) return; // Autocomplete is optional; plain inputs still work.

    const inputEl = addressInputRef.current;
    if (!inputEl) return;

    let cancelled = false;

    const setup = async () => {
      await loadGooglePlacesScript(apiKey);
      if (cancelled) return;

      if (!window.google?.maps?.places) return;

      // Re-create if the dialog was reopened (the input element gets remounted).
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputEl, {
        types: ["address"],
        componentRestrictions: { country: "au" },
        fields: ["address_components", "formatted_address"],
      });

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace?.();
        if (!place) return;

        const components = place.address_components;

        // Best-effort parsing for AUS-style addresses.
        const streetNumber = getComponent(components, "street_number", "short_name");
        const route = getComponent(components, "route", "long_name");
        const premise = getComponent(components, "premise", "long_name");
        const subpremise = getComponent(components, "subpremise", "long_name");

        const streetAddress = [streetNumber, route].filter(Boolean).join(" ").trim();
        const unit = (subpremise ?? premise) ?? "";

        const locality =
          getComponent(components, "locality", "long_name") ??
          getComponent(components, "administrative_area_level_3", "long_name") ??
          getComponent(components, "postal_town", "long_name");

        const stateLongOrShort =
          getComponent(components, "administrative_area_level_1", "short_name") ??
          getComponent(components, "administrative_area_level_1", "long_name");

        const stateShort =
          stateLongOrShort &&
          /^[A-Za-z]{2,3}$/.test(stateLongOrShort) &&
          !AU_STATE_LONG_TO_SHORT[stateLongOrShort]
            ? stateLongOrShort.toUpperCase()
            : stateLongOrShort
              ? (AU_STATE_LONG_TO_SHORT[stateLongOrShort] ?? stateLongOrShort)
              : null;

        const countryLong =
          getComponent(components, "country", "long_name") ??
          getComponent(components, "country", "short_name");

        const postcode = cleanPostcode(getComponent(components, "postal_code", "short_name"));

        setForm((prev) => ({
          ...prev,
          address_line1: streetAddress || place.formatted_address || prev.address_line1,
          address_line2: unit,
          city: locality ?? prev.city,
          state: stateShort ?? prev.state,
          postal_code: postcode ?? prev.postal_code,
          country: countryLong ?? prev.country,
        }));
      });
    };

    setup().catch(() => {
      if (!cancelled) {
        toast({
          title: "Google Places not available",
          description: "Address autocomplete will work next time. Check your VITE_GOOGLE_MAPS_API_KEY.",
          variant: "destructive",
        });
      }
    });

    return () => {
      cancelled = true;
      autocompleteRef.current = null;
    };
  }, [open, toast]);

  const isEdit = !!address?.id;

  const handleSubmit = async () => {
    if (!contactId) {
      toast({ title: "Error", description: "No contact selected.", variant: "destructive" });
      return;
    }
    try {
      if (isEdit && address) {
        await updateAddress.mutateAsync({
          id: address.id,
          contact_id: contactId,
          address_line1: form.address_line1 || null,
          address_line2: form.address_line2 || null,
          city: form.city || null,
          state: form.state || null,
          postal_code: form.postal_code || null,
          country: form.country || null,
          address_type: form.address_type || null,
          is_primary: form.is_primary,
        });
        toast({ title: "Updated", description: "Address updated." });
      } else {
        await addAddress.mutateAsync({
          contact_id: contactId,
          address_line1: form.address_line1 || null,
          address_line2: form.address_line2 || null,
          city: form.city || null,
          state: form.state || null,
          postal_code: form.postal_code || null,
          country: form.country || null,
          address_type: form.address_type || null,
          is_primary: form.is_primary,
        });
        toast({ title: "Added", description: "Address added." });
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (e: unknown) {
      const err = e as { message?: string; status?: number };
      const isForbidden = err?.status === 403 || (typeof err?.message === "string" && /forbidden|403|policy|row level security/i.test(err.message));
      const description = isForbidden
        ? "Address storage is not available for this account (permissions or schema). You can still set the main address when editing the contact."
        : (err instanceof Error ? err.message : "Failed to save address");
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-popover border-white/10" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit address" : "Add address"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Address line 1</Label>
              <AddressAutocomplete
                className="bg-input"
                value={form.address_line1}
                onChange={(v) => setForm({ ...form, address_line1: v })}
                onPlaceSelected={(parts) =>
                  setForm((prev) => ({
                    ...prev,
                    address_line1: parts.address_line1,
                    address_line2: parts.address_line2 || prev.address_line2,
                    city: parts.city,
                    state: parts.state,
                    postal_code: parts.postcode,
                    country: parts.country || "Australia",
                  }))
                }
                placeholder="Start typing an address..."
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Address line 2 (optional)</Label>
              <Input
                className="bg-input"
                value={form.address_line2}
                onChange={(e) => setForm({ ...form, address_line2: e.target.value })}
                placeholder="Unit, suite, etc."
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                className="bg-input"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input
                className="bg-input"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                placeholder="State"
              />
            </div>
            <div className="space-y-2">
              <Label>Postal code</Label>
              <Input
                className="bg-input"
                value={form.postal_code}
                onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                placeholder="Postal code"
              />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input
                className="bg-input"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="Country"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.address_type}
                onValueChange={(v) => setForm({ ...form, address_type: v })}
              >
                <SelectTrigger className="bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADDRESS_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="is_primary"
                checked={form.is_primary}
                onCheckedChange={(checked) =>
                  setForm({ ...form, is_primary: !!checked })
                }
              />
              <Label htmlFor="is_primary" className="text-sm font-normal cursor-pointer">
                Primary address
              </Label>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              addAddress.isPending ||
              updateAddress.isPending ||
              !form.address_line1?.trim()
            }
          >
            {addAddress.isPending || updateAddress.isPending
              ? "Saving..."
              : isEdit
                ? "Update"
                : "Add address"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
