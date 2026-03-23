/**
 * Print-only layout for a contact. Professional document styling for PDF / physical print.
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
import { formatAddressForPrint } from "@/lib/formatPrintAddress";

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
      <span className="print-value print-prose-inline">{value}</span>
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
  const rawAddress = contact.address_line1 || contact.city ? formatContactAddress(contact) : null;
  const addressLine = rawAddress && rawAddress !== "—" ? formatAddressForPrint(rawAddress) : null;
  const tags = getTagNames(contact);
  const category = (contact as { category?: string | null }).category?.trim();

  return (
    <div className="contact-print-document">
      <div className="print-letterhead" aria-hidden>
        <div className="print-letterhead-inner">
          <div className="print-letterhead-text">
            <span className="print-letterhead-brand">Data Dungeon</span>
            <span className="print-letterhead-sub">CRM · Contact record</span>
          </div>
        </div>
        <div className="print-letterhead-accent" />
      </div>

      <header className="print-doc-hero">
        <h1 className="print-doc-title">{contact.name ?? "Contact"}</h1>
        <p className="print-doc-subtitle">Prepared {printedAt}</p>
        <div className="print-doc-hero-badges">
          {contact.status && <span className="print-badge">{contact.status}</span>}
          {category && <span className="print-badge print-badge-muted">{category}</span>}
        </div>
      </header>

      <div className="print-doc-body">
        <Section title="Overview">
          <div className="print-overview">
            <div className="print-avatar" aria-hidden>
              {getInitials(undefined, undefined, contact.name ?? "")}
            </div>
            <div className="print-overview-content">
              <dl className="print-dl">
                {phones.length > 0 && (
                  <div className="print-dl-row">
                    <dt>Phone</dt>
                    <dd>
                      {phones.map((num, i) => (
                        <span key={i}>{formatPhoneDisplay(num)}
                          {i < phones.length - 1 ? " · " : ""}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                {emails.length > 0 && (
                  <div className="print-dl-row">
                    <dt>Email</dt>
                    <dd>
                      {emails.map((addr, i) => (
                        <span key={i}>{addr}{i < emails.length - 1 ? " · " : ""}</span>
                      ))}
                    </dd>
                  </div>
                )}
                {contact.source && (
                  <div className="print-dl-row">
                    <dt>Source</dt>
                    <dd>{contact.source}</dd>
                  </div>
                )}
              </dl>
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

        {addressLine && (
          <Section title="Contact information">
            <p className="print-address">{addressLine}</p>
          </Section>
        )}

        <Section title="Linked properties">
          {linkedProperties.length > 0 ? (
            <ul className="print-property-list">
              {linkedProperties.map((link) => {
                const addrRaw = formatPropertyAddress(link.property as any);
                const addr = formatAddressForPrint(addrRaw);
                return (
                  <li key={link.id} className="print-property-card">
                    <span className="print-property-address">{addr}</span>
                    <div className="print-property-meta">
                      {link.property.property_type && (
                        <span>{link.property.property_type}</span>
                      )}
                      {(link.property.bedrooms != null || link.property.bathrooms != null) && (
                        <span>
                          {[link.property.bedrooms != null && `${link.property.bedrooms} bed`, link.property.bathrooms != null && `${link.property.bathrooms} bath`].filter(Boolean).join(" · ")}
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
            <p className="print-muted">No properties linked.</p>
          )}
        </Section>

        <Section title="Story & intent">
          <div className="print-prose">
            <Row label="Story" value={contact.story} />
            <Row label="Pipeline stage" value={contact.pipeline_stage} />
            <Row label="Selling intentions" value={contact.selling_intentions} />
            <Row label="Current situation" value={contact.current_situation_notes} />
          </div>
        </Section>

        <Section title="Pain & pleasure points">
          <div className="print-two-col">
            <div>
              <span className="print-label">Pain points</span>
              <p className="print-value-block">{contact.pain_points?.trim() ? contact.pain_points : "—"}</p>
            </div>
            <div>
              <span className="print-label">Pleasure points</span>
              <p className="print-value-block">{contact.pleasure_points?.trim() ? contact.pleasure_points : "—"}</p>
            </div>
          </div>
        </Section>

        {contact.notes && (
          <Section title="Notes">
            <p className="print-notes print-prose-inline">{contact.notes}</p>
          </Section>
        )}

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
              <p className="print-muted">No activity recorded.</p>
            )}
          </div>
        </Section>
      </div>

      <footer className="print-doc-footer">
        <span>Data Dungeon CRM · {contact.name ?? "Contact"}</span>
        <span>Confidential · Generated {printedAt}</span>
      </footer>
    </div>
  );
}
