/**
 * Print-only layout for a contact. Professional document styling for PDF / physical print.
 */
import { format, isValid, parseISO } from "date-fns";
import {
  getAllEmails,
  getAllPhones,
  getTagNames,
  formatContactAddress,
  type ContactWithMeta,
} from "@/hooks/useContacts";
import { formatPhoneDisplay } from "@/lib/formatPhone";
import { formatPropertyAddress, type Property } from "@/hooks/useProperties";
import { cn } from "@/lib/utils";
import { formatAddressForPrint } from "@/lib/formatPrintAddress";
import type { ContactUrgencyResult } from "@/lib/contactUrgency";

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
  /** When true, include date of birth on the printout (off by default for privacy). Use `?dob=1` on the print URL. */
  includeDateOfBirth?: boolean;
  /** Optional client-brief blocks (computed on print route). */
  printBrief?: {
    classificationLabel: string | null;
    urgency: ContactUrgencyResult | null;
    nextTouchDisplay: string | null;
    activeNurtureHeadline: string | null;
    talkingPointTitles: string[];
    lastTouchSnapshot: string | null;
    nurtureSnapshot: string | null;
  };
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
  includeDateOfBirth = false,
  printBrief,
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
  const dobRaw = (contact as { date_of_birth?: string | null }).date_of_birth?.trim();
  let dobDisplay: string | null = null;
  if (includeDateOfBirth && dobRaw) {
    const d = parseISO(`${dobRaw}T12:00:00`);
    dobDisplay = isValid(d) ? format(d, "d MMMM yyyy") : dobRaw;
  }
  const category = (contact as { category?: string | null }).category?.trim();
  const leadTemp = contact.lead_temperature?.trim();
  const relCat = contact.relationship_category?.trim();
  const timeframe = contact.timeframe_category?.trim();
  const pipelineStage = contact.pipeline_stage?.trim();
  const journeyStage = contact.journey_stage?.trim();

  const hasCoreContactInfo = phones.length > 0 || emails.length > 0;
  const hygieneFlags = [
    !hasCoreContactInfo ? "Missing phone/email details." : null,
    !addressLine ? "Missing postal address." : null,
    !printBrief?.nextTouchDisplay ? "No next touch date set." : null,
    nurtureJourneys.length === 0 ? "No active nurture sequence." : null,
    !tags.length ? "No tags applied (classification may be weak)." : null,
  ].filter(Boolean) as string[];
  const actionQueue = [
    printBrief?.nextTouchDisplay
      ? `Complete next touch due: ${printBrief.nextTouchDisplay}.`
      : "Set and schedule the next touch date.",
    printBrief?.activeNurtureHeadline
      ? `Advance nurture step: ${printBrief.activeNurtureHeadline}.`
      : "Assign this contact into a nurture sequence.",
    printBrief?.lastTouchSnapshot
      ? `Confirm this activity still reflects current intent (${printBrief.lastTouchSnapshot}).`
      : "Log a fresh touchpoint summary after next interaction.",
    hasCoreContactInfo ? "Verify best contact channel (phone/email) before follow-up." : "Capture missing contact details before outreach.",
  ];
  const nextNurtureDue = nurtureJourneys
    .map((j) => (j.nextStepAt ? new Date(j.nextStepAt) : null))
    .filter((d): d is Date => Boolean(d) && !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())[0];

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
        <p className="print-doc-subtitle">Queensland Sotheby's International Realty · Greg Leigh · {printedAt}</p>
        <div className="print-doc-hero-badges">
          {contact.status && <span className="print-badge">{contact.status}</span>}
          {category && <span className="print-badge print-badge-muted">{category}</span>}
          <span className="print-badge print-badge-muted">Generated by Vesper style</span>
        </div>
      </div>

      <div className="print-doc-body">
        <section className="print-section">
          <h3 className="print-section-title">Executive summary</h3>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
            <div className="rounded border border-border bg-background px-2 py-1.5">
              <div className="text-[10px] uppercase text-muted-foreground">Status</div>
              <div className="font-semibold">{printBrief?.classificationLabel ?? category ?? "—"}</div>
            </div>
            <div className="rounded border border-border bg-background px-2 py-1.5">
              <div className="text-[10px] uppercase text-muted-foreground">Urgency</div>
              <div className="font-semibold">{printBrief?.urgency ? `${printBrief.urgency.tier}` : "—"}</div>
            </div>
            <div className="rounded border border-border bg-background px-2 py-1.5">
              <div className="text-[10px] uppercase text-muted-foreground">Score</div>
              <div className="font-semibold">{printBrief?.urgency?.score ?? "—"}</div>
            </div>
            <div className="rounded border border-border bg-background px-2 py-1.5">
              <div className="text-[10px] uppercase text-muted-foreground">Active nurtures</div>
              <div className="font-semibold">{nurtureJourneys.length}</div>
            </div>
            <div className="rounded border border-border bg-background px-2 py-1.5">
              <div className="text-[10px] uppercase text-muted-foreground">Next due</div>
              <div className="font-semibold">{nextNurtureDue ? format(nextNurtureDue, "d MMM") : "—"}</div>
            </div>
          </div>
        </section>

        <section className="print-section">
          <h3 className="print-section-title">Priority action queue</h3>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="py-1 text-left font-semibold">Rank</th>
                <th className="py-1 text-left font-semibold">Contact</th>
                <th className="py-1 text-left font-semibold">Stage</th>
                <th className="py-1 text-left font-semibold">Overdue since</th>
                <th className="py-1 text-left font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {actionQueue.map((item, idx) => (
                <tr key={item} className="align-top border-b border-border/60">
                  <td className="py-1.5 pr-2">{idx + 1}</td>
                  <td className="py-1.5 pr-2">{contact.name ?? "Contact"}</td>
                  <td className="py-1.5 pr-2">{printBrief?.activeNurtureHeadline ?? "No active nurture"}</td>
                  <td className="py-1.5 pr-2">{nextNurtureDue ? format(nextNurtureDue, "d MMM yyyy") : "Not set"}</td>
                  <td className="py-1.5">{item}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="print-section">
          <h3 className="print-section-title">Contact snapshot card</h3>
          <div className="print-prose">
            <Row
              label="Phone"
              value={
                phones.length > 0
                  ? phones.map((num, i) => (
                      <span key={i}>
                        {formatPhoneDisplay(num)}
                        {i < phones.length - 1 ? " · " : ""}
                      </span>
                    ))
                  : "—"
              }
            />
            <Row
              label="Email"
              value={
                emails.length > 0
                  ? emails.map((addr, i) => (
                      <span key={i}>
                        {addr}
                        {i < emails.length - 1 ? " · " : ""}
                      </span>
                    ))
                  : "—"
              }
            />
            <Row label="Address" value={addressLine ?? "—"} />
            <Row label="Source" value={contact.source ?? "—"} />
            <Row label="Date of birth" value={dobDisplay ?? "Hidden"} />
            <Row label="Pipeline / journey" value={[pipelineStage, journeyStage].filter(Boolean).join(" · ") || "—"} />
            <Row label="Notes" value={contact.notes?.trim() || "—"} />
            <Row label="Next action" value={actionQueue[0] ?? "—"} />
          </div>
          {tags.length > 0 ? (
            <div className="print-tags">
              {tags.map((t) => (
                <span key={t} className="print-tag">
                  {t}
                </span>
              ))}
            </div>
          ) : null}
        </section>

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
                const addrRaw = formatPropertyAddress(link.property as Property);
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

        <section className="print-section">
          <h3 className="print-section-title">Activity & nurture snapshot</h3>
          <p className="print-value-block">{printBrief?.lastTouchSnapshot ?? "Last touch: not available on file."}</p>
          <p className="print-value-block print-brief-snapshot-second">{printBrief?.nurtureSnapshot ?? "Active nurture: none."}</p>
          {printBrief?.talkingPointTitles.length ? (
            <ul className="print-talking-points mt-2">
              {printBrief.talkingPointTitles.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          ) : null}
        </section>

        <Section title="Journey & nurture sequences">
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

        <Section title="Data hygiene queue">
          {hygieneFlags.length > 0 ? (
            <ul className="print-talking-points">
              {hygieneFlags.map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
          ) : (
            <p className="print-muted">No immediate data hygiene flags detected.</p>
          )}
        </Section>

        {(contact.story?.trim() || contact.selling_intentions?.trim() || contact.current_situation_notes?.trim() || contact.pain_points?.trim() || contact.pleasure_points?.trim()) ? (
          <Section title="Context notes">
            <div className="print-prose">
              <Row label="Story" value={contact.story} />
              <Row label="Selling intentions" value={contact.selling_intentions} />
              <Row label="Current situation" value={contact.current_situation_notes} />
              <Row label="Pain points" value={contact.pain_points} />
              <Row label="Pleasure points" value={contact.pleasure_points} />
            </div>
          </Section>
        ) : null}
      </div>

      <footer className="print-doc-footer">
        <span>Data Dungeon CRM · {contact.name ?? "Contact"}</span>
        <span>Confidential · Generated {printedAt}</span>
      </footer>
    </div>
  );
}
