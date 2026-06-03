import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PrintReportLayout } from "@/components/print/PrintReportLayout";
import { useInvoice, formatInvoiceAud } from "@/hooks/useInvoices";
import { GREG_INVOICE_ISSUER, DEFAULT_AGENCY_COUNTERPARTY } from "@/lib/invoiceIssuer";
import { deriveStatus, statusLabel } from "@/lib/invoiceStatus";

export default function InvoicePrintPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: invoice, isLoading, isError } = useInvoice(id);

  useEffect(() => {
    document.documentElement.classList.add("light");
  }, []);

  if (isLoading) {
    return (
      <PrintReportLayout title="Invoice">
        <Skeleton className="h-96 w-full max-w-[210mm] mx-auto" />
      </PrintReportLayout>
    );
  }

  if (isError || !invoice) {
    return (
      <PrintReportLayout title="Invoice">
        <p className="text-center py-12">Invoice not found.</p>
        <Button variant="outline" onClick={() => navigate("/invoices")}>
          Back to invoicing
        </Button>
      </PrintReportLayout>
    );
  }

  const effective = deriveStatus({
    direction: invoice.direction,
    status: invoice.status,
    due_date: invoice.due_date,
  });

  return (
    <PrintReportLayout title={`Invoice ${invoice.invoice_number}`}>
      <div className="max-w-[210mm] mx-auto bg-white text-black p-8 print:p-6 text-sm invoice-print-document">
        <div className="flex justify-between gap-6 mb-8">
          <div>
            <p className="text-lg font-bold">{GREG_INVOICE_ISSUER.name}</p>
            <p className="text-muted-foreground">{GREG_INVOICE_ISSUER.title}</p>
            <p>{GREG_INVOICE_ISSUER.agency}</p>
            <p>{GREG_INVOICE_ISSUER.suburb}</p>
            <p>{GREG_INVOICE_ISSUER.email}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tracking-tight">INVOICE</p>
            <p className="font-semibold mt-2">{invoice.invoice_number}</p>
            <p className="text-muted-foreground">Status: {statusLabel(effective)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Bill to</p>
            <p className="font-semibold">{DEFAULT_AGENCY_COUNTERPARTY.attention}</p>
            <p>{invoice.counterparty_name}</p>
          </div>
          <div className="text-right">
            <p>
              <span className="text-muted-foreground">Issue date: </span>
              {format(new Date(invoice.issue_date), "d MMMM yyyy")}
            </p>
            <p>
              <span className="text-muted-foreground">Due date: </span>
              {format(new Date(invoice.due_date), "d MMMM yyyy")}
            </p>
            {invoice.property_address ? (
              <p className="mt-2">
                <span className="text-muted-foreground">Property: </span>
                {invoice.property_address}
              </p>
            ) : null}
          </div>
        </div>

        <table className="w-full border-collapse mb-6">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-2 pr-4">Description</th>
              <th className="text-right py-2 px-2 w-16">Qty</th>
              <th className="text-right py-2 px-2 w-24">Unit</th>
              <th className="text-right py-2 pl-2 w-24">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.line_items ?? []).map((line) => (
              <tr key={line.id} className="border-b border-gray-200">
                <td className="py-2 pr-4 align-top">{line.description}</td>
                <td className="py-2 px-2 text-right tabular-nums">{line.quantity}</td>
                <td className="py-2 px-2 text-right tabular-nums">{formatInvoiceAud(line.unit_price)}</td>
                <td className="py-2 pl-2 text-right tabular-nums">{formatInvoiceAud(line.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-8">
          <dl className="w-56 space-y-1">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatInvoiceAud(invoice.subtotal)}</dd>
            </div>
            {invoice.gst_amount != null ? (
              <div className="flex justify-between">
                <dt>GST</dt>
                <dd className="tabular-nums">{formatInvoiceAud(invoice.gst_amount)}</dd>
              </div>
            ) : (
              <div className="flex justify-between text-muted-foreground text-xs">
                <dt>GST</dt>
                <dd>N/A</dd>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t border-black pt-2">
              <dt>Total due</dt>
              <dd className="tabular-nums">{formatInvoiceAud(invoice.total)}</dd>
            </div>
          </dl>
        </div>

        <div className="mb-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Payment details</p>
          <p>{GREG_INVOICE_ISSUER.bank.institution}</p>
          <p>
            BSB {GREG_INVOICE_ISSUER.bank.bsb} · Acc {GREG_INVOICE_ISSUER.bank.account}
          </p>
          <p>Reference {invoice.invoice_number}</p>
        </div>

        {invoice.notes ? (
          <div className="text-xs text-muted-foreground whitespace-pre-wrap border-t border-gray-200 pt-4">
            {invoice.notes}
          </div>
        ) : null}

        <div className="mt-8 flex gap-2 print:hidden">
          <Button onClick={() => window.print()}>Print / Save PDF</Button>
          <Button variant="outline" onClick={() => navigate("/invoices")}>
            Back
          </Button>
        </div>
      </div>
    </PrintReportLayout>
  );
}
