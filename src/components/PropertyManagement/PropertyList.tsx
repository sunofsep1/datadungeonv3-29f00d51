import { Building2, MapPin, Pencil, Trash2, ChevronRight, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { PropertyCard } from "./PropertyCard";
import { formatPropertyAddress, type PropertyWithLinks } from "@/hooks/useProperties";
import { cn } from "@/lib/utils";

export type PropertyViewMode = "grid" | "list";

interface PropertyListProps {
  properties: PropertyWithLinks[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  itemsPerPage?: number;
  selectedPropertyIds?: Set<string>;
  onToggleSelect?: (property: PropertyWithLinks) => void;
  onToggleSelectAll?: (pageProperties: PropertyWithLinks[]) => void;
  onSelectProperty?: (property: PropertyWithLinks) => void;
  onEditProperty?: (property: PropertyWithLinks, e: React.MouseEvent) => void;
  onDeleteProperty?: (property: PropertyWithLinks, e: React.MouseEvent) => void;
  showEditButton?: boolean;
  emptyMessage?: string;
  showResultCount?: boolean;
  viewMode?: PropertyViewMode;
}

const DEFAULT_ITEMS_PER_PAGE = 20;

export function PropertyList({
  properties,
  isLoading = false,
  isError = false,
  error = null,
  onRetry,
  currentPage = 1,
  totalPages: totalPagesProp,
  onPageChange,
  itemsPerPage = DEFAULT_ITEMS_PER_PAGE,
  selectedPropertyIds,
  onToggleSelect,
  onToggleSelectAll,
  onSelectProperty,
  onEditProperty,
  onDeleteProperty,
  showEditButton = false,
  emptyMessage = "No properties to show",
  showResultCount = false,
  viewMode = "grid",
}: PropertyListProps) {
  const totalPages =
    totalPagesProp ?? Math.max(1, Math.ceil(properties.length / itemsPerPage));
  const start = (currentPage - 1) * itemsPerPage;
  const paginated = properties.slice(start, start + itemsPerPage);

  if (isLoading) {
    return (
      <div className="space-y-3 mt-6">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12 rounded-lg border border-border bg-card/80 p-8 max-w-lg mx-auto mt-6">
        <Building2 className="w-12 h-12 mx-auto mb-4 opacity-70 text-muted-foreground" />
        <p className="font-medium text-foreground mb-2">Couldn&apos;t load properties</p>
        <p className="text-sm text-muted-foreground mb-4">
          {error?.message ?? "Check your connection and migrations, then retry."}
        </p>
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            className="border-border text-foreground hover:bg-muted"
          >
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground mt-6 rounded-lg border border-border bg-card/50 p-8">
        <Building2 className="w-12 h-12 mx-auto mb-4 opacity-70 text-muted-foreground" />
        <p className="text-foreground font-medium mb-1">No properties to show</p>
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {showResultCount && (
        <p className="text-sm text-muted-foreground mb-3 mt-4">
          Showing {start + 1}–
          {Math.min(start + itemsPerPage, properties.length)} of {properties.length}{" "}
          properties
        </p>
      )}
      {viewMode === "list" ? (
        <div className="rounded-lg border border-border bg-card overflow-hidden mt-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {onToggleSelectAll && (
                    <th className="w-[1%] py-2.5 px-3 md:py-2 md:px-4" aria-label="Select">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSelectAll(paginated);
                        }}
                        aria-label={paginated.every((p) => selectedPropertyIds?.has(p.id)) ? "Deselect all on page" : "Select all on page"}
                      >
                        {paginated.length > 0 && paginated.every((p) => selectedPropertyIds?.has(p.id)) ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </Button>
                    </th>
                  )}
                  <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium">Address</th>
                  <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium hidden sm:table-cell w-[100px]">Type</th>
                  <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium hidden md:table-cell w-[80px]">Beds</th>
                  <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium hidden md:table-cell w-[80px]">Baths</th>
                  <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium w-[110px]">Price</th>
                  <th className="text-left py-2.5 px-3 md:py-2 md:px-4 font-medium hidden lg:table-cell">Owners</th>
                  <th className="w-[1%] py-2.5 px-3 md:py-2 md:px-4" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {paginated.map((p) => (
                  <tr
                    key={p.id}
                    className={cn(
                      "group border-b border-border/60 last:border-b-0 hover:bg-muted/40 transition-colors cursor-pointer",
                      "align-middle"
                    )}
                    onClick={() => onSelectProperty ? onSelectProperty(p) : undefined}
                  >
                    {onToggleSelect && (
                      <td
                        className="py-2 px-3 md:py-2 md:px-4 w-[1%]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSelect(p);
                          }}
                          aria-label={selectedPropertyIds?.has(p.id) ? "Deselect" : "Select"}
                        >
                          {selectedPropertyIds?.has(p.id) ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </Button>
                      </td>
                    )}
                    <td className="py-2 px-3 md:py-2 md:px-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-teal/20 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-4 h-4 text-teal" />
                        </div>
                        <span className="font-medium text-foreground truncate">
                          {formatPropertyAddress(p) || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-3 md:py-2 md:px-4 hidden sm:table-cell">
                      {p.property_type ? (
                        <Badge variant="secondary" className="text-xs font-normal capitalize">
                          {p.property_type}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 px-3 md:py-2 md:px-4 text-muted-foreground hidden md:table-cell">
                      {p.bedrooms != null ? p.bedrooms : "—"}
                    </td>
                    <td className="py-2 px-3 md:py-2 md:px-4 text-muted-foreground hidden md:table-cell">
                      {p.bathrooms != null ? p.bathrooms : "—"}
                    </td>
                    <td className="py-2 px-3 md:py-2 md:px-4 font-medium text-foreground">
                      {(p.price_listed ?? p.price ?? 0) > 0
                        ? `$${(p.price_listed ?? p.price ?? 0).toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="py-2 px-3 md:py-2 md:px-4 text-muted-foreground text-xs hidden lg:table-cell max-w-[180px] truncate">
                      {(p.contact_property_links ?? []).length > 0
                        ? (p.contact_property_links ?? [])
                            .filter((l) => l.role === "owner" || !l.role)
                            .map((l) => (l.contacts as { name?: string } | null)?.name ?? "—")
                            .filter(Boolean)
                            .join(", ") || "—"
                        : "—"}
                    </td>
                    <td className="py-2 px-3 md:py-2 md:px-4 w-[1%] whitespace-nowrap">
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {showEditButton && onEditProperty && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditProperty(p, e);
                            }}
                            aria-label="Edit property"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        {showEditButton && onDeleteProperty && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteProperty(p, e);
                            }}
                            aria-label="Delete property"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 mt-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {paginated.map((p) => (
            <PropertyCard
              key={p.id}
              property={p}
              selected={selectedPropertyIds?.has(p.id)}
              onToggleSelect={onToggleSelect ? () => onToggleSelect(p) : undefined}
              onSelect={onSelectProperty ? () => onSelectProperty(p) : undefined}
              onEdit={onEditProperty ? (e) => onEditProperty(p, e) : undefined}
              onDelete={onDeleteProperty ? (e) => onDeleteProperty(p, e) : undefined}
              showEditButton={showEditButton}
            />
          ))}
        </div>
      )}
      {totalPages > 1 && onPageChange && (
        <Pagination className="mt-6">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                className={
                  currentPage === 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (page) => {
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => onPageChange(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }
                if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }
                return null;
              }
            )}
            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  onPageChange(Math.min(totalPages, currentPage + 1))
                }
                className={
                  currentPage === totalPages
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </>
  );
}
