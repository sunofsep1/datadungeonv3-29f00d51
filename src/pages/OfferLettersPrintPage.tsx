import { useEffect, useMemo } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { THEME_HTML_CLASSES } from "@/contexts/ThemeContext";
import { PrintReportLayout } from "@/components/print/PrintReportLayout";
import { Button } from "@/components/ui/button";
import {
  clearOfferLetterPrintPayload,
  loadOfferLetterPrintPayload,
  OFFER_LETTER_LABELS,
} from "@/lib/offerLetterPrint";

export default function OfferLettersPrintPage() {
  const navigate = useNavigate();
  const payload = useMemo(() => loadOfferLetterPrintPayload(), []);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove(...([...THEME_HTML_CLASSES] as string[]));
    html.classList.add("light");
    return () => clearOfferLetterPrintPayload();
  }, []);

  useEffect(() => {
    if (!payload) return;
    const t = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(t);
  }, [payload]);

  if (!payload) {
    return (
      <PrintReportLayout onClose={() => navigate(-1)}>
        <div className="p-8 text-center space-y-4">
          <p className="text-sm text-muted-foreground">No letter data. Generate from an offer on a listing.</p>
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
            <p className="text-sm font-semibold">{OFFER_LETTER_LABELS[payload.letterKind]}</p>
            <p className="text-xs text-muted-foreground">
              {payload.offerRef} · {payload.listingAddress}
            </p>
          </div>
          <Button size="sm" onClick={() => window.print()}>
            Print
          </Button>
        </div>

        <div className="p-8 max-w-[210mm] mx-auto text-sm text-foreground">
          <p className="text-xs text-muted-foreground mb-6">{printedAt}</p>
          {payload.mailingAddress ? (
            <div className="mb-8 whitespace-pre-line text-sm">{payload.mailingAddress}</div>
          ) : null}
          <p className="mb-4 font-medium">{payload.recipientName}</p>
          <div className="whitespace-pre-line leading-relaxed">{payload.mergedBody}</div>
        </div>
      </div>
    </PrintReportLayout>
  );
}
