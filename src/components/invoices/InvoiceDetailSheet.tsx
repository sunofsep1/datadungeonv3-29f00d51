import { useState } from "react";
import { format } from "date-fns";
import { ExternalLink, Printer, Trash2, Undo2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ToastAction } from "@/components/ui/toast";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import {
  formatInvoiceAud,
  useInvoice,
  useConvertToReimbursementReceived,
  useConvertToSupplierBill,
  useMarkInvoicePaid,
  useRestoreInvoiceUndo,
  useUpdateInvoice,
} from "@/hooks/useInvoices";
import { canConvertReimbursementToBill, looksLikeMisclassifiedAgencyPayment } from "@/lib/invoiceCounterparty";
import { hasUndoForInvoice } from "@/lib/invoiceUndo";
import { markPaidActionLabel, reimbursementStateLabel } from "@/lib/recoverablePosition";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type Props = {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPrint: (id: string) => void;
  onRaiseReimbursement: (id: string) => void;
};

export function InvoiceDetailSheet({
  invoiceId,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onPrint,
  onRaiseReimbursement,
}: Props) {
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { data: invoice, isLoading } = useInvoice(invoiceId ?? undefined);
  const markPaid = useMarkInvoicePaid();
  const convertToReimbursement = useConvertToReimbursementReceived();
  const convertToSupplierBill = useConvertToSupplierBill();
  const restoreUndo = useRestoreInvoiceUndo();
  const updateInvoice = useUpdateInvoice();

  const misclassifiedAgencyPayment =
    invoice != null && looksLikeMisclassifiedAgencyPayment(invoice);
  const canBecomeSupplierBill =
    invoice?.direction === "outgoing" &&
    canConvertReimbursementToBill(invoice.linked_bills?.length ?? 0);
  const showUndo = invoice != null && hasUndoForInvoice(invoice.id);

  const offerUndoToast = (title: string) => {
    if (!invoice) return;
    toast({
      title,
      description: "You can undo this once.",
      action: (
        <ToastAction
          altText="Undo"
          onClick={() =>
            void restoreUndo.mutateAsync().then(() => {
              toast({ title: "Undone", description: "Invoice restored to previous type." });
            })
          }
        >
          Undo
        </ToastAction>
      ),
    });
  };

  if (!invoiceId) return null;

  return (
    <>
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
                  <Row
                    label="Reimbursement"
                    value={reimbursementStateLabel(invoice, invoice.reimbursement_invoice ?? null)}
                  />
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

              {showUndo ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5"
                  disabled={restoreUndo.isPending}
                  onClick={() =>
                    void restoreUndo.mutateAsync().then(() => {
                      toast({ title: "Undone", description: "Invoice restored to previous type." });
                    })
                  }
                >
                  <Undo2 className="h-3.5 w-3.5" /> Undo last type change
                </Button>
              ) : null}

              {canBecomeSupplierBill ? (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 space-y-2">
                  <p className="text-xs text-amber-100/95">
                    Logged as a <strong>reimbursement</strong> but meant to be a supplier bill? Convert it, or use
                    Edit → change Type, or Delete to remove entirely.
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8"
                    disabled={convertToSupplierBill.isPending}
                    onClick={() =>
                      void convertToSupplierBill.mutateAsync(invoice.id).then(() => {
                        offerUndoToast("Converted to supplier bill");
                      })
                    }
                  >
                    Convert to supplier bill
                  </Button>
                </div>
              ) : null}

              {misclassifiedAgencyPayment ? (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 space-y-2">
                  <p className="text-xs text-amber-100/95">
                    This is logged as a <strong>supplier bill</strong>, but {invoice.counterparty_name} is your
                    agency — not a trade you pay. That makes out-of-pocket look {formatInvoiceAud(invoice.total)}{" "}
                    higher than it should.
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8"
                    disabled={convertToReimbursement.isPending}
                    onClick={() =>
                      void convertToReimbursement.mutateAsync(invoice.id).then((updated) => {
                        offerUndoToast("Converted to reimbursement");
                        if (updated.status === "paid") {
                          toast({
                            title: "Out of pocket updated",
                            description: "Figures should now be correct.",
                          });
                        }
                      })
                    }
                  >
                    Convert to reimbursement received
                  </Button>
                </div>
              ) : null}

              {invoice.direction === "outgoing" &&
                invoice.status !== "paid" &&
                invoice.status !== "void" &&
                (invoice.status === "sent" || invoice.status === "overdue") && (
                  <p className="text-xs text-amber-300/90 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                    Received payment from Sotheby&apos;s? Use &quot;Payment received from agency&quot; below — out of
                    pocket won&apos;t clear until this reimbursement is marked paid.
                  </p>
                )}

              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
                {invoice.status !== "paid" && invoice.status !== "void" && (
                  <Button
                    size="sm"
                    onClick={() => void markPaid.mutateAsync({ id: invoice.id }).then(() => onOpenChange(false))}
                  >
                    {markPaidActionLabel(invoice.direction)}
                  </Button>
                )}
                {invoice.direction === "outgoing" && invoice.status === "draft" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      void updateInvoice.mutateAsync({ id: invoice.id, patch: { status: "sent" } })
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
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              {invoice
                ? `${invoice.invoice_number} · ${formatInvoiceAud(invoice.total)} will be removed permanently. Linked supplier bills will be unlinked, not deleted.`
                : "This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (invoice) {
                  onDelete(invoice.id);
                  setDeleteOpen(false);
                  onOpenChange(false);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
