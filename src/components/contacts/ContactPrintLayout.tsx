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
import { cn, getInitials } from "@/lib/utils";
import { formatAddressForPrint } from "@/lib/formatPrintAddress";
import { PrintWorksheetAreas } from "@/components/print/PrintWorksheetAreas";

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

export type NurtureJourneyStepForPrint = {
  title: string;
  stepType: string | null;
};

export type NurtureJourneyForPrint = {
  enrollmentId: string;
  sequenceName: string;
  sequenceDescription: string | null;
  startedAt: string;
  nextStepAt: string | null;
  /** Index of the next step to run; steps with lower index are treated as completed. */
  currentStepIndex: number;
  totalSteps: number;
  pauseFollowupCadence: boolean;
  pauseReason: string | null;
  steps: NurtureJourneyStepForPrint[];
};

interface ContactPrintLayoutProps {
  contact: ContactWithMeta;
  linkedProperties: LinkedPropertyForPrint[];
  nurtureJourneys: NurtureJourneyForPrint[];
  /** Letterhead line under brand, e.g. "Listing briefing" for other print routes. */
  documentSubtitle?: string;
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

/** Split long notes on blank lines so pagination can break between paragraphs instead of one huge block. */
export function PrintNotesBody({ text }: { text: string }) {
  const chunks = text
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (chunks.length <= 1) {
    return <p className="print-notes print-prose-inline">{text}</p>;
  }
  return (
    <div className="print-notes-body">
      {chunks.map((chunk, i) => (
        <p key={i} className="print-notes print-notes-chunk print-prose-inline">
          {chunk}
        </p>
      ))}
    </div>
  );
}

function formatClassificationLabel(raw: string): string {
  return raw
    .trim()
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function stepTypeLabel(t: string | null): string | null {
  const s = (t ?? "").toLowerCase();
  if (s === "email") return "Email";
  if (s === "prompt") return "Prompt";
  if (s === "task") return "Task";
  return t?.trim() ? t : null;
}

export function ContactPrintLayout({
  contact,
  linkedProperties,
  nurtureJourneys,
  documentSubtitle = "Contact briefing",
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
  const leadTemp = contact.lead_temperature?.trim();
  const relCat = contact.relationship_category?.trim();
  const timeframe = contact.timeframe_category?.trim();
  const pipelineStage = contact.pipeline_stage?.trim();
  const journeyStage = contact.journey_stage?.trim();

  const worksheetContext =
    [contact.name ?? "Contact", phones[0] ? formatPhoneDisplay(phones[0]) : null].filter(Boolean).join(" · ");

  return (
    <div className="contact-print-document">
      <div className="print-letterhead" aria-hidden>
        <div className="print-letterhead-inner">
          <div className="print-letterhead-text">
            <span className="print-letterhead-brand">Data Dungeon</span>
            <span className="print-letterhead-sub">CRM · {documentSubtitle}</span>
          </div>
        </div>
        <div className="print-letterhead-accent" />
      </div>

      {/* Use div, not <header>: global @media print hides all header elements */}
      <div className="print-doc-hero" role="banner">
        <h1 className="print-doc-title">{contact.name ?? "Contact"}</h1>
        <p className="print-doc-subtitle">Prepared for appointment · {printedAt}</p>
        <div className="print-doc-hero-badges">
          {contact.status && <span className="print-badge">{contact.status}</span>}
          {category && <span className="print-badge print-badge-muted">{category}</span>}
        </div>
      </div>

      <div className="print-doc-body">
        <div className="print-brief-grid">
          <Section title="At a glance">
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
                          <span key={i}>
                            {formatPhoneDisplay(num)}
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
                          <span key={i}>
                            {addr}
                            {i < emails.length - 1 ? " · " : ""}
                          </span>
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
                      <span key={t} className="print-tag">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Section>

          <Section title="Location">
            {addressLine ? (
              <p className="print-address print-address--hero">{addressLine}</p>
            ) : (
              <p className="print-muted">No postal address on file.</p>
            )}
          </Section>
        </div>

        {(leadTemp || relCat || timeframe) && (
          <Section title="Classification snapshot">
            <div className="print-classification-chips">
              {leadTemp && <span className="print-classification-chip">{formatClassificationLabel(leadTemp)}</span>}
              {timeframe && (
                <span className="print-classification-chip print-classification-chip--muted">
                  {formatClassificationLabel(timeframe)}
                </span>
              )}
              {relCat && (
                <span className="print-classification-chip print-classification-chip--muted">
                  {formatClassificationLabel(relCat)}
                </span>
              )}
            </div>
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

        <Section title="Notes (from CRM)">
          {contact.notes?.trim() ? (
            <PrintNotesBody text={contact.notes} />
          ) : (
            <p className="print-muted">No notes in the system yet. Use the worksheet at the end for this visit.</p>
          )}
        </Section>

        <Section title="Journey & nurture sequences">
          {(pipelineStage || journeyStage) && (
            <div className="print-journey-crm print-prose">
              {pipelineStage && (
                <div className="print-row">
                  <span className="print-label">Pipeline</span>
                  <span className="print-value print-prose-inline">{pipelineStage}</span>
                </div>
              )}
              {journeyStage && (
                <div className="print-row">
                  <span className="print-label">Journey stage</span>
                  <span className="print-value print-prose-inline">{formatClassificationLabel(journeyStage)}</span>
                </div>
              )}
            </div>
          )}
          {nurtureJourneys.length === 0 ? (
            <p className="print-muted">No active nurture sequences for this contact.</p>
          ) : (
            <div className="print-nurture-journeys">
              {nurtureJourneys.map((j) => (
                <div key={j.enrollmentId} className="print-nurture-block">
                  <div className="print-nurture-header">
                    <h4 className="print-nurture-sequence-name">{j.sequenceName}</h4>
                    <p className="print-nurture-meta">
                      Started {format(new Date(j.startedAt), "d MMM yyyy")}
                      {j.totalSteps > 0 && (
                        <>
                          {" · "}
                          Step {Math.min(j.currentStepIndex + 1, j.totalSteps)} of {j.totalSteps}
                        </>
                      )}
                      {j.nextStepAt && (
                        <>
                          {" · "}
                          Next touch {format(new Date(j.nextStepAt), "d MMM yyyy, h:mm a")}
                        </>
                      )}
                    </p>
                    {j.pauseFollowupCadence && (
                      <p className="print-nurture-paused">
                        Follow-up cadence paused
                        {j.pauseReason?.trim() ? ` — ${j.pauseReason.trim()}` : ""}
                      </p>
                    )}
                  </div>
                  {j.sequenceDescription?.trim() && (
                    <p className="print-nurture-desc">{j.sequenceDescription.trim()}</p>
                  )}
                  {j.steps.length > 0 ? (
                    <ol className="print-journey-steps">
                      {j.steps.map((step, i) => {
                        const done = i < j.currentStepIndex;
                        const current = i === j.currentStepIndex;
                        const stLabel = stepTypeLabel(step.stepType);
                        return (
                          <li
                            key={`${j.enrollmentId}-${i}`}
                            className={cn(
                              "print-journey-step",
                              done && "print-journey-step--done",
                              current && "print-journey-step--current"
                            )}
                          >
                            <span className="print-journey-step-title">{step.title}</span>
                            {stLabel && <span className="print-journey-step-type">{stLabel}</span>}
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <p className="print-muted">No steps defined for this sequence.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        <PrintWorksheetAreas contextHint={worksheetContext} />
      </div>

      <footer className="print-doc-footer">
        <span>Data Dungeon CRM · {contact.name ?? "Contact"}</span>
        <span>Confidential · Generated {printedAt}</span>
      </footer>
    </div>
  );
}
