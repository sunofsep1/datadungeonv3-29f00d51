/**
 * Print-only layout for a contact. Renders a clean, professional document
 * with consistent spacing and no interactive elements. Used in print preview
 * and when printing from /contacts/:id/print.
 */
import { format } from "date-fns";
import {
  getAllEmails,
  getAllPhones,
  getTagNames,
  formatContactAddress,
  type ContactWithMeta,
} from "@/hooks/useContacts";
import { formatPhoneDisplay } from "@/lib/formatPhone";
import { formatPropertyAddress } from "@/hooks/useProperties";
import type { Interaction } from "@/hooks/useInteractions";
import { getInitials } from "@/lib/utils";

export type LinkedPropertyForPrint = {
  id: string;
  property_id: string;
  role: string | null;
  notes: string | null;
  property: {
    id: string;
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string | null;
    state?: string | null;
    postcode?: string | null;
    country?: string | null;
    property_type?: string | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    price?: number | null;
  };
};

export type AppointmentForPrint = {
  id: string;
  title: string | null;
  date: string;
  location?: string | null;
};

interface ContactPrintLayoutProps {
  contact: ContactWithMeta;
  interactions: Interaction[];
  linkedProperties: LinkedPropertyForPrint[];
  contactAppointments: AppointmentForPrint[];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="print-section">
      <h3 className="print-section-title">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "" || (typeof value === "string" && value.trim() === ""))
    return null;
  return (
    <div className="print-row">
      <span className="print-label">{label}</span>
      <span className="print-value">{value}</span>
    </div>
  );
}

export function ContactPrintLayout({
  contact,
  interactions,
  linkedProperties,
  contactAppointments,
}: ContactPrintLayoutProps) {
  const printedAt = format(new Date(), "d MMMM yyyy");
  const phones = getAllPhones(contact).flatMap((p) =>
    p.value.split(/[;,]/).map((part) => part.trim()).filter(Boolean)
  );
  const emails = getAllEmails(contact).flatMap((e) =>
    e.value.split(/[;,]/).map((part) => part.trim()).filter(Boolean)
  );
  const address = contact.address_line1 || contact.city ? formatContactAddress(contact) : null;
  const tags = getTagNames(contact);

  return (
    <div className="contact-print-document">
      <header className="print-doc-header">
        <div className="print-doc-brand">Data Dungeon</div>
        <h1 className="print-doc-title">{contact.name ?? "Contact"}</h1>
        <div className="print-doc-meta">
          <span>Contact summary</span>
          <span>Printed {printedAt}</span>
        </div>
      </header>

      <div className="print-doc-body">
        {/* Overview */}
        <Section title="Overview">
          <div className="print-overview">
            <div className="print-avatar">
              {getInitials(undefined, undefined, contact.name ?? "")}
            </div>
            <div className="print-overview-content">
              <div className="print-name-row">
                <span className="print-name">{contact.name ?? "—"}</span>
                {contact.status && (
                  <span className="print-badge">{contact.status}</span>
                )}
              </div>
              {phones.length > 0 && (
                <div className="print-chunk">
                  <span className="print-label-inline">Phone</span>
                  {phones.map((num, i) => (
                    <span key={i} className="print-value-inline">
                      {formatPhoneDisplay(num)}
                    </span>
                  ))}
                </div>
              )}
              {emails.length > 0 && (
                <div className="print-chunk">
                  <span className="print-label-inline">Email</span>
                  {emails.map((addr, i) => (
                    <span key={i} className="print-value-inline">{addr}</span>
                  ))}
                </div>
              )}
              {contact.source && (
                <div className="print-chunk">
                  <span className="print-label-inline">Source</span>
                  <span className="print-value-inline">{contact.source}</span>
                </div>
              )}
              {tags.length > 0 && (
                <div className="print-tags">
                  {tags.map((t) => (
                    <span key={t} className="print-tag">{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* Contact information (address) */}
        <Section title="Contact information">
          {address ? (
            <p className="print-address">{address}</p>
          ) : (
            <p className="print-muted">No address</p>
          )}
        </Section>

        {/* Linked properties */}
        <Section title="Linked properties">
          {linkedProperties.length > 0 ? (
            <ul className="print-property-list">
              {linkedProperties.map((link) => {
                const addr = formatPropertyAddress(link.property as any);
                return (
                  <li key={link.id} className="print-property-item">
                    <span className="print-property-address">{addr}</span>
                    <div className="print-property-meta">
                      {link.property.property_type && (
                        <span>{link.property.property_type}</span>
                      )}
                      {(link.property.bedrooms != null || link.property.bathrooms != null) && (
                        <span>
                          {[link.property.bedrooms != null && `${link.property.bedrooms} bed`, link.property.bathrooms != null && `${link.property.bathrooms} bath`].filter(Boolean).join(", ")}
                        </span>
                      )}
                      {link.property.price != null && link.property.price > 0 && (
                        <span className="print-property-price">
                          ${link.property.price.toLocaleString()}
                        </span>
                      )}
                      {link.role && <span className="print-role">{link.role}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="print-muted">No properties linked</p>
          )}
        </Section>

        {/* Story & intent */}
        <Section title="Story & intent">
          <Row label="Story" value={contact.story} />
          <Row label="Pipeline stage" value={contact.pipeline_stage} />
          <Row label="Selling intentions" value={contact.selling_intentions} />
          <Row label="Current situation" value={contact.current_situation_notes} />
        </Section>

        {/* Pain & pleasure */}
        <Section title="Pain & pleasure points">
          <div className="print-two-col">
            <div>
              <span className="print-label">Pain points</span>
              <p className="print-value-block">{contact.pain_points || "—"}</p>
            </div>
            <div>
              <span className="print-label">Pleasure points</span>
              <p className="print-value-block">{contact.pleasure_points || "—"}</p>
            </div>
          </div>
        </Section>

        {/* Notes */}
        {contact.notes && (
          <Section title="Notes">
            <p className="print-notes">{contact.notes}</p>
          </Section>
        )}

        {/* Activity timeline */}
        <Section title="Activity timeline">
          <div className="print-activity-list">
            {contactAppointments.map((apt) => (
              <div key={apt.id} className="print-activity-item">
                <span className="print-activity-type">Appointment</span>
                <span className="print-activity-title">{apt.title ?? "—"}</span>
                <span className="print-activity-meta">
                  {format(new Date(apt.date), "d MMM yyyy, h:mm a")}
                  {apt.location ? ` · ${apt.location}` : ""}
                </span>
              </div>
            ))}
            {interactions.map((i) => (
              <div key={i.id} className="print-activity-item">
                <span className="print-activity-type">{i.type}</span>
                {i.subject && <span className="print-activity-title">{i.subject}</span>}
                {i.body && <span className="print-activity-body">{i.body}</span>}
                <span className="print-activity-meta">
                  {format(new Date(i.timestamp), "d MMM yyyy, h:mm a")}
                  {i.channel ? ` · ${i.channel}` : ""}
                </span>
              </div>
            ))}
            {interactions.length === 0 && contactAppointments.length === 0 && (
              <p className="print-muted">No activity yet</p>
            )}
          </div>
        </Section>
      </div>

      <footer className="print-doc-footer">
        <span>Data Dungeon CRM · {contact.name ?? "Contact"}</span>
        <span>Confidential</span>
      </footer>
    </div>
  );
}
