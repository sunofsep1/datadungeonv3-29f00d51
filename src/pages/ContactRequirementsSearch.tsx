import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBuyerRequirements } from "@/hooks/useBuyerRequirements";
import { useContacts, getContactDisplayName } from "@/hooks/useContacts";
import { profileRequirementFromContact } from "@/lib/buyerRequirementMatch";
import {
  activeRequirementCriteria,
  findContactsByRequirementsSearch,
  type RequirementsSearchCriteria,
} from "@/lib/buyerRequirementsSearch";
import { formatRequirementSummary } from "@/lib/buyerRequirementMatch";
import { LISTING_FEATURE_CATALOG } from "@/lib/listingFeatures";
import { PROPERTY_TYPE_VALUES } from "@/lib/propertyType";
import { RequirementsSearchSavedMenu } from "@/components/contacts/RequirementsSearchSavedMenu";
import type { RequirementsSearchSavedPayloadV1 } from "@/lib/savedViewPayloads";

function parseNum(raw: string): number | null {
  const n = Number(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function ContactRequirementsSearch() {
  const { data: savedReqs = [], isLoading: reqsLoading } = useBuyerRequirements();
  const { data: contacts = [], isLoading: contactsLoading } = useContacts();

  const [suburbs, setSuburbs] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [bedsMin, setBedsMin] = useState("");
  const [bathsMin, setBathsMin] = useState("");
  const [parkingMin, setParkingMin] = useState("");
  const [landMin, setLandMin] = useState("");
  const [landMax, setLandMax] = useState("");
  const [buildingMin, setBuildingMin] = useState("");
  const [buildingMax, setBuildingMax] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [featuresRequired, setFeaturesRequired] = useState<string[]>([]);
  const [action, setAction] = useState<string>("all");
  const [state, setState] = useState("QLD");
  const [excludeMissing, setExcludeMissing] = useState(true);
  const [ranSearch, setRanSearch] = useState(false);

  const buildSavedPayload = useCallback(
    (): RequirementsSearchSavedPayloadV1 => ({
      v: 1,
      action,
      state,
      suburbs,
      priceMin,
      priceMax,
      bedsMin,
      bathsMin,
      parkingMin,
      landMin,
      landMax,
      buildingMin,
      buildingMax,
      propertyType,
      featuresRequired,
      excludeMissing,
    }),
    [
      action,
      state,
      suburbs,
      priceMin,
      priceMax,
      bedsMin,
      bathsMin,
      parkingMin,
      landMin,
      landMax,
      buildingMin,
      buildingMax,
      propertyType,
      featuresRequired,
      excludeMissing,
    ],
  );

  const applySavedPayload = useCallback((p: RequirementsSearchSavedPayloadV1) => {
    setAction(p.action);
    setState(p.state);
    setSuburbs(p.suburbs);
    setPriceMin(p.priceMin);
    setPriceMax(p.priceMax);
    setBedsMin(p.bedsMin);
    setBathsMin(p.bathsMin);
    setParkingMin(p.parkingMin);
    setLandMin(p.landMin);
    setLandMax(p.landMax);
    setBuildingMin(p.buildingMin);
    setBuildingMax(p.buildingMax);
    setPropertyType(p.propertyType);
    setFeaturesRequired(p.featuresRequired);
    setExcludeMissing(p.excludeMissing);
    setRanSearch(true);
  }, []);

  const allRequirements = useMemo(() => {
    const profileRows = contacts
      .map((c) => profileRequirementFromContact(c))
      .filter((r): r is NonNullable<typeof r> => r != null);
    return [...savedReqs.map((r) => ({ ...r, _source: "saved" as const })), ...profileRows];
  }, [contacts, savedReqs]);

  const criteria: RequirementsSearchCriteria = useMemo(
    () => ({
      action: action === "all" ? null : action,
      property_type: propertyType.trim() || null,
      state: state.trim() || null,
      suburbs: suburbs
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean),
      price_min: parseNum(priceMin),
      price_max: parseNum(priceMax),
      beds_min: parseNum(bedsMin),
      baths_min: parseNum(bathsMin),
      parking_min: parseNum(parkingMin),
      land_min_sqm: parseNum(landMin),
      land_max_sqm: parseNum(landMax),
      building_min_sqm: parseNum(buildingMin),
      building_max_sqm: parseNum(buildingMax),
      features_required: featuresRequired,
      excludeMissingCriteria: excludeMissing,
    }),
    [
      action,
      propertyType,
      state,
      suburbs,
      priceMin,
      priceMax,
      bedsMin,
      bathsMin,
      parkingMin,
      landMin,
      landMax,
      buildingMin,
      buildingMax,
      featuresRequired,
      excludeMissing,
    ],
  );

  const hits = useMemo(() => {
    if (!ranSearch) return [];
    return findContactsByRequirementsSearch(allRequirements, criteria);
  }, [allRequirements, criteria, ranSearch]);

  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const reqById = useMemo(() => new Map(allRequirements.map((r) => [r.id, r])), [allRequirements]);
  const activeLabels = activeRequirementCriteria(criteria);

  const toggleFeature = (key: string) => {
    setFeaturesRequired((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      <PageHeader
        title="Requirements search"
        description="Find contacts whose buyer briefs match your criteria (Reapit-style)."
        actions={
          <RequirementsSearchSavedMenu
            buildPayload={buildSavedPayload}
            applyPayload={applySavedPayload}
          />
        }
      />

      <Card className="zoho-card p-5 sm:p-6 border-border mb-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Suburbs (comma-separated)</Label>
            <Input
              className="mt-1"
              value={suburbs}
              onChange={(e) => setSuburbs(e.target.value)}
              placeholder="Bulimba, Hawthorne"
            />
          </div>
          <div>
            <Label>Action</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="rent">Rent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>State</Label>
            <Input className="mt-1" value={state} onChange={(e) => setState(e.target.value)} />
          </div>
          <div>
            <Label>Property type</Label>
            <Select
              value={propertyType || "any"}
              onValueChange={(v) => setPropertyType(v === "any" ? "" : v)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {PROPERTY_TYPE_VALUES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Price min</Label>
            <Input className="mt-1" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
          </div>
          <div>
            <Label>Price max</Label>
            <Input className="mt-1" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
          </div>
          <div>
            <Label>Beds minimum</Label>
            <Input className="mt-1" value={bedsMin} onChange={(e) => setBedsMin(e.target.value)} />
          </div>
          <div>
            <Label>Baths minimum</Label>
            <Input className="mt-1" value={bathsMin} onChange={(e) => setBathsMin(e.target.value)} />
          </div>
          <div>
            <Label>Parking minimum</Label>
            <Input className="mt-1" value={parkingMin} onChange={(e) => setParkingMin(e.target.value)} />
          </div>
          <div>
            <Label>Land min (sqm)</Label>
            <Input className="mt-1" value={landMin} onChange={(e) => setLandMin(e.target.value)} />
          </div>
          <div>
            <Label>Land max (sqm)</Label>
            <Input className="mt-1" value={landMax} onChange={(e) => setLandMax(e.target.value)} />
          </div>
          <div>
            <Label>Building min (sqm)</Label>
            <Input className="mt-1" value={buildingMin} onChange={(e) => setBuildingMin(e.target.value)} />
          </div>
          <div>
            <Label>Building max (sqm)</Label>
            <Input className="mt-1" value={buildingMax} onChange={(e) => setBuildingMax(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Required features ({featuresRequired.length})</Label>
            <ScrollArea className="h-28 mt-2 rounded-md border border-border p-2">
              <div className="grid grid-cols-2 gap-1.5">
                {LISTING_FEATURE_CATALOG.slice(0, 24).map((f) => (
                  <label key={f.key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox
                      checked={featuresRequired.includes(f.key)}
                      onCheckedChange={() => toggleFeature(f.key)}
                    />
                    <span className="truncate">{f.label}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Switch id="exclude-missing" checked={excludeMissing} onCheckedChange={setExcludeMissing} />
            <Label htmlFor="exclude-missing" className="text-sm font-normal cursor-pointer">
              Limit search — exclude briefs missing searched criteria
            </Label>
          </div>
          <Button
            type="button"
            className="gap-2"
            onClick={() => setRanSearch(true)}
            disabled={activeLabels.length === 0}
          >
            <Search className="h-4 w-4" /> Search
          </Button>
        </div>
        {activeLabels.length === 0 ? (
          <p className="text-xs text-muted-foreground mt-2">Add at least one criterion to search.</p>
        ) : null}
      </Card>

      <Card className="zoho-card p-5 sm:p-6 border-border">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
            Results {ranSearch ? `(${hits.length})` : ""}
          </h2>
        </div>
        {reqsLoading || contactsLoading ? (
          <p className="text-sm text-muted-foreground">Loading contacts and requirements…</p>
        ) : !ranSearch ? (
          <p className="text-sm text-muted-foreground">Run a search to see matching contacts.</p>
        ) : hits.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contacts match these criteria.</p>
        ) : (
          <ul className="divide-y divide-border">
            {hits.map((hit) => {
              const contact = contactById.get(hit.contactId);
              const req = reqById.get(hit.requirementId);
              const name = contact ? getContactDisplayName(contact) : "Contact";
              return (
                <li key={`${hit.contactId}-${hit.requirementId}`} className="py-3 first:pt-0">
                  <Link
                    to={`/contacts/${hit.contactId}?tab=requirements`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {name}
                  </Link>
                  {req ? (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatRequirementSummary(req)}
                      {hit.requirementSource === "profile" ? " · from profile" : ""}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <p className="text-xs text-muted-foreground mt-4">
        <Link to="/contacts" className="text-primary hover:underline">
          ← Back to contacts
        </Link>
      </p>
    </div>
  );
}
