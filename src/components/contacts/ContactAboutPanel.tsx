import { MapPin } from "lucide-react";
import { formatContactAddress } from "@/hooks/useContacts";
import type { ContactWithMeta } from "@/hooks/useContacts";

interface ContactAboutPanelProps {
  contact: ContactWithMeta;
}

export function ContactAboutPanel({ contact }: ContactAboutPanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white/80 uppercase mb-2">Contact information</h3>
        {(contact.address_line1 || contact.city) ? (
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-white/60 mt-0.5 shrink-0" />
            <p className="text-sm text-white">{formatContactAddress(contact)}</p>
          </div>
        ) : (
          <p className="text-sm text-white/60">No address</p>
        )}
      </div>
      {contact.story && (
        <div>
          <h3 className="text-sm font-semibold text-white/80 uppercase mb-2">Story</h3>
          <p className="text-sm text-white whitespace-pre-wrap">{contact.story}</p>
        </div>
      )}
      {contact.pipeline_stage && (
        <div>
          <h3 className="text-sm font-semibold text-white/80 uppercase mb-2">Pipeline stage</h3>
          <p className="text-sm text-white">{contact.pipeline_stage}</p>
        </div>
      )}
      {contact.selling_intentions && (
        <div>
          <h3 className="text-sm font-semibold text-white/80 uppercase mb-2">Selling intentions</h3>
          <p className="text-sm text-white whitespace-pre-wrap">{contact.selling_intentions}</p>
        </div>
      )}
      {contact.current_situation_notes && (
        <div>
          <h3 className="text-sm font-semibold text-white/80 uppercase mb-2">Current situation</h3>
          <p className="text-sm text-white whitespace-pre-wrap">{contact.current_situation_notes}</p>
        </div>
      )}
      {contact.pain_points && (
        <div>
          <h3 className="text-sm font-semibold text-white/80 uppercase mb-2">Pain points</h3>
          <p className="text-sm text-white whitespace-pre-wrap">{contact.pain_points}</p>
        </div>
      )}
      {contact.pleasure_points && (
        <div>
          <h3 className="text-sm font-semibold text-white/80 uppercase mb-2">Pleasure points</h3>
          <p className="text-sm text-white whitespace-pre-wrap">{contact.pleasure_points}</p>
        </div>
      )}
      {contact.notes && (
        <div>
          <h3 className="text-sm font-semibold text-white/80 uppercase mb-2">Notes</h3>
          <p className="text-sm text-white whitespace-pre-wrap">{contact.notes}</p>
        </div>
      )}
    </div>
  );
}
