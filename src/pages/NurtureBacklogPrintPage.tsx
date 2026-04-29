import { useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { THEME_HTML_CLASSES } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { PrintReportLayout } from "@/components/print/PrintReportLayout";
import { useActiveNurtureEnrollments } from "@/hooks/useActiveNurtureEnrollments";
import { useContacts, getPrimaryEmail, getPrimaryPhone } from "@/hooks/useContacts";

type Bucket = "hot" | "warm" | "cold";

function bucketFromCategory(raw: string | null | undefined): Bucket {
  const s = String(raw ?? "").toLowerCase();
  if (s.includes("hot")) return "hot";
  if (s.includes("warm")) return "warm";
  return "cold";
}

export default function NurtureBacklogPrintPage() {
  const navigate = useNavigate();
  const { data: dash, isLoading } = useActiveNurtureEnrollments();
  const { data: contacts = [] } = useContacts();

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove(...([...THEME_HTML_CLASSES] as string[]));
    html.classList.add("light");
  }, []);

  const rows = useMemo(() => {
    const now = Date.now();
    const cMap = new Map(contacts.map((c) => [c.id, c]));
    return (dash?.items ?? [])
      .filter((x) => x.next_step_at && new Date(x.next_step_at).getTime() <= now)
      .map((x) => {
        const c = cMap.get(x.contact_id);
        const nextAt = x.next_step_at ? new Date(x.next_step_at) : null;
        const overdueDays = nextAt ? Math.max(0, Math.floor((now - nextAt.getTime()) / (1000 * 60 * 60 * 24))) : 0;
        const contactCategory = (c as { contact_category?: string | null } | undefined)?.contact_category ?? null;
        return {
          id: x.id,
          contactId: x.contact_id,
          contactName: x.contactName,
          sequenceName: x.sequenceName,
          step: x.current_step_index + 1,
          totalSteps: x.total_steps,
          nextStepTitle: x.next_step_title ?? null,
          nextStepType: x.next_step_type ?? null,
          overdueAt: nextAt,
          overdueDays,
          bucket: bucketFromCategory(contactCategory),
          phone: c ? getPrimaryPhone(c) : null,
          email: c ? getPrimaryEmail(c) : null,
          notes: (c as { notes?: string | null } | undefined)?.notes?.trim() ?? null,
        };
      })
      .sort((a, b) => b.overdueDays - a.overdueDays);
  }, [dash?.items, contacts]);

  const grouped = useMemo(() => {
    const hot = rows.filter((r) => r.bucket === "hot");
    const warm = rows.filter((r) => r.bucket === "warm");
    const cold = rows.filter((r) => r.bucket === "cold");
    const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.overdueDays, 0) / rows.length) : 0;
    const missingContactInfo = rows.filter((r) => !r.phone && !r.email).length;
    return { hot, warm, cold, avg, missingContactInfo };
  }, [rows]);

  const printedAt = format(new Date(), "d MMMM yyyy, h:mm a");
  const oldest = rows[0]?.overdueAt ? format(rows[0].overdueAt, "d MMMM yyyy") : "—";

  return (
    <PrintReportLayout onClose={() => navigate(-1)}>
      <div className="contact-print-document">
        <div className="print-letterhead" aria-hidden>
          <div className="print-letterhead-inner">
            <div className="print-letterhead-text">
              <span className="print-letterhead-brand">Data Dungeon</span>
              <span className="print-letterhead-sub">CRM · Nurture backlog report</span>
            </div>
          </div>
          <div className="print-letterhead-accent" />
        </div>

        <div className="print-doc-hero" role="banner">
          <h1 className="print-doc-title">Nurture Backlog Report</h1>
          <p className="print-doc-subtitle">
            Queensland Sotheby's International Realty · Greg Leigh · {rows.length} overdue steps · Oldest {oldest}
          </p>
          <div className="print-doc-hero-badges">
            <span className="print-badge">Hot {grouped.hot.length}</span>
            <span className="print-badge print-badge-muted">Warm {grouped.warm.length}</span>
            <span className="print-badge print-badge-muted">Cold {grouped.cold.length}</span>
          </div>
        </div>

        <div className="px-[22mm] py-5 space-y-4">
          <section className="print-section">
            <h3 className="print-section-title">Summary</h3>
            <div className="print-prose">
              <div className="print-row"><span className="print-label">Hot</span><span className="print-value">{grouped.hot.length}</span></div>
              <div className="print-row"><span className="print-label">Warm</span><span className="print-value">{grouped.warm.length}</span></div>
              <div className="print-row"><span className="print-label">Cold</span><span className="print-value">{grouped.cold.length}</span></div>
              <div className="print-row"><span className="print-label">Avg days overdue</span><span className="print-value">{grouped.avg}</span></div>
              <div className="print-row"><span className="print-label">No contact info</span><span className="print-value">{grouped.missingContactInfo}</span></div>
            </div>
          </section>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading nurture backlog…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No overdue nurture steps found.</p>
          ) : (
            <>
              {([
                ["hot", "Hot leads — action today", grouped.hot],
                ["warm", "Warm leads — follow up this week", grouped.warm],
                ["cold", "Cold leads — keep warm", grouped.cold],
              ] as const).map(([key, title, list]) =>
                list.length ? (
                  <section key={key} className="print-section">
                    <h3 className="print-section-title">{title}</h3>
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="py-1 text-left font-semibold">#</th>
                          <th className="py-1 text-left font-semibold">Contact</th>
                          <th className="py-1 text-left font-semibold">Sequence / Step</th>
                          <th className="py-1 text-left font-semibold">Overdue</th>
                          <th className="py-1 text-left font-semibold">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((r, idx) => (
                          <tr key={r.id} className="align-top border-b border-border/60">
                            <td className="py-1.5 pr-2">{idx + 1}</td>
                            <td className="py-1.5 pr-2">
                              <div className="font-medium">{r.contactName}</div>
                              <div className="text-muted-foreground">
                                {r.phone ? `📞 ${r.phone}` : "No phone"}
                                {r.email ? ` · 📧 ${r.email}` : ""}
                              </div>
                            </td>
                            <td className="py-1.5 pr-2">
                              <div>{r.sequenceName}</div>
                              <div className="text-muted-foreground">
                                Step {r.step} of {Math.max(r.totalSteps, 1)}
                                {r.nextStepTitle ? ` · ${r.nextStepTitle}` : ""}
                              </div>
                            </td>
                            <td className="py-1.5 pr-2">
                              {r.overdueAt ? format(r.overdueAt, "d MMM") : "—"}
                              <div className="text-muted-foreground">{r.overdueDays}d overdue</div>
                            </td>
                            <td className="py-1.5">{r.notes || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                ) : null,
              )}
            </>
          )}
        </div>

        <footer className="print-doc-footer">
          <span>Data Dungeon CRM · Nurture backlog</span>
          <span>Generated {printedAt}</span>
        </footer>
      </div>

      <div className="print-page-chrome print-only-hide">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/nurture">Back to nurture</Link>
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            Print
          </Button>
        </div>
      </div>
    </PrintReportLayout>
  );
}
