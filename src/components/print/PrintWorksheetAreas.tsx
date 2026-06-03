import type { CSSProperties } from "react";

/**
 * Ruled handwriting areas for print / PDF briefings.
 * Reuse on contact, listing, property, or vision print routes — same CSS classes.
 */
type LinedPadProps = {
  rows?: number;
  className?: string;
};

export function PrintLinedPad({ rows = 8, className = "" }: LinedPadProps) {
  return (
    <div
      className={`print-lined-pad ${className}`.trim()}
      style={{ "--print-lined-rows": rows } as CSSProperties}
      aria-hidden
    />
  );
}

type PrintWorksheetAreasProps = {
  /** Shown under the main title (e.g. listing address or vision board name). */
  contextHint?: string;
};

/**
 * Client-facing worksheet: objectives, strategy, follow-ups.
 * Placed at end of briefing so reference data prints first.
 */
export function PrintWorksheetAreas({ contextHint }: PrintWorksheetAreasProps) {
  return (
    <div className="print-worksheet-suite print:break-before-page">
      <section className="print-section print-worksheet-section">
        <h3 className="print-section-title">Client visit worksheet</h3>
        {contextHint ? (
          <p className="print-worksheet-context">{contextHint}</p>
        ) : null}
        <p className="print-worksheet-intro">
          Handwritten space for objectives, strategy, and commitments — fill in before or during your
          appointment.
        </p>
        <div className="print-worksheet-grid">
          <div className="print-worksheet-field">
            <h4 className="print-worksheet-subtitle">Objectives &amp; agenda</h4>
            <p className="print-worksheet-hint">What you want to cover or decide.</p>
            <PrintLinedPad rows={6} />
          </div>
          <div className="print-worksheet-field">
            <h4 className="print-worksheet-subtitle">Strategy &amp; talking points</h4>
            <p className="print-worksheet-hint">Angles, objections, and value to reinforce.</p>
            <PrintLinedPad rows={12} className="print-lined-pad--tall" />
          </div>
          <div className="print-worksheet-field">
            <h4 className="print-worksheet-subtitle">Follow-ups &amp; commitments</h4>
            <p className="print-worksheet-hint">Next steps, dates, and promises made.</p>
            <PrintLinedPad rows={8} />
          </div>
        </div>
      </section>
    </div>
  );
}
