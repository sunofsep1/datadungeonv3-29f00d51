/** Standard listing feature keys (Reapit Agent Box checklist subset). */
export type ListingFeatureDef = {
  key: string;
  label: string;
  category: string;
};

export const LISTING_FEATURE_CATALOG: ListingFeatureDef[] = [
  { key: "air_conditioning", label: "Air Conditioning", category: "Comfort" },
  { key: "alarm_system", label: "Alarm System", category: "Security" },
  { key: "area_views", label: "Area Views", category: "Views" },
  { key: "balcony", label: "Balcony", category: "Outdoor" },
  { key: "beach_front", label: "Beach Front", category: "Location" },
  { key: "broadband_internet", label: "Broadband Internet", category: "Technology" },
  { key: "built_in_wardrobes", label: "Built-In Wardrobes", category: "Interior" },
  { key: "bush_retreat", label: "Bush Retreat", category: "Location" },
  { key: "car_parking_basement", label: "Car Parking — Basement", category: "Parking" },
  { key: "car_parking_surface", label: "Car Parking — Surface", category: "Parking" },
  { key: "carpeted", label: "Carpeted", category: "Interior" },
  { key: "city_views", label: "City Views", category: "Views" },
  { key: "close_to_schools", label: "Close to Schools", category: "Location" },
  { key: "close_to_shops", label: "Close to Shops", category: "Location" },
  { key: "close_to_transport", label: "Close to Transport", category: "Location" },
  { key: "deck", label: "Deck", category: "Outdoor" },
  { key: "dishwasher", label: "Dishwasher", category: "Kitchen" },
  { key: "ducted_heating", label: "Ducted Heating", category: "Comfort" },
  { key: "ensuite", label: "Ensuite", category: "Interior" },
  { key: "ev_charger", label: "EV Charger", category: "Parking" },
  { key: "fully_fenced", label: "Fully Fenced", category: "Outdoor" },
  { key: "gym", label: "Gym", category: "Building" },
  { key: "hardwood_floors", label: "Hardwood Floors", category: "Interior" },
  { key: "heat_pump", label: "Heat Pump", category: "Comfort" },
  { key: "intercom", label: "Intercom", category: "Security" },
  { key: "internal_laundry", label: "Internal Laundry", category: "Interior" },
  { key: "lift_installed", label: "Lift Installed", category: "Building" },
  { key: "loading_dock", label: "Loading Dock", category: "Building" },
  { key: "ocean_views", label: "Ocean Views", category: "Views" },
  { key: "open_fire_place", label: "Open Fire Place", category: "Comfort" },
  { key: "openable_windows", label: "Openable Windows", category: "Comfort" },
  { key: "outdoor_entertaining", label: "Outdoor Entertaining", category: "Outdoor" },
  { key: "pet_friendly", label: "Pet Friendly", category: "Lifestyle" },
  { key: "pool", label: "Pool", category: "Outdoor" },
  { key: "pool_in_ground", label: "Pool — In Ground", category: "Outdoor" },
  { key: "pool_above_ground", label: "Pool — Above Ground", category: "Outdoor" },
  { key: "remote_garage", label: "Remote Garage", category: "Parking" },
  { key: "renovated", label: "Renovated", category: "Condition" },
  { key: "rumpus_room", label: "Rumpus Room", category: "Interior" },
  { key: "solar_panels", label: "Solar Panels", category: "Technology" },
  { key: "spa", label: "Spa", category: "Outdoor" },
  { key: "split_system_aircon", label: "Split-System Aircon", category: "Comfort" },
  { key: "study", label: "Study", category: "Interior" },
  { key: "tennis_court", label: "Tennis Court", category: "Outdoor" },
  { key: "three_phase_power", label: "3 Phase Power", category: "Building" },
  { key: "water_tank", label: "Water Tank", category: "Sustainability" },
  { key: "workshop", label: "Workshop", category: "Building" },
  { key: "secure_parking", label: "Secure Parking", category: "Parking" },
  { key: "visitor_parking", label: "Visitor Parking", category: "Parking" },
  { key: "double_garage", label: "Double Garage", category: "Parking" },
  { key: "single_garage", label: "Single Garage", category: "Parking" },
  { key: "carport", label: "Carport", category: "Parking" },
  { key: "ducted_cooling", label: "Ducted Cooling", category: "Comfort" },
  { key: "ceiling_fans", label: "Ceiling Fans", category: "Comfort" },
  { key: "gas_heating", label: "Gas Heating", category: "Comfort" },
  { key: "hydronic_heating", label: "Hydronic Heating", category: "Comfort" },
  { key: "floorboards", label: "Floorboards", category: "Interior" },
  { key: "tiles", label: "Tiles", category: "Interior" },
  { key: "stone_benchtops", label: "Stone Benchtops", category: "Kitchen" },
  { key: "gas_cooktop", label: "Gas Cooktop", category: "Kitchen" },
  { key: "butlers_pantry", label: "Butler's Pantry", category: "Kitchen" },
  { key: "walk_in_pantry", label: "Walk-in Pantry", category: "Kitchen" },
  { key: "water_views", label: "Water Views", category: "Views" },
  { key: "river_views", label: "River Views", category: "Views" },
  { key: "mountain_views", label: "Mountain Views", category: "Views" },
  { key: "district_views", label: "District Views", category: "Views" },
  { key: "golf_course_frontage", label: "Golf Course Frontage", category: "Location" },
  { key: "waterfront", label: "Waterfront", category: "Location" },
  { key: "corner_block", label: "Corner Block", category: "Land" },
  { key: "level_block", label: "Level Block", category: "Land" },
  { key: "north_facing", label: "North Facing", category: "Aspect" },
  { key: "east_facing", label: "East Facing", category: "Aspect" },
  { key: "solar_passive", label: "Solar Passive Design", category: "Sustainability" },
  { key: "rainwater_tank", label: "Rainwater Tank", category: "Sustainability" },
  { key: "grey_water_system", label: "Grey Water System", category: "Sustainability" },
  { key: "nanny_flat", label: "Nanny Flat / Granny Flat", category: "Building" },
  { key: "home_office", label: "Home Office", category: "Interior" },
  { key: "media_room", label: "Media Room", category: "Interior" },
  { key: "wine_cellar", label: "Wine Cellar", category: "Interior" },
  { key: "sauna", label: "Sauna", category: "Outdoor" },
  { key: "outdoor_kitchen", label: "Outdoor Kitchen", category: "Outdoor" },
  { key: "fenced_pool", label: "Fenced Pool", category: "Outdoor" },
  { key: "gated_community", label: "Gated Community", category: "Security" },
  { key: "cctv", label: "CCTV", category: "Security" },
  { key: "smart_home", label: "Smart Home", category: "Technology" },
  { key: "nbn_ready", label: "NBN Ready", category: "Technology" },
];

const FEATURE_BY_KEY = new Map(LISTING_FEATURE_CATALOG.map((f) => [f.key, f]));

export function listingFeatureLabel(key: string): string {
  return FEATURE_BY_KEY.get(key)?.label ?? key.replace(/_/g, " ");
}

export function parseListingFeatureFlags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const k = item.trim();
    if (k && FEATURE_BY_KEY.has(k) && !out.includes(k)) out.push(k);
  }
  return out;
}

/** Merge listing feature flags with legacy property.features text labels. */
export function mergeListingFeatures(
  featureFlags: unknown,
  propertyFeatures?: string[] | null,
): string[] {
  const keys = parseListingFeatureFlags(featureFlags);
  const labels = keys.map((k) => listingFeatureLabel(k).toLowerCase());
  const out = [...labels];
  for (const f of propertyFeatures ?? []) {
    const n = f.trim().toLowerCase();
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}

export function groupListingFeaturesByCategory(
  selectedKeys: string[],
): Array<{ category: string; items: ListingFeatureDef[] }> {
  const selected = new Set(selectedKeys);
  const groups = new Map<string, ListingFeatureDef[]>();
  for (const def of LISTING_FEATURE_CATALOG) {
    if (!selected.has(def.key)) continue;
    const list = groups.get(def.category) ?? [];
    list.push(def);
    groups.set(def.category, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, items]) => ({ category, items }));
}

export function catalogFeaturesByCategory(): Array<{ category: string; items: ListingFeatureDef[] }> {
  const groups = new Map<string, ListingFeatureDef[]>();
  for (const def of LISTING_FEATURE_CATALOG) {
    const list = groups.get(def.category) ?? [];
    list.push(def);
    groups.set(def.category, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, items]) => ({ category, items }));
}

/** Map selected keys to human labels for property.features sync. */
export function featureKeysToPropertyLabels(keys: string[]): string[] {
  return keys.map((k) => listingFeatureLabel(k));
}

export const MARKETING_HEADLINE_MAX = 150;
export const MARKETING_DESCRIPTION_MAX = 6000;

export type ListingResourceKind = "photo" | "floorplan" | "document" | "link";

export const LISTING_RESOURCE_KINDS: Array<{ key: ListingResourceKind; label: string }> = [
  { key: "photo", label: "Photos" },
  { key: "floorplan", label: "Floorplans" },
  { key: "document", label: "Documents" },
  { key: "link", label: "Links" },
];

export function listingResourceKindLabel(kind: string): string {
  return LISTING_RESOURCE_KINDS.find((k) => k.key === kind)?.label ?? kind;
}
