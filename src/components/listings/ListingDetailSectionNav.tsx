import { cn } from "@/lib/utils";

export const LISTING_DETAIL_SECTIONS = [
  { id: "listing-overview", label: "Overview" },
  { id: "listing-pricing", label: "Pricing" },
  { id: "listing-details", label: "Details" },
  { id: "listing-features", label: "Features" },
  { id: "listing-resources", label: "Resources" },
  { id: "listing-inspections", label: "Inspections" },
  { id: "listing-offers", label: "Offers" },
  { id: "listing-commission", label: "Commission" },
  { id: "listing-marketing", label: "Marketing" },
  { id: "listing-portals", label: "Portals" },
  { id: "listing-people", label: "People" },
  { id: "listing-activity", label: "Activity" },
] as const;

export type ListingDetailSectionId = (typeof LISTING_DETAIL_SECTIONS)[number]["id"];

type Props = {
  activeSection?: ListingDetailSectionId;
  onNavigate: (id: ListingDetailSectionId) => void;
  className?: string;
};

export function ListingDetailSectionNav({ activeSection, onNavigate, className }: Props) {
  return (
    <nav
      className={cn(
        "flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none",
        className,
      )}
      aria-label="Listing sections"
    >
      {LISTING_DETAIL_SECTIONS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onNavigate(id)}
          className={cn(
            "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            activeSection === id
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
          )}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

export function scrollToListingSection(id: ListingDetailSectionId) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 120;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}
