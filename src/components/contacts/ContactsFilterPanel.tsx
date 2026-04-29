import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Tag, Building2, Clock, ArrowUpDown, Thermometer } from "lucide-react";
import {
  LEAD_TEMPERATURES,
  TIMEFRAME_CATEGORIES,
  ROLE_CATEGORIES,
  LEAD_TEMPERATURE_LABELS,
  TIMEFRAME_LABELS,
  ROLE_CATEGORY_LABELS,
} from "@/lib/leadCategories";

export type SortOption =
  | "name-asc"
  | "name-desc"
  | "date-added-asc"
  | "date-added-desc"
  | "property-count-asc"
  | "property-count-desc";

export interface ContactsFilterPanelProps {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  filterTagIds: string[];
  onToggleTagFilter: (tagId: string) => void;
  tags: { id: string; name: string }[] | undefined;
  filterSource: string;
  onFilterSourceChange: (v: string) => void;
  distinctSources: string[];
  filterHasProperty: boolean | null;
  onFilterHasPropertyChange: (v: boolean | null) => void;
  filterLastTouched: string;
  onFilterLastTouchedChange: (v: string) => void;
  sortBy: SortOption;
  onSortChange: (v: SortOption) => void;
  filterLeadTemperature: string;
  onFilterLeadTemperatureChange: (v: string) => void;
  filterTimeframeCategory: string;
  onFilterTimeframeCategoryChange: (v: string) => void;
  filterRoleCategory: string;
  onFilterRoleCategoryChange: (v: string) => void;
  filterContactClassification: string;
  onFilterContactClassificationChange: (v: string) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  /** When "filtersOnly", search + sort are omitted (render those in the page toolbar). */
  variant?: "full" | "filtersOnly";
  /** When true, Source / Property / Last touched are omitted (e.g. shown in page quick strip). */
  omitQuickFilters?: boolean;
}

export function ContactsFilterPanel({
  searchQuery,
  onSearchChange,
  filterTagIds,
  onToggleTagFilter,
  tags,
  filterSource,
  onFilterSourceChange,
  distinctSources,
  filterHasProperty,
  onFilterHasPropertyChange,
  filterLastTouched,
  onFilterLastTouchedChange,
  sortBy,
  onSortChange,
  filterLeadTemperature,
  onFilterLeadTemperatureChange,
  filterTimeframeCategory,
  onFilterTimeframeCategoryChange,
  filterRoleCategory,
  onFilterRoleCategoryChange,
  filterContactClassification,
  onFilterContactClassificationChange,
  hasActiveFilters,
  onClearFilters,
  variant = "full",
  omitQuickFilters = false,
}: ContactsFilterPanelProps) {
  const showSearchSort = variant === "full";

  return (
    <div className="space-y-6">
      {showSearchSort ? (
        <div>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Search
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Name, email, phone..."
              className="pl-9 bg-input border-border text-foreground placeholder:text-muted-foreground"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
      ) : null}

      {!omitQuickFilters ? (
        <div>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Quick filters
          </Label>
          <div className="space-y-2">
            <Select value={filterSource} onValueChange={onFilterSourceChange}>
              <SelectTrigger className="w-full bg-input border-border text-foreground">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {distinctSources.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterHasProperty === null ? "all" : filterHasProperty ? "has" : "none"}
              onValueChange={(v) => {
                if (v === "all") onFilterHasPropertyChange(null);
                else onFilterHasPropertyChange(v === "has");
              }}
            >
              <SelectTrigger className="w-full bg-input border-border text-foreground">
                <Building2 className="w-4 h-4 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All contacts</SelectItem>
                <SelectItem value="has">Has property</SelectItem>
                <SelectItem value="none">No property</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterLastTouched} onValueChange={onFilterLastTouchedChange}>
              <SelectTrigger className="w-full bg-input border-border text-foreground">
                <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Last touched" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="stale">Not touched 30+ days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      <div>
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          Contact category (playbook)
        </Label>
        <Select value={filterContactClassification} onValueChange={onFilterContactClassificationChange}>
          <SelectTrigger className="w-full bg-input border-border text-foreground">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="top_100">Top 100</SelectItem>
            <SelectItem value="past_client">Past client</SelectItem>
            <SelectItem value="referral_partner">Referral partner</SelectItem>
            <SelectItem value="hot_lead">Hot lead</SelectItem>
            <SelectItem value="warm_lead">Warm lead</SelectItem>
            <SelectItem value="seller_nurture">Seller nurture</SelectItem>
            <SelectItem value="active_buyer">Active buyer</SelectItem>
            <SelectItem value="seller_lead">Seller lead</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          Lead classification
        </Label>
        <div className="space-y-2">
          <Select value={filterLeadTemperature} onValueChange={onFilterLeadTemperatureChange}>
            <SelectTrigger className="w-full bg-input border-border text-foreground">
              <Thermometer className="w-4 h-4 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Temperature" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All temperatures</SelectItem>
              {LEAD_TEMPERATURES.map((t) => (
                <SelectItem key={t} value={t}>
                  {LEAD_TEMPERATURE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTimeframeCategory} onValueChange={onFilterTimeframeCategoryChange}>
            <SelectTrigger className="w-full bg-input border-border text-foreground">
              <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All timeframes</SelectItem>
              {TIMEFRAME_CATEGORIES.map((t) => (
                <SelectItem key={t} value={t}>
                  {TIMEFRAME_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterRoleCategory} onValueChange={onFilterRoleCategoryChange}>
            <SelectTrigger className="w-full bg-input border-border text-foreground">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent className="max-h-[min(280px,50vh)]">
              <SelectItem value="all">All roles</SelectItem>
              {ROLE_CATEGORIES.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_CATEGORY_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          Filter by fields
        </Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 bg-input border-border text-foreground hover:bg-accent"
            >
              <Tag className="w-4 h-4" />
              Tags {filterTagIds.length ? `(${filterTagIds.length})` : ""}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto bg-popover border-border">
            {(tags ?? []).map((t) => (
              <DropdownMenuCheckboxItem
                key={t.id}
                checked={filterTagIds.includes(t.id)}
                onCheckedChange={() => onToggleTagFilter(t.id)}
                className="text-popover-foreground focus:bg-accent focus:text-foreground"
              >
                {t.name}
              </DropdownMenuCheckboxItem>
            ))}
            {(!tags || tags.length === 0) && (
              <div className="px-2 py-4 text-sm text-muted-foreground">No tags yet</div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showSearchSort ? (
        <div>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Sort
          </Label>
          <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
            <SelectTrigger className="w-full bg-input border-border text-foreground">
              <ArrowUpDown className="w-4 h-4 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Last name A–Z</SelectItem>
              <SelectItem value="name-desc">Last name Z–A</SelectItem>
              <SelectItem value="date-added-desc">Date added (newest)</SelectItem>
              <SelectItem value="date-added-asc">Date added (oldest)</SelectItem>
              <SelectItem value="property-count-desc">Properties (most)</SelectItem>
              <SelectItem value="property-count-asc">Properties (least)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-foreground hover:bg-accent"
          onClick={onClearFilters}
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}
