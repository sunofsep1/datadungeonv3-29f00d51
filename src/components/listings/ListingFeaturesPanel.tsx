import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUpdateListing } from "@/hooks/useListings";
import { useUpdateProperty } from "@/hooks/useProperties";
import {
  MARKETING_DESCRIPTION_MAX,
  MARKETING_HEADLINE_MAX,
  catalogFeaturesByCategory,
  featureKeysToPropertyLabels,
  parseListingFeatureFlags,
} from "@/lib/listingFeatures";

type Props = {
  listingId: string;
  propertyId?: string | null;
  marketingHeadline?: string | null;
  marketingDescription?: string | null;
  featureFlags?: unknown;
  bedrooms?: number | null;
  bathrooms?: number | null;
  landSqm?: number | null;
  buildingSqm?: number | null;
  onUpdated?: () => void;
};

export function ListingFeaturesPanel({
  listingId,
  propertyId,
  marketingHeadline,
  marketingDescription,
  featureFlags,
  bedrooms,
  bathrooms,
  landSqm,
  buildingSqm,
  onUpdated,
}: Props) {
  const { toast } = useToast();
  const updateListing = useUpdateListing();
  const updateProperty = useUpdateProperty();

  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    setHeadline(marketingHeadline?.trim() ?? "");
    setDescription(marketingDescription?.trim() ?? "");
    setSelected(parseListingFeatureFlags(featureFlags));
  }, [marketingHeadline, marketingDescription, featureFlags]);

  const grouped = useMemo(() => catalogFeaturesByCategory(), []);

  const saveCopy = async () => {
    const h = headline.trim().slice(0, MARKETING_HEADLINE_MAX) || null;
    const d = description.trim().slice(0, MARKETING_DESCRIPTION_MAX) || null;
    try {
      await updateListing.mutateAsync({
        id: listingId,
        marketing_headline: h,
        marketing_description: d,
      });
      if (propertyId && d) {
        try {
          await updateProperty.mutateAsync({
            id: propertyId,
            property_description: d,
          });
        } catch {
          /* property column optional */
        }
      }
      onUpdated?.();
    } catch (err) {
      toast({
        title: "Could not save copy",
        description: err instanceof Error ? err.message : "Update failed",
        variant: "destructive",
      });
    }
  };

  const saveFeatures = async (nextKeys: string[]) => {
    try {
      await updateListing.mutateAsync({
        id: listingId,
        feature_flags: nextKeys,
      });
      if (propertyId) {
        try {
          await updateProperty.mutateAsync({
            id: propertyId,
            features: featureKeysToPropertyLabels(nextKeys),
          });
        } catch {
          /* property sync optional */
        }
      }
      onUpdated?.();
    } catch (err) {
      toast({
        title: "Could not save features",
        description: err instanceof Error ? err.message : "Update failed",
        variant: "destructive",
      });
    }
  };

  const toggleFeature = (key: string) => {
    const next = selected.includes(key)
      ? selected.filter((k) => k !== key)
      : [...selected, key];
    setSelected(next);
    void saveFeatures(next);
  };

  return (
    <Card className="zoho-card p-5 border-border">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Features & copy</h3>
            {selected.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {selected.length} selected
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Headline and description feed portals. Features power buyer matching.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 text-sm">
        {[
          { label: "Beds", value: bedrooms != null ? String(bedrooms) : "—" },
          { label: "Baths", value: bathrooms != null ? String(bathrooms) : "—" },
          { label: "Land", value: landSqm != null ? `${landSqm} m²` : "—" },
          { label: "Building", value: buildingSqm != null ? `${buildingSqm} m²` : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border/60 bg-muted/15 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="font-medium tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4 mb-6">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="listing-headline">Main headline</Label>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {headline.length}/{MARKETING_HEADLINE_MAX}
            </span>
          </div>
          <Input
            id="listing-headline"
            maxLength={MARKETING_HEADLINE_MAX}
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            onBlur={() => void saveCopy()}
            placeholder="Short portal headline"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="listing-description">Property description</Label>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {description.length}/{MARKETING_DESCRIPTION_MAX}
            </span>
          </div>
          <Textarea
            id="listing-description"
            maxLength={MARKETING_DESCRIPTION_MAX}
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => void saveCopy()}
            placeholder="Full listing description for portals and collateral"
          />
        </div>
      </div>

      <div className="space-y-4">
        {grouped.map(({ category, items }) => (
          <div key={category}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {category}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {items.map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center gap-2 rounded-md border border-border/60 px-2.5 py-2 text-sm cursor-pointer hover:bg-muted/30"
                >
                  <Checkbox
                    checked={selected.includes(key)}
                    onCheckedChange={() => toggleFeature(key)}
                    disabled={updateListing.isPending}
                  />
                  <span className="leading-tight">{label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
