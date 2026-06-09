import { useState } from "react";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AU_STATES,
  AU_STREET_TYPES,
  formatStructuredAddressPreview,
  googlePlacesToStructured,
  type PropertyLegalFields,
  type StructuredPropertyAddress,
} from "@/lib/australianPropertyAddress";

type Props = {
  address: StructuredPropertyAddress;
  legal: PropertyLegalFields;
  onAddressChange: (next: StructuredPropertyAddress) => void;
  onLegalChange: (next: PropertyLegalFields) => void;
};

export function PropertyAddressFields({ address, legal, onAddressChange, onLegalChange }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const set = (patch: Partial<StructuredPropertyAddress>) => onAddressChange({ ...address, ...patch });
  const setLegal = (patch: Partial<PropertyLegalFields>) => onLegalChange({ ...legal, ...patch });
  const preview = formatStructuredAddressPreview(address);

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-primary">Quick search</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Start typing — Google will fill unit, street, suburb, state and postcode (Agentbox-style fields).
        </p>
        <div className="mt-2">
          <AddressAutocomplete
            placeholder="Search Australian address…"
            className="bg-input"
            value={searchQuery}
            onChange={setSearchQuery}
            onPlaceSelected={(parts) => {
              onAddressChange(googlePlacesToStructured(parts));
              setSearchQuery("");
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Property name (optional)</Label>
        <Input
          className="bg-input"
          placeholder="e.g. Family home, Investment unit"
          value={address.property_name}
          onChange={(e) => set({ property_name: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>Level / floor</Label>
          <Input
            className="bg-input"
            placeholder="Level 2"
            value={address.level_no}
            onChange={(e) => set({ level_no: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Unit no.</Label>
          <Input
            className="bg-input"
            placeholder="5"
            value={address.unit_no}
            onChange={(e) => set({ unit_no: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Street no.</Label>
          <Input
            className="bg-input"
            placeholder="12"
            value={address.street_no}
            onChange={(e) => set({ street_no: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_160px]">
        <div className="space-y-2">
          <Label>Street name *</Label>
          <Input
            className="bg-input"
            placeholder="Hickory"
            value={address.street_name}
            onChange={(e) => set({ street_name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Street type</Label>
          <Select
            value={address.street_type || "__none__"}
            onValueChange={(value) => set({ street_type: value === "__none__" ? "" : value })}
          >
            <SelectTrigger className="bg-input">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {AU_STREET_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Suburb *</Label>
          <Input
            className="bg-input"
            placeholder="Narangba"
            value={address.suburb}
            onChange={(e) => set({ suburb: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>State *</Label>
          <Select value={address.state || "__none__"} onValueChange={(value) => set({ state: value === "__none__" ? "" : value })}>
            <SelectTrigger className="bg-input">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select state</SelectItem>
              {AU_STATES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.value} — {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Postcode *</Label>
          <Input
            className="bg-input"
            placeholder="4504"
            inputMode="numeric"
            maxLength={4}
            value={address.postcode}
            onChange={(e) => set({ postcode: e.target.value.replace(/\D/g, "").slice(0, 4) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Country</Label>
          <Input className="bg-input" value={address.country} onChange={(e) => set({ country: e.target.value })} />
        </div>
      </div>

      {preview ? (
        <div className="rounded-md border border-border/80 bg-muted/30 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Address preview</p>
          <p className="mt-1 text-sm font-medium text-foreground">{preview}</p>
        </div>
      ) : null}

      <div className="border-t border-border/60 pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Title &amp; legal (optional)</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Lot</Label>
            <Input className="bg-input" placeholder="123" value={legal.lot} onChange={(e) => setLegal({ lot: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Deposited plan (DP)</Label>
            <Input
              className="bg-input"
              placeholder="456789"
              value={legal.deposited_plan}
              onChange={(e) => setLegal({ deposited_plan: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <Label>Zoning</Label>
          <Input
            className="bg-input"
            placeholder="Low density residential"
            value={legal.zoning}
            onChange={(e) => setLegal({ zoning: e.target.value })}
          />
        </div>
        <div className="mt-3 space-y-2">
          <Label>Legal description</Label>
          <Textarea
            className="bg-input min-h-[72px] resize-y"
            placeholder="Full legal description if known"
            value={legal.legal_description}
            onChange={(e) => setLegal({ legal_description: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
