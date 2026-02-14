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
import { Phone, Mail, Clock, MessageSquare, StickyNote, User, ExternalLink } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ContactWithMeta } from "@/hooks/useContacts";
import { getAllEmails, getAllPhones, getPrimaryEmail, getTagNames } from "@/hooks/useContacts";

export type StatusVariant = "hot" | "warm" | "cold" | "entered";

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

  return (
    <div className="flex flex-col h-full">
      {/* Hero: avatar + name + status */}
      <div className="p-5 pb-4 border-b border-white/10">
        <div className="flex flex-col items-center text-center">
          <AvatarCircle
            name={contact.name}
            size="lg"
            initials={getInitials(contact.first_name, contact.last_name, contact.name)}
            className="ring-2 ring-white/10 ring-offset-2 ring-offset-[#242424]"
          />
          <h2 className="text-lg font-semibold text-foreground mt-4 line-clamp-2 tracking-tight">
            {contact.name}
          </h2>
          <StatusBadge variant={getStatusVariant(contact.status)} className="mt-2">
            {contact.status || "lead"}
          </StatusBadge>
          {contact.source && (
            <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wider">
              {contact.source}
            </p>
          )}
        </div>
      </div>

      {/* Contact channels — scannable list */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <User className="w-3.5 h-3.5" />
            Contact
          </h3>
          <ul className="space-y-2">
            {emails.map((e) => (
              <li key={e.value}>
                <a
                  href={`mailto:${e.value}`}
                  className={cn(
                    "flex items-center gap-3 rounded-lg p-2.5 -mx-1 transition-colors",
                    "text-foreground hover:bg-white/10 hover:text-foreground"
                  )}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
                    <Mail className="w-4 h-4" />
                  </span>
                  <span className="flex-1 min-w-0 truncate text-sm font-medium">{e.value}</span>
                  {e.label !== "Email" && (
                    <span className="text-xs text-muted-foreground shrink-0">{e.label}</span>
                  )}
                </a>
              </li>
            ))}
            {phones.map((p) => (
              <li key={p.value}>
                <a
                  href={`tel:${p.value}`}
                  className={cn(
                    "flex items-center gap-3 rounded-lg p-2.5 -mx-1 transition-colors",
                    "text-foreground hover:bg-white/10 hover:text-foreground"
                  )}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Phone className="w-4 h-4" />
                  </span>
                  <span className="flex-1 min-w-0 text-sm font-medium">{p.value}</span>
                  {p.label !== "Phone" && (
                    <span className="text-xs text-muted-foreground shrink-0">{p.label}</span>
                  )}
                </a>
              </li>
            ))}
            {emails.length === 0 && phones.length === 0 && (
              <li className="text-sm text-muted-foreground py-2">No contact details</li>
            )}
          </ul>
        </section>

        {/* Meta: dates + last activity */}
        <section className="rounded-lg bg-white/[0.04] border border-white/5 p-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Activity
          </h3>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {contact.created_at && (
              <li>Created {format(new Date(contact.created_at), "MMM d, yyyy")}</li>
            )}
            {contact.updated_at && (
              <li>Updated {format(new Date(contact.updated_at), "MMM d, yyyy")}</li>
            )}
            {lastActivity && (
              <li className="flex items-center gap-2 pt-1 border-t border-white/5 mt-1">
                <Clock className="w-3.5 h-3.5 text-primary/80" />
                Last activity {formatDistanceToNow(new Date(lastActivity), { addSuffix: true })}
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
                  className="text-xs font-normal bg-white/10 text-foreground/90 border-white/10 hover:bg-white/15"
                >
                  {t}
                </Badge>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Actions — sticky at bottom */}
      <div className="shrink-0 p-4 pt-3 border-t border-white/10 bg-[#1e1e1e]/80 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {phones.length > 0 &&
            (phones.length === 1 ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-white/20 text-foreground hover:bg-white/10 hover:text-foreground h-9"
                onClick={() => window.open(`tel:${phones[0].value}`)}
              >
                <Phone className="w-4 h-4" /> Call
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-white/20 text-foreground hover:bg-white/10 hover:text-foreground h-9"
                  >
                    <Phone className="w-4 h-4" /> Call
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
              size="sm"
              className="gap-2 border-white/20 text-foreground hover:bg-white/10 hover:text-foreground h-9"
              onClick={onSendEmail ?? (() => window.open(`mailto:${primaryEmail}`))}
            >
              <Mail className="w-4 h-4" /> Email
            </Button>
          )}
        </div>
        {phones.length > 0 && onSendSms &&
          (phones.length === 1 ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 border-white/20 text-foreground hover:bg-white/10 hover:text-foreground h-9"
              onClick={() => onSendSms(phones[0].value)}
            >
              <MessageSquare className="w-4 h-4" /> Send SMS
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 border-white/20 text-foreground hover:bg-white/10 hover:text-foreground h-9"
                >
                  <MessageSquare className="w-4 h-4" /> Send SMS
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
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 border-white/20 text-foreground hover:bg-white/10 hover:text-foreground h-9"
          onClick={onAddNote}
        >
          <StickyNote className="w-4 h-4" /> Add note
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="w-full gap-2 h-9 bg-primary/20 text-primary hover:bg-primary/30 border-0 font-medium"
          onClick={onViewFull}
        >
          <ExternalLink className="w-4 h-4" /> View full profile
        </Button>
      </div>
    </div>
  );
}
