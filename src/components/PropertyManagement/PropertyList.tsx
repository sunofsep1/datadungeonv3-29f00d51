import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import type { PropertyWithLinks } from "@/hooks/useProperties";

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
  onSelectProperty?: (property: PropertyWithLinks) => void;
  onEditProperty?: (property: PropertyWithLinks, e: React.MouseEvent) => void;
  onDeleteProperty?: (property: PropertyWithLinks, e: React.MouseEvent) => void;
  showEditButton?: boolean;
  emptyMessage?: string;
  showResultCount?: boolean;
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
  onSelectProperty,
  onEditProperty,
  onDeleteProperty,
  showEditButton = false,
  emptyMessage = "No properties to show",
  showResultCount = false,
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
      <div className="text-center py-12 rounded-lg border border-white/10 bg-[#242424]/80 p-8 max-w-lg mx-auto mt-6">
        <Building2 className="w-12 h-12 mx-auto mb-4 opacity-70 text-white/60" />
        <p className="font-medium text-white mb-2">Couldn&apos;t load properties</p>
        <p className="text-sm text-white/70 mb-4">
          {error?.message ?? "Check your connection and migrations, then retry."}
        </p>
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-12 text-white/60 mt-6 rounded-lg border border-white/10 bg-[#242424]/50 p-8">
        <Building2 className="w-12 h-12 mx-auto mb-4 opacity-70 text-white/60" />
        <p className="text-white/80 font-medium mb-1">No properties to show</p>
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
      <div className="grid gap-3 mt-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {paginated.map((p) => (
          <PropertyCard
            key={p.id}
            property={p}
            onSelect={onSelectProperty ? () => onSelectProperty(p) : undefined}
            onEdit={onEditProperty ? (e) => onEditProperty(p, e) : undefined}
            onDelete={onDeleteProperty ? (e) => onDeleteProperty(p, e) : undefined}
            showEditButton={showEditButton}
          />
        ))}
      </div>
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
