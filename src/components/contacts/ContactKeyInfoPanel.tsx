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
}

export function ContactKeyInfoPanel({ contact, lastActivity, onViewFull, onAddNote }: ContactKeyInfoPanelProps) {
  const email = getPrimaryEmail(contact) ?? contact.email;
  const phone = getPrimaryPhone(contact) ?? contact.phone;

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col items-center text-center">
        <AvatarCircle
          name={contact.name}
          size="lg"
          initials={getInitials(contact.first_name, contact.last_name, contact.name)}
        />
        <h2 className="text-lg font-semibold text-white mt-3">{contact.name}</h2>
        <StatusBadge variant={getStatusVariant(contact.status)} className="mt-1">
          {contact.status || "lead"}
        </StatusBadge>
      </div>
      <div className="space-y-2 text-sm">
        {email && (
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-white/60 shrink-0" />
            <span className="text-white truncate">{email}</span>
          </div>
        )}
        {phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-white/60 shrink-0" />
            <span className="text-white">{phone}</span>
          </div>
        )}
        {contact.source && (
          <div>
            <span className="text-white/60 text-xs uppercase">Source</span>
            <p className="text-white font-medium">{contact.source}</p>
          </div>
        )}
      </div>
      <Separator className="bg-white/10" />
      <div className="space-y-1 text-xs text-white/60">
        {contact.created_at && (
          <p>Created {format(new Date(contact.created_at), "MMM d, yyyy")}</p>
        )}
        {contact.updated_at && (
          <p>Updated {format(new Date(contact.updated_at), "MMM d, yyyy")}</p>
        )}
        {lastActivity && (
          <p className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last activity {formatDistanceToNow(new Date(lastActivity), { addSuffix: true })}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {phone && (
          <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => window.open(`tel:${phone}`)}>
            <Phone className="w-3.5 h-3.5" /> Call
          </Button>
        )}
        {email && (
          <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => window.open(`mailto:${email}`)}>
            <Mail className="w-3.5 h-3.5" /> Email
          </Button>
        )}
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onAddNote}>
          <MessageSquare className="w-3.5 h-3.5" /> Add note
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 w-full" onClick={onViewFull}>
          View full
        </Button>
      </div>
      {getTagNames(contact).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {getTagNames(contact).map((t) => (
            <Badge key={t} variant="secondary" className="text-xs font-normal">{t}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}
