import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { AvatarCircle } from "@/components/ui/avatar-circle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { Phone, Mail, Clock, MessageSquare, StickyNote, User, ExternalLink } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ContactWithMeta } from "@/hooks/useContacts";
import { getAllEmails, getAllPhones, getPrimaryEmail, getTagNames } from "@/hooks/useContacts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type StatusVariant = "hot" | "warm" | "cold" | "entered";

type ChannelItem = { type: "email" | "phone"; value: string; label: string; isPrimary: boolean };

/** Group channels by label for multi-person contacts. Returns array of { groupLabel, items }. */
function groupChannelsByPerson(
  emails: { value: string; label: string; isPrimary: boolean }[],
  phones: { value: string; label: string; isPrimary: boolean }[],
  contactName: string | null | undefined
): { groupLabel: string; items: ChannelItem[] }[] {
  const all: ChannelItem[] = [
    ...emails.map((e) => ({ ...e, type: "email" as const })),
    ...phones.map((p) => ({ ...p, type: "phone" as const })),
  ];
  if (all.length === 0) return [];

  const nameParts = contactName
    ?.split(/\s+and\s+|\s+&\s+/i)
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

  const labelToDisplayName = (label: string): string => {
    const norm = label.trim();
    if (!norm) return "Contact details";
    for (const part of nameParts) {
      if (part.toLowerCase() === norm.toLowerCase()) return part;
      if (part[0]?.toLowerCase() === norm[0]?.toLowerCase() && norm.length <= 2) return part;
      if (norm.toLowerCase() === `(${part[0]?.toLowerCase()})`) return part;
    }
    return norm;
  };

  const byLabel = new Map<string, ChannelItem[]>();
  for (const item of all) {
    const key = item.label?.trim() || "\u200B"; // empty → special key
    if (!byLabel.has(key)) byLabel.set(key, []);
    byLabel.get(key)!.push(item);
  }

  const groups = Array.from(byLabel.entries()).map(([label, items]) => ({
    groupLabel: label === "\u200B" ? "Contact details" : labelToDisplayName(label),
    items,
  }));

  if (groups.length <= 1) return groups;
  return groups.sort((a, b) => {
    const aIdx = nameParts.findIndex((p) => p.toLowerCase().startsWith(a.groupLabel.toLowerCase().slice(0, 1)));
    const bIdx = nameParts.findIndex((p) => p.toLowerCase().startsWith(b.groupLabel.toLowerCase().slice(0, 1)));
    if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
    if (aIdx >= 0) return -1;
    if (bIdx >= 0) return 1;
    return a.groupLabel.localeCompare(b.groupLabel);
  });
}

function getStatusVariant(status: string | null): StatusVariant {
  switch (status) {
    case "hot": return "hot";
    case "warm": return "warm";
    case "cold": return "cold";
    default: return "entered";
  }
}

interface ContactKeyInfoPanelProps {
  contact: ContactWithMeta;
  lastActivity: string | null;
  onViewFull: () => void;
  onAddNote: () => void;
  onSendEmail?: () => void;
  onSendSms?: (phone: string) => void;
}

export function ContactKeyInfoPanel({ contact, lastActivity, onViewFull, onAddNote, onSendEmail, onSendSms }: ContactKeyInfoPanelProps) {
  const emails = getAllEmails(contact);
  const phones = getAllPhones(contact);
  const primaryEmail = getPrimaryEmail(contact) ?? contact.email;
  const tagNames = getTagNames(contact);

  // Refresh relative time every 60s so "X minutes ago" stays current
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!lastActivity) return;
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, [lastActivity]);

  return (
    <div className="flex flex-col h-full">
      {/* Hero: avatar + name + status */}
      <div className="p-4 pb-3 border-b border-border">
        <div className="flex flex-col items-center text-center">
          <AvatarCircle
            name={contact.name}
            size="lg"
            initials={getInitials(contact.first_name, contact.last_name, contact.name)}
            className="ring-2 ring-border ring-offset-2 ring-offset-background"
          />
          <h2 className="text-lg font-semibold text-foreground mt-3 line-clamp-2 tracking-tight">
            {contact.name}
          </h2>
          <StatusBadge variant={getStatusVariant(contact.status)} className="mt-2 max-w-full min-w-0 truncate">
            <span className="truncate block">{contact.status || "lead"}</span>
          </StatusBadge>
          {contact.source && (
            <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wider">
              {contact.source}
            </p>
          )}
        </div>
      </div>

      {/* Contact channels — grouped by person when multi-owner */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <User className="w-3.5 h-3.5" />
            Contact
          </h3>
          {(() => {
            const groups = groupChannelsByPerson(emails, phones, contact.name);
            if (groups.length === 0) {
              return <p className="text-sm text-muted-foreground py-2">No contact details</p>;
            }
            return (
              <div className="space-y-4">
                {groups.map(({ groupLabel, items }) => (
                  <div key={groupLabel}>
                    {groups.length > 1 && (
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
                        {groupLabel}
                      </p>
                    )}
                    <ul className={cn("space-y-2", groups.length > 1 && "space-y-2")}>
                      {items.flatMap((item) =>
                        item.value.split(/[;,]/).map((part, i) => {
                          const v = part.trim();
                          if (!v) return null;
                          return item.type === "email" ? (
                            <li key={`email-${item.value}-${i}`} className="rounded-lg border border-border bg-muted/50 shadow-sm overflow-hidden">
                              <a
                                href={`mailto:${v}`}
                                className={cn(
                                  "flex items-center gap-2 p-2.5 transition-colors block",
                                  "text-foreground hover:bg-muted hover:text-foreground"
                                )}
                              >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
                                  <Mail className="w-3.5 h-3.5" />
                                </span>
                                <span className="flex-1 min-w-0 truncate text-sm font-medium">{v}</span>
                                {groups.length === 1 && item.label !== "Email" && (
                                  <span className="text-xs text-muted-foreground shrink-0">{item.label}</span>
                                )}
                              </a>
                            </li>
                          ) : (
                            <li key={`phone-${item.value}-${i}`} className="rounded-lg border border-border bg-muted/50 shadow-sm overflow-hidden">
                              <a
                                href={`tel:${v}`}
                                className={cn(
                                  "flex items-center gap-2 p-2.5 transition-colors block",
                                  "text-foreground hover:bg-muted hover:text-foreground"
                                )}
                              >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                                  <Phone className="w-3.5 h-3.5" />
                                </span>
                                <span className="flex-1 min-w-0 text-sm font-medium">{v}</span>
                                {groups.length === 1 && item.label !== "Phone" && (
                                  <span className="text-xs text-muted-foreground shrink-0">{item.label}</span>
                                )}
                              </a>
                            </li>
                          );
                        })
                      ).filter(Boolean)}
                    </ul>
                  </div>
                ))}
              </div>
            );
          })()}
        </section>

        {/* Meta: last activity + dates */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Activity
          </h3>
          <ul className="space-y-1">
            {lastActivity ? (
              <li>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 rounded-lg p-2 -mx-1 transition-colors cursor-default">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
                        <Clock className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-sm text-foreground">
                        {formatDistanceToNow(new Date(lastActivity), { addSuffix: true })}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    {format(new Date(lastActivity), "EEEE, MMM d, yyyy 'at' h:mm a")}
                  </TooltipContent>
                </Tooltip>
              </li>
            ) : (
              <li className="flex items-center gap-2 rounded-lg p-2 -mx-1 text-muted-foreground">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                  <Clock className="w-3.5 h-3.5" />
                </span>
                <span className="text-sm">No activity yet</span>
              </li>
            )}
            {contact.created_at && (
              <li className="flex items-center gap-2 px-2 py-1 text-[11px] text-muted-foreground">
                Created {format(new Date(contact.created_at), "MMM d, yyyy")}
              </li>
            )}
            {contact.updated_at && (
              <li className="flex items-center gap-2 px-2 py-1 text-[11px] text-muted-foreground">
                Updated {format(new Date(contact.updated_at), "MMM d, yyyy")}
              </li>
            )}
          </ul>
        </section>

        {/* Tags */}
        {tagNames.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Tags
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {tagNames.map((t) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className="text-xs font-normal bg-muted text-foreground/90 border-border hover:bg-muted/80"
                >
                  {t}
                </Badge>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Actions — compact sticky footer */}
      <div className="shrink-0 p-3 pt-2 border-t border-border bg-card/95 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {phones.length > 0 &&
            (phones.length === 1 ? (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-border text-foreground hover:bg-muted shrink-0"
                onClick={() => window.open(`tel:${phones[0].value}`)}
                title="Call"
              >
                <Phone className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-border text-foreground hover:bg-muted shrink-0"
                    title="Call"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[200px]">
                  {phones.map((p) => (
                    <DropdownMenuItem key={p.value} onClick={() => window.open(`tel:${p.value}`)}>
                      {p.label}: {p.value}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ))}
          {primaryEmail && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-border text-foreground hover:bg-muted shrink-0"
              onClick={onSendEmail ?? (() => window.open(`mailto:${primaryEmail}`))}
              title="Email"
            >
              <Mail className="w-3.5 h-3.5" />
            </Button>
          )}
          {phones.length > 0 && onSendSms &&
            (phones.length === 1 ? (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-border text-foreground hover:bg-muted shrink-0"
                onClick={() => onSendSms(phones[0].value)}
                title="Send SMS"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-border text-foreground hover:bg-muted shrink-0"
                    title="Send SMS"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[200px]">
                  {phones.map((p) => (
                    <DropdownMenuItem key={p.value} onClick={() => onSendSms(p.value)}>
                      {p.label}: {p.value}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ))}
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 border-border text-foreground hover:bg-muted h-8 text-xs"
            onClick={onAddNote}
          >
            <StickyNote className="w-3.5 h-3.5" /> Note
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 gap-1.5 h-8 text-xs bg-primary/20 text-primary hover:bg-primary/30 border-0 font-medium"
            onClick={onViewFull}
          >
            <ExternalLink className="w-3.5 h-3.5" /> Profile
          </Button>
        </div>
      </div>
    </div>
  );
}
