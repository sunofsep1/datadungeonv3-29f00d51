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
import { Search, Tag, Building2, Clock, ArrowUpDown } from "lucide-react";

export type SortOption =
  | "name-asc"
  | "name-desc"
  | "status-asc"
  | "status-desc"
  | "date-added-asc"
  | "date-added-desc"
  | "property-count-asc"
  | "property-count-desc";

export interface ContactsFilterPanelProps {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  filterStatus: string;
  onFilterStatusChange: (v: string) => void;
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
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function ContactsFilterPanel({
  searchQuery,
  onSearchChange,
  filterStatus,
  onFilterStatusChange,
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
  hasActiveFilters,
  onClearFilters,
}: ContactsFilterPanelProps) {
  return (
    <div className="space-y-6">
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

      <div>
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          Quick filters
        </Label>
        <div className="space-y-2">
          <Select value={filterStatus} onValueChange={onFilterStatusChange}>
            <SelectTrigger className="w-full bg-input border-border text-foreground">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="hot">Hot</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="cold">Cold</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="nurture">Nurture</SelectItem>
              <SelectItem value="unqualified">Unqualified</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
            </SelectContent>
          </Select>
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
              <SelectItem value="due">Due for follow-up</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="overdue">Overdue follow-up</SelectItem>
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
            <SelectItem value="status-asc">Status A–Z</SelectItem>
            <SelectItem value="status-desc">Status Z–A</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
