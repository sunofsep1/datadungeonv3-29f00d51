/**
 * A4 print brochure for OFI self check-in — QR code + property details for display at open homes.
 */
import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErrorMessage } from "@/lib/supabaseErrorMessage";
import { buildOfiCheckInUrl, ofiQrImageUrl } from "@/lib/ofiInspection";
import { PrintReportLayout } from "@/components/print/PrintReportLayout";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { THEME_HTML_CLASSES } from "@/contexts/ThemeContext";

type OfiPreview = {
  inspection_id: string;
  listing_id: string;
  listing_address: string;
  starts_at: string;
  ends_at: string;
};

export default function OfiBrochurePrintPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const autoPrint = searchParams.get("auto") === "1";

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove(...([...THEME_HTML_CLASSES] as string[]));
    html.classList.add("light");
  }, []);

  const preview = useQuery({
    queryKey: ["ofi_brochure_preview", token ?? ""],
    queryFn: async (): Promise<OfiPreview | null> => {
      if (!token?.trim()) return null;
      const { data, error } = await supabase.rpc("get_ofi_check_in_by_token", { p_token: token.trim() });
      if (error) throw new Error(supabaseErrorMessage(error));
      const row = Array.isArray(data) ? data[0] : data;
      return (row as OfiPreview) ?? null;
    },
    enabled: !!token?.trim(),
    retry: false,
  });

  useEffect(() => {
    if (!autoPrint || !preview.data) return;
    const t = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(t);
  }, [autoPrint, preview.data]);

  if (!token?.trim()) {
    return (
      <PrintReportLayout>
        <p className="p-8 text-center text-muted-foreground">Invalid brochure link.</p>
      </PrintReportLayout>
    );
  }

  if (preview.isLoading) {
    return (
      <PrintReportLayout>
        <p className="p-8 text-center text-muted-foreground">Loading…</p>
      </PrintReportLayout>
    );
  }

  if (preview.isError || !preview.data) {
    return (
      <PrintReportLayout>
        <p className="p-8 text-center text-muted-foreground">
          {preview.error instanceof Error ? preview.error.message : "Inspection not found."}
        </p>
      </PrintReportLayout>
    );
  }

  const info = preview.data;
  const checkInUrl = buildOfiCheckInUrl(token.trim());
  const whenLabel = `${format(new Date(info.starts_at), "EEEE d MMMM yyyy")}`;
  const timeLabel = `${format(new Date(info.starts_at), "h:mm a")} – ${format(new Date(info.ends_at), "h:mm a")}`;

  return (
    <PrintReportLayout>
      <div className="contact-print-page ofi-brochure-print">
        <div className="print-only-hide flex justify-end gap-2 p-4 max-w-[210mm] mx-auto">
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            Print
          </Button>
        </div>
        <article className="ofi-brochure-sheet mx-auto">
          <header className="ofi-brochure-header">
            <p className="ofi-brochure-kicker">Open for inspection</p>
            <h1 className="ofi-brochure-address">{info.listing_address || "Property inspection"}</h1>
            <p className="ofi-brochure-when">{whenLabel}</p>
            <p className="ofi-brochure-time">{timeLabel}</p>
          </header>

          <section className="ofi-brochure-qr-block">
            <img
              src={ofiQrImageUrl(checkInUrl, 280)}
              alt="Scan to check in"
              className="ofi-brochure-qr"
            />
            <p className="ofi-brochure-scan">Scan to register your attendance</p>
            <p className="ofi-brochure-url">{checkInUrl}</p>
          </section>

          <footer className="ofi-brochure-footer">
            <p>Welcome — please check in so we can follow up with property information.</p>
            <p className="ofi-brochure-agency">Queensland Sotheby&apos;s International Realty</p>
          </footer>
        </article>
      </div>
    </PrintReportLayout>
  );
}
