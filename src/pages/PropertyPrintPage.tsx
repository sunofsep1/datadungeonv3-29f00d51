import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useProperty, formatPropertyAddress } from "@/hooks/useProperties";
import { useContacts } from "@/hooks/useContacts";
import { PrintReportLayout } from "@/components/print/PrintReportLayout";

function valueOrDash(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  return String(value);
}

export default function PropertyPrintPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: property, isLoading, isError } = useProperty(id);
  const { data: contacts = [] } = useContacts();

  const ownerNames = useMemo(() => {
    const links = Array.isArray(property?.contact_property_links) ? property.contact_property_links : [];
    const contactMap = new Map(contacts.map((c) => [c.id, c.name ?? "Contact"]));
    return links
      .map((l) => contactMap.get(l.contact_id))
      .filter(Boolean) as string[];
  }, [property, contacts]);

  if (isLoading) {
    return (
      <PrintReportLayout onClose={() => navigate(-1)}>
        <div className="contact-print-document p-6">
          <Skeleton className="h-8 w-56 mb-4" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PrintReportLayout>
    );
  }

  if (isError || !property) {
    return (
      <PrintReportLayout onClose={() => navigate(-1)}>
        <div className="contact-print-document p-6">
          <p className="text-muted-foreground">Property not found.</p>
        </div>
      </PrintReportLayout>
    );
  }

  const address = formatPropertyAddress(property);
  const report = (property.property_report ?? {}) as Record<string, unknown>;
  const landSize = property.lot_size ?? report.area_land ?? null;
  const buildingSize = property.building_size ?? report.area_building ?? null;
  const printedAt = format(new Date(), "d MMMM yyyy");
  const updatedAt = property.updated_at ? new Date(property.updated_at) : null;
  const daysSinceUpdate =
    updatedAt && !Number.isNaN(updatedAt.getTime())
      ? Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;
  const dataIssues = [
    ownerNames.length === 0 ? "No linked owner/contact on this property." : null,
    property.price == null || Number(property.price) <= 0 ? "Missing guide price." : null,
    !property.property_type ? "Missing property type." : null,
    landSize == null ? "Missing land size." : null,
    daysSinceUpdate != null && daysSinceUpdate > 21 ? `Record not updated in ${daysSinceUpdate} days.` : null,
  ].filter(Boolean) as string[];
  const actionQueue = [
    ownerNames.length === 0 ? "Link an owner/contact before next follow-up." : "Confirm owner details are current.",
    property.price == null || Number(property.price) <= 0
      ? "Set a working price/guide to improve pipeline and reporting accuracy."
      : "Reconfirm vendor price expectations against current market feedback.",
    !property.notes?.trim()
      ? "Add campaign context notes (motivation, timeframe, blockers)."
      : "Review notes and log a fresh vendor update touchpoint.",
    daysSinceUpdate != null && daysSinceUpdate > 14
      ? "Run a progress review due to stale update window."
      : "Keep weekly review cadence active.",
  ];
  const priorityLabel = daysSinceUpdate != null && daysSinceUpdate > 21 ? "Warm" : "Hot";

  return (
    <PrintReportLayout onClose={() => navigate(-1)}>
      <div className="contact-print-document">
        <div className="print-letterhead" aria-hidden>
          <div className="print-letterhead-inner">
            <div className="print-letterhead-text">
              <span className="print-letterhead-brand">Data Dungeon</span>
              <span className="print-letterhead-sub">CRM · Property briefing</span>
            </div>
          </div>
          <div className="print-letterhead-accent" />
        </div>

        <div className="print-doc-hero" role="banner">
          <h1 className="print-doc-title">{address || "Property"}</h1>
          <p className="print-doc-subtitle">Queensland Sotheby's International Realty · Greg Leigh · {printedAt}</p>
          <div className="print-doc-hero-badges">
            <span className="print-badge">{priorityLabel}</span>
            <span className="print-badge print-badge-muted">Data issues {dataIssues.length}</span>
          </div>
        </div>

        <div className="print-doc-body">
          <section className="print-section">
            <h3 className="print-section-title">Executive summary</h3>
            <div className="print-prose">
              <div className="print-row">
                <span className="print-label">Owner / contacts</span>
                <span className="print-value">{ownerNames.length ? ownerNames.join(" · ") : "No linked contacts"}</span>
              </div>
              <div className="print-row">
                <span className="print-label">Type</span>
                <span className="print-value">{valueOrDash(property.property_type)}</span>
              </div>
              <div className="print-row">
                <span className="print-label">Price</span>
                <span className="print-value">
                  {property.price != null && property.price > 0 ? `$${Number(property.price).toLocaleString()}` : "—"}
                </span>
              </div>
              <div className="print-row">
                <span className="print-label">Data issues</span>
                <span className="print-value">{dataIssues.length || 0}</span>
              </div>
            </div>
          </section>

          <section className="print-section">
            <h3 className="print-section-title">Action queue</h3>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-1 text-left font-semibold">Rank</th>
                  <th className="py-1 text-left font-semibold">Stage</th>
                  <th className="py-1 text-left font-semibold">Last update</th>
                  <th className="py-1 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {actionQueue.map((item, idx) => (
                  <tr key={item} className="align-top border-b border-border/60">
                    <td className="py-1.5 pr-2">{idx + 1}</td>
                    <td className="py-1.5 pr-2">{property.property_type || "Property review"}</td>
                    <td className="py-1.5 pr-2">{property.updated_at ? format(new Date(property.updated_at), "d MMM yyyy") : "—"}</td>
                    <td className="py-1.5">{item}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="print-section">
            <h3 className="print-section-title">Property details</h3>
            <div className="print-prose">
              <div className="print-row">
                <span className="print-label">Bedrooms / bathrooms / car</span>
                <span className="print-value">
                  {valueOrDash(property.bedrooms)} / {valueOrDash(property.bathrooms)} / {valueOrDash(property.car_spaces)}
                </span>
              </div>
              <div className="print-row">
                <span className="print-label">Land size</span>
                <span className="print-value">{landSize != null ? `${Number(landSize).toLocaleString()} m²` : "—"}</span>
              </div>
              <div className="print-row">
                <span className="print-label">Building size</span>
                <span className="print-value">{buildingSize != null ? `${Number(buildingSize).toLocaleString()} m²` : "—"}</span>
              </div>
              <div className="print-row">
                <span className="print-label">Last updated</span>
                <span className="print-value">
                  {property.updated_at ? format(new Date(property.updated_at), "d MMM yyyy, h:mm a") : "—"}
                </span>
              </div>
            </div>
          </section>

          <section className="print-section">
            <h3 className="print-section-title">Notes</h3>
            <p className="print-notes print-prose-inline">{property.notes?.trim() || "No property notes captured yet."}</p>
          </section>

          <section className="print-section">
            <h3 className="print-section-title">Data hygiene queue</h3>
            {dataIssues.length > 0 ? (
              <ul className="print-talking-points">
                {dataIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : (
              <p className="print-muted">No immediate data hygiene issues detected.</p>
            )}
          </section>
        </div>
      </div>
    </PrintReportLayout>
  );
}
