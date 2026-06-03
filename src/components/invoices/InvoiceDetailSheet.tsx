import { format } from "date-fns";
import { ExternalLink, Printer } from "lucide-react";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import {
  formatInvoiceAud,
  useInvoice,
  useMarkInvoicePaid,
  useUpdateInvoice,
} from "@/hooks/useInvoices";
import { reimbursementStateLabel } from "@/lib/recoverablePosition";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (id: string) => void;
  onPrint: (id: string) => void;
  onRaiseReimbursement: (id: string) => void;
};

export function InvoiceDetailSheet({
  invoiceId,
  open,
  onOpenChange,
  onEdit,
  onPrint,
  onRaiseReimbursement,
}: Props) {
  const { data: invoice, isLoading } = useInvoice(invoiceId ?? undefined);
  const markPaid = useMarkInvoicePaid();
  const updateInvoice = useUpdateInvoice();

  if (!invoiceId) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {isLoading ? "Loading…" : invoice?.invoice_number ?? "Invoice"}
            {invoice ? (
              <InvoiceStatusBadge
                direction={invoice.direction}
                status={invoice.status}
                due_date={invoice.due_date}
              />
            ) : null}
          </SheetTitle>
        </SheetHeader>

        {isLoading || !invoice ? (
          <Skeleton className="h-40 w-full mt-4" />
        ) : (
          <div className="mt-4 space-y-4 text-sm">
            <dl className="space-y-2">
              <Row label="Direction" value={invoice.direction === "incoming" ? "Supplier bill" : "Reimbursement"} />
              <Row label="Counterparty" value={invoice.counterparty_name} />
              {invoice.counterparty_abn ? <Row label="ABN" value={invoice.counterparty_abn} /> : null}
              {invoice.property_address ? <Row label="Property" value={invoice.property_address} /> : null}
              <Row label="Issue date" value={format(new Date(invoice.issue_date), "d MMM yyyy")} />
              <Row label="Due date" value={format(new Date(invoice.due_date), "d MMM yyyy")} />
              <Row label="Total" value={formatInvoiceAud(invoice.total)} />
              {invoice.direction === "incoming" && (
                <Row label="Reimbursement" value={reimbursementStateLabel(invoice)} />
              )}
            </dl>

            {invoice.line_items?.length ? (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Line items</p>
                <ul className="space-y-2">
                  {invoice.line_items.map((line) => (
                    <li key={line.id} className="rounded border border-border/60 p-2">
                      <p>{line.description}</p>
                      <p className="text-xs text-muted-foreground tabular-nums mt-1">
                        {line.quantity} × {formatInvoiceAud(line.unit_price)} = {formatInvoiceAud(line.amount)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {invoice.notes ? (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Notes</p>
                <p className="text-xs whitespace-pre-wrap text-muted-foreground">{invoice.notes}</p>
              </div>
            ) : null}

            {invoice.linked_bills?.length ? (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Linked bills</p>
                <ul className="space-y-1">
                  {invoice.linked_bills.map((b) => (
                    <li key={b.id}>
                      <Badge variant="outline" className="font-normal">
                        {b.invoice_number} · {formatInvoiceAud(b.total)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {invoice.reimbursement_invoice ? (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Reimbursement invoice</p>
                <Badge variant="secondary">{invoice.reimbursement_invoice.invoice_number}</Badge>
              </div>
            ) : null}

            {invoice.signed_file_url ? (
              <Button variant="outline" size="sm" asChild>
                <a href={invoice.signed_file_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Download PDF
                </a>
              </Button>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-2">
              {invoice.status !== "paid" && invoice.status !== "void" && (
                <Button
                  size="sm"
                  onClick={() => void markPaid.mutateAsync({ id: invoice.id }).then(() => onOpenChange(false))}
                >
                  Mark paid
                </Button>
              )}
              {invoice.direction === "outgoing" && invoice.status === "draft" && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    void updateInvoice
                      .mutateAsync({ id: invoice.id, patch: { status: "sent" } })
                  }
                >
                  Mark sent
                </Button>
              )}
              {invoice.direction === "incoming" &&
                invoice.status === "paid" &&
                !invoice.reimbursement_invoice_id &&
                invoice.reimbursable && (
                  <Button size="sm" variant="secondary" onClick={() => onRaiseReimbursement(invoice.id)}>
                    Raise reimbursement
                  </Button>
                )}
              <Button size="sm" variant="outline" onClick={() => onPrint(invoice.id)}>
                <Printer className="h-3.5 w-3.5 mr-1.5" /> Print
              </Button>
              <Button size="sm" variant="outline" onClick={() => onEdit(invoice.id)}>
                Edit
              </Button>
              {invoice.listing_id ? (
                <Button size="sm" variant="ghost" asChild>
                  <Link to={`/listings/${invoice.listing_id}`}>Open listing</Link>
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}
