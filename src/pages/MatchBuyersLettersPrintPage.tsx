import { useEffect, useMemo } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { THEME_HTML_CLASSES } from "@/contexts/ThemeContext";
import { PrintReportLayout } from "@/components/print/PrintReportLayout";
import { Button } from "@/components/ui/button";
import {
  clearMatchBuyersLettersPrintPayload,
  loadMatchBuyersLettersPrintPayload,
} from "@/lib/matchBuyersLetterPrint";

export default function MatchBuyersLettersPrintPage() {
  const navigate = useNavigate();
  const payload = useMemo(() => loadMatchBuyersLettersPrintPayload(), []);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove(...([...THEME_HTML_CLASSES] as string[]));
    html.classList.add("light");
    return () => clearMatchBuyersLettersPrintPayload();
  }, []);

  useEffect(() => {
    if (!payload?.recipients.length) return;
    const t = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(t);
  }, [payload]);

  if (!payload || payload.recipients.length === 0) {
    return (
      <PrintReportLayout onClose={() => navigate(-1)}>
        <div className="p-8 text-center space-y-4">
          <p className="text-sm text-muted-foreground">No letter data. Generate letters from Match buyers on a listing.</p>
          <Button variant="outline" onClick={() => navigate("/listings")}>
            Back to listings
          </Button>
        </div>
      </PrintReportLayout>
    );
  }

  const printedAt = format(new Date(), "d MMMM yyyy");

  return (
    <PrintReportLayout onClose={() => navigate(-1)}>
      <div className="contact-print-document">
        <div className="print-only-hide px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-border">
          <div>
            <p className="text-sm font-semibold">Match buyers — bulk letters</p>
            <p className="text-xs text-muted-foreground">
              {payload.recipients.length} letter{payload.recipients.length === 1 ? "" : "s"} · {payload.listingAddress}
            </p>
          </div>
          <Button size="sm" onClick={() => window.print()}>
            Print
          </Button>
        </div>

        {payload.recipients.map((r, index) => (
          <article
            key={r.contactId}
            className={index > 0 ? "print:break-before-page px-[22mm] py-[18mm] min-h-[240mm]" : "px-[22mm] py-[18mm] min-h-[240mm]"}
          >
            {index === 0 ? (
              <div className="print-letterhead mb-8" aria-hidden>
                <div className="print-letterhead-inner">
                  <div className="print-letterhead-text">
                    <span className="print-letterhead-brand">Data Dungeon</span>
                    <span className="print-letterhead-sub">Match buyers · {printedAt}</span>
                  </div>
                </div>
                <div className="print-letterhead-accent" />
              </div>
            ) : null}

            <div className="mb-10 text-sm leading-relaxed">
              <p className="font-medium">{r.name}</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{r.mailingAddress}</p>
            </div>

            <div className="print-prose text-sm leading-relaxed whitespace-pre-wrap">{r.mergedBody}</div>

            <p className="mt-12 text-[10px] text-muted-foreground print-only-hide">
              Re: {payload.listingAddress}
            </p>
          </article>
        ))}
      </div>
    </PrintReportLayout>
  );
}
