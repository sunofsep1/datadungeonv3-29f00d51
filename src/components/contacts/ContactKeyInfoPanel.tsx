import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import { AvatarCircle } from "@/components/ui/avatar-circle";
import { Phone, Mail, Clock, MessageSquare } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { getInitials } from "@/lib/utils";
import type { ContactWithMeta } from "@/hooks/useContacts";
import { getPrimaryEmail, getPrimaryPhone, getTagNames } from "@/hooks/useContacts";

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
}

export function ContactKeyInfoPanel({ contact, lastActivity, onViewFull, onAddNote, onSendEmail }: ContactKeyInfoPanelProps) {
  const email = getPrimaryEmail(contact) ?? contact.email;
  const phone = getPrimaryPhone(contact) ?? contact.phone;

  return (
    <div className="p-4 md:p-5 space-y-5">
      <div className="flex flex-col items-center text-center">
        <AvatarCircle
          name={contact.name}
          size="lg"
          initials={getInitials(contact.first_name, contact.last_name, contact.name)}
        />
        <h2 className="text-base font-semibold text-white mt-3 line-clamp-2">{contact.name}</h2>
        <StatusBadge variant={getStatusVariant(contact.status)} className="mt-1.5">
          {contact.status || "lead"}
        </StatusBadge>
      </div>
      <div className="space-y-3 text-sm">
        {email && (
          <a
            href={`mailto:${email}`}
            className="flex items-center gap-2.5 text-white/90 hover:text-white transition-colors"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10">
              <Mail className="w-4 h-4 text-white/70" />
            </span>
            <span className="truncate">{email}</span>
          </a>
        )}
        {phone && (
          <a
            href={`tel:${phone}`}
            className="flex items-center gap-2.5 text-white/90 hover:text-white transition-colors"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10">
              <Phone className="w-4 h-4 text-white/70" />
            </span>
            <span>{phone}</span>
          </a>
        )}
        {contact.source && (
          <div className="pt-1">
            <span className="text-white/50 text-xs font-medium uppercase tracking-wide">Source</span>
            <p className="text-white font-medium mt-0.5">{contact.source}</p>
          </div>
        )}
      </div>
      <Separator className="bg-white/10" />
      <div className="space-y-1.5 text-xs text-white/50">
        {contact.created_at && (
          <p>Created {format(new Date(contact.created_at), "MMM d, yyyy")}</p>
        )}
        {contact.updated_at && (
          <p>Updated {format(new Date(contact.updated_at), "MMM d, yyyy")}</p>
        )}
        {lastActivity && (
          <p className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-white/40" />
            Last activity {formatDistanceToNow(new Date(lastActivity), { addSuffix: true })}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {phone && (
          <Button variant="outline" size="sm" className="gap-1.5 border-white/20 text-white/90 hover:bg-white/10 hover:text-white" onClick={() => window.open(`tel:${phone}`)}>
            <Phone className="w-3.5 h-3.5" /> Call
          </Button>
        )}
        {email && (
          <Button variant="outline" size="sm" className="gap-1.5 border-white/20 text-white/90 hover:bg-white/10 hover:text-white" onClick={onSendEmail ?? (() => window.open(`mailto:${email}`))}>
            <Mail className="w-3.5 h-3.5" /> Email
          </Button>
        )}
        <Button variant="outline" size="sm" className="gap-1.5 border-white/20 text-white/90 hover:bg-white/10 hover:text-white col-span-2" onClick={onAddNote}>
          <MessageSquare className="w-3.5 h-3.5" /> Add note
        </Button>
        <Button variant="secondary" size="sm" className="gap-1.5 col-span-2 bg-white/10 text-white hover:bg-white/15 border-0" onClick={onViewFull}>
          View full profile
        </Button>
      </div>
      {getTagNames(contact).length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {getTagNames(contact).map((t) => (
            <Badge key={t} variant="secondary" className="text-xs font-normal bg-white/10 text-white/80 border-0">{t}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}
