import { Clock, MapPin, MessageSquare, Phone, CheckSquare, Tag } from "lucide-react";
import { format, isValid } from "date-fns";
import { Button } from "@/components/ui/button";
import { AvatarCircle } from "@/components/ui/avatar-circle";
import { cn, getInitials } from "@/lib/utils";
import {
  getContactDisplayName,
  getLinkedPropertyAddress,
  getPrimaryPhone,
  getTagNames,
  type ContactWithMeta,
} from "@/hooks/useContacts";
import { getDaysSinceLastTouch } from "@/lib/contactLastTouch";

type Props = {
  contact: ContactWithMeta;
  categoryLabel?: string | null;
  categoryDotClass?: string | null;
  selected?: boolean;
  onOpen: () => void;
  onLogTouch: () => void;
  onSms: () => void;
};

function formatLastTouch(days: number | null): string {
  if (days == null) return "No touch logged";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function normalizeTemperature(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

function temperatureMeta(contact: ContactWithMeta): { label: string; pillClass: string } | null {
  const t = normalizeTemperature(contact.lead_temperature);
  if (t.includes("hot")) {
    return {
      label: "Hot",
      pillClass: "border-amber-400/50 bg-amber-500/15 text-amber-800 dark:text-amber-200",
    };
  }
  if (t.includes("warm")) {
    return {
      label: "Warm",
      pillClass: "border-primary/40 bg-primary/10 text-primary",
    };
  }
  if (t.includes("cold")) {
    return {
      label: "Cold",
      pillClass: "border-border bg-muted/40 text-muted-foreground",
    };
  }
  return null;
}

function avatarRing(contact: ContactWithMeta): string {
  const t = normalizeTemperature(contact.lead_temperature);
  if (t.includes("hot")) return "ring-2 ring-amber-400/80";
  if (t.includes("warm")) return "ring-2 ring-primary/60";
  if (t.includes("cold")) return "ring-2 ring-border";
  return "ring-2 ring-border/60";
}

function getLocationLine(contact: ContactWithMeta): string | null {
  const links = contact.contact_property_links ?? [];
  const linkedAddress = getLinkedPropertyAddress(contact).trim();
  if (linkedAddress) {
    const short = linkedAddress.split(",")[0]?.trim() || linkedAddress;
    return links.length > 1 ? `${short} (+${links.length - 1})` : short;
  }
  const suburb = contact.suburb?.trim();
  const city = contact.city?.trim();
  if (suburb && city && suburb.toLowerCase() !== city.toLowerCase()) return `${suburb}, ${city}`;
  return suburb || city || null;
}

export function ContactThumbnailCard({
  contact,
  categoryLabel,
  categoryDotClass,
  selected,
  onOpen,
  onLogTouch,
  onSms,
}: Props) {
  const displayName = getContactDisplayName(contact);
  const initials = getInitials(undefined, undefined, displayName);
  const daysSinceTouch = getDaysSinceLastTouch(contact);
  const phone = getPrimaryPhone(contact);
  const company = contact.company_name?.trim();
  const score = contact.lead_score;
  const tagNames = getTagNames(contact);
  const location = getLocationLine(contact);
  const temperature = temperatureMeta(contact);

  const nextTouchRaw = contact.next_touch_date;
  const nextTouch = nextTouchRaw ? new Date(nextTouchRaw) : null;
  const now = new Date();
  const hasValidNextTouch = Boolean(nextTouch && isValid(nextTouch));
  const isOverdueByNextTouch = Boolean(hasValidNextTouch && nextTouch!.getTime() < now.getTime());
  const isOverdueForTouch = isOverdueByNextTouch || (daysSinceTouch != null && daysSinceTouch >= 14);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        selected && "border-primary ring-1 ring-primary/40",
        isOverdueByNextTouch && "border-l-[3px] border-l-amber-400",
      )}
    >
      <div className="relative flex flex-col items-center bg-gradient-to-b from-muted/25 via-muted/10 to-card px-4 pb-3 pt-5">
        {temperature ? (
          <span
            className={cn(
              "absolute left-2 top-2 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none",
              temperature.pillClass,
            )}
          >
            {temperature.label}
          </span>
        ) : null}
        {score != null ? (
          <span className="absolute right-2 top-2 rounded-full border border-border/70 bg-background/80 px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
            {score}
          </span>
        ) : null}
        <AvatarCircle
          name={displayName}
          initials={initials}
          size="lg"
          variant="duotone"
          className={cn("h-14 w-14 text-base shadow-md", avatarRing(contact))}
        />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-3 pb-3 pt-2">
        <p className="flex items-start justify-center gap-1.5 px-1 text-sm font-semibold leading-snug text-foreground">
          {categoryDotClass ? (
            <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", categoryDotClass)} aria-hidden />
          ) : null}
          <span className="line-clamp-2 min-w-0 text-center">{displayName}</span>
          {isOverdueForTouch ? (
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
              title={isOverdueByNextTouch ? "Next touch overdue" : "14+ days since last touch"}
            />
          ) : null}
        </p>
        {company ? (
          <p className="line-clamp-1 text-center text-[11px] text-muted-foreground">{company}</p>
        ) : null}
        {categoryLabel ? (
          <p className="text-center">
            <span className="inline-block max-w-full truncate rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">
              {categoryLabel}
            </span>
          </p>
        ) : null}
        {location ? (
          <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0 opacity-70" />
            <span className="line-clamp-1">{location}</span>
          </p>
        ) : null}
        {tagNames.length > 0 ? (
          <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
            <Tag className="h-3 w-3 shrink-0 opacity-70" />
            <span className="max-w-[72%] truncate rounded-full border border-border/60 bg-muted/25 px-1.5 py-0.5">
              {tagNames[0]}
            </span>
            {tagNames.length > 1 ? <span className="shrink-0 tabular-nums">+{tagNames.length - 1}</span> : null}
          </p>
        ) : null}
        <div className="flex flex-col items-center gap-0.5 text-[11px] text-muted-foreground">
          <p className="flex items-center justify-center gap-1">
            <Clock className="h-3 w-3 shrink-0 opacity-70" />
            {formatLastTouch(daysSinceTouch)}
          </p>
          {hasValidNextTouch ? (
            <p
              className={cn(
                "tabular-nums",
                isOverdueByNextTouch && "font-medium text-amber-700 dark:text-amber-300",
              )}
            >
              {isOverdueByNextTouch ? "Next touch overdue" : `Next ${format(nextTouch!, "d MMM")}`}
            </p>
          ) : null}
        </div>
      </div>

      <div
        className="flex justify-center gap-0.5 border-t border-border/60 bg-muted/20 px-2 py-1.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Log touch" onClick={onLogTouch}>
          <Phone className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title={phone ? "SMS" : "Log touch"}
          onClick={onSms}
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Open contact" onClick={onOpen}>
          <CheckSquare className="h-3.5 w-3.5" />
        </Button>
      </div>
    </button>
  );
}
