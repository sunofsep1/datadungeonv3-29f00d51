import { useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { X } from "lucide-react";

import { THEME_HTML_CLASSES } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { useTouchActivityReport, type TouchActivityRange } from "@/hooks/useTouches";

function formatTouchLabel(touchType: string): string {
  return touchType
    .split("_")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

export default function TouchReportPrint() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedRange: TouchActivityRange = searchParams.get("range") === "week" ? "week" : "today";
  const selectedContactsParam = searchParams.get("contacts") ?? "";
  const selectedContactIds = useMemo(
    () =>
      new Set(
        selectedContactsParam
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    [selectedContactsParam],
  );
  const { data: rows = [], isLoading } = useTouchActivityReport(selectedRange);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove(...([...THEME_HTML_CLASSES] as string[]));
    html.classList.add("light");
  }, []);

  const groupedContacts = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        contactName: string;
        contactId: string | null;
        lastTouchedAt: string;
        items: typeof rows;
      }
    >();

    for (const row of rows) {
      const key = row.contact_id ?? `name:${row.contact_name.toLowerCase()}`;
      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, {
          key,
          contactName: row.contact_name,
          contactId: row.contact_id,
          lastTouchedAt: row.occurred_at,
          items: [row],
        });
        continue;
      }
      existing.items.push(row);
      if (new Date(row.occurred_at).getTime() > new Date(existing.lastTouchedAt).getTime()) {
        existing.lastTouchedAt = row.occurred_at;
      }
    }

    for (const group of groups.values()) {
      group.items.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
    }

    return Array.from(groups.values()).sort(
      (a, b) => new Date(b.lastTouchedAt).getTime() - new Date(a.lastTouchedAt).getTime(),
    );
  }, [rows]);

  const visibleGroups = useMemo(() => {
    if (selectedContactIds.size === 0) return groupedContacts;
    return groupedContacts.filter((group) => group.contactId && selectedContactIds.has(group.contactId));
  }, [groupedContacts, selectedContactIds]);

  const visibleRowsCount = useMemo(
    () => visibleGroups.reduce((sum, group) => sum + group.items.length, 0),
    [visibleGroups],
  );

  const periodLabel = selectedRange === "today" ? "Today" : "This week";
  const scopeLabel = selectedContactIds.size > 0 ? "Selected contacts" : "All contacts";
  const printedAt = format(new Date(), "d MMMM yyyy, h:mm a");

  return (
    <div className="contact-print-page">
      <div className="print-page-chrome print-only-hide flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="gap-2">
          <X className="w-4 h-4" /> Close
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/touch-report?range=${selectedRange}`}>Back to report</Link>
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            Print
          </Button>
        </div>
      </div>

      <div className="contact-print-document">
        <div className="print-letterhead" aria-hidden>
          <div className="print-letterhead-inner">
            <div className="print-letterhead-text">
              <span className="print-letterhead-brand">Data Dungeon</span>
              <span className="print-letterhead-sub">CRM · Touch activity report</span>
            </div>
          </div>
          <div className="print-letterhead-accent" />
        </div>

        <div className="print-doc-hero" role="banner">
          <h1 className="print-doc-title">Touch Activity Report</h1>
          <p className="print-doc-subtitle">
            {periodLabel} · {visibleRowsCount} touches across {visibleGroups.length} contacts · {scopeLabel}
          </p>
          <div className="print-doc-hero-badges">
            <span className="print-badge">{periodLabel}</span>
          </div>
        </div>

        <div className="px-[22mm] py-5 space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading report...</p>
          ) : visibleGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No touch activity found for this period.</p>
          ) : (
            visibleGroups.map((group) => (
              <section key={group.key} className="border border-border rounded-lg p-3 break-inside-avoid page-break-inside-avoid">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{group.contactName}</h3>
                    <p className="text-xs text-muted-foreground">
                      {group.items.length} touch{group.items.length === 1 ? "" : "es"} · last{" "}
                      {format(new Date(group.lastTouchedAt), "EEE d MMM, h:mm a")}
                    </p>
                  </div>
                  {group.contactId ? (
                    <span className="text-xs text-muted-foreground">Contact ID: {group.contactId.slice(0, 8)}</span>
                  ) : null}
                </div>
                <div className="mt-3 space-y-2">
                  {group.items.map((row) => (
                    <div key={`${row.source}-${row.id}`} className="border border-border/70 rounded-md px-3 py-2">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(row.occurred_at), "EEE d MMM, h:mm a")} · {formatTouchLabel(row.touch_type)} ·{" "}
                        {row.source === "touches" ? "Touch log" : "Interaction"}
                      </p>
                      {row.notes ? <p className="text-sm mt-1">{row.notes}</p> : null}
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        <footer className="print-doc-footer">
          <span>Data Dungeon CRM · Touch activity report</span>
          <span>Generated {printedAt}</span>
        </footer>
      </div>
    </div>
  );
}
