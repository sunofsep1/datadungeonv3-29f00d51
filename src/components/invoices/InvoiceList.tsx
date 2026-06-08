import { useMemo } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ExternalLink, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { formatInvoiceAud, type Invoice } from "@/hooks/useInvoices";
import { deriveStatus, daysUntilDue } from "@/lib/invoiceStatus";
import { markPaidActionLabel, outgoingInvoiceLookup, reimbursementStateLabel } from "@/lib/recoverablePosition";
import { looksLikeMisclassifiedAgencyPayment } from "@/lib/invoiceCounterparty";

type Props = {
  rows: Invoice[];
  onOpen: (id: string) => void;
  onMarkPaid: (id: string) => void;
  onRaiseReimbursement: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPrint: (id: string) => void;
};

export function InvoiceList({
  rows,
  onOpen,
  onMarkPaid,
  onRaiseReimbursement,
  onEdit,
  onDelete,
  onPrint,
}: Props) {
  const outgoingById = useMemo(() => outgoingInvoiceLookup(rows), [rows]);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-10 text-center">
        No invoices yet. Log a supplier bill or create a reimbursement invoice.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            {["Status", "Number", "Type", "Counterparty", "Property", "Issued", "Due", "Total", "Reimb.", ""].map(
              (h) => (
                <th key={h} className="pb-2 pr-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const effective = deriveStatus({
              direction: row.direction,
              status: row.status,
              due_date: row.due_date,
            });
            const days = daysUntilDue(row.due_date);
            return (
              <tr
                key={row.id}
                className="border-b border-border/50 hover:bg-muted/20 cursor-pointer"
                onClick={() => onOpen(row.id)}
              >
                <td className="py-2.5 pr-3">
                  <InvoiceStatusBadge direction={row.direction} status={row.status} due_date={row.due_date} />
                </td>
                <td className="py-2.5 pr-3 font-medium tabular-nums">{row.invoice_number}</td>
                <td className="py-2.5 pr-3 capitalize text-muted-foreground">
                  {row.direction === "incoming" ? "Bill" : "Reimb."}
                  {looksLikeMisclassifiedAgencyPayment(row) ? (
                    <span className="block text-[10px] text-amber-400 normal-case">Check type</span>
                  ) : null}
                </td>
                <td className="py-2.5 pr-3 max-w-[140px] truncate">{row.counterparty_name}</td>
                <td className="py-2.5 pr-3 max-w-[160px]">
                  {row.listing_id ? (
                    <Link
                      to={`/listings/${row.listing_id}`}
                      className="text-primary hover:underline truncate block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {row.property_address ?? "Listing"}
                    </Link>
                  ) : (
                    <span className="truncate block text-muted-foreground">{row.property_address ?? "—"}</span>
                  )}
                </td>
                <td className="py-2.5 pr-3 whitespace-nowrap tabular-nums">
                  {format(new Date(row.issue_date), "d MMM yyyy")}
                </td>
                <td className="py-2.5 pr-3 whitespace-nowrap">
                  <span className="tabular-nums">{format(new Date(row.due_date), "d MMM yyyy")}</span>
                  {effective === "overdue" && (
                    <span className="block text-[10px] text-red-400">{Math.abs(days)}d overdue</span>
                  )}
                </td>
                <td className="py-2.5 pr-3 tabular-nums font-medium">{formatInvoiceAud(row.total)}</td>
                <td className="py-2.5 pr-3">
                  {row.direction === "incoming" ? (
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {reimbursementStateLabel(
                        row,
                        row.reimbursement_invoice_id
                          ? outgoingById.get(row.reimbursement_invoice_id)
                          : null,
                      )}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2.5 pr-1" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onOpen(row.id)}>View</DropdownMenuItem>
                      {row.status !== "paid" && row.status !== "void" && (
                        <DropdownMenuItem onClick={() => onMarkPaid(row.id)}>
                          {markPaidActionLabel(row.direction)}
                        </DropdownMenuItem>
                      )}
                      {row.direction === "incoming" &&
                        row.status === "paid" &&
                        !row.reimbursement_invoice_id &&
                        row.reimbursable && (
                          <DropdownMenuItem onClick={() => onRaiseReimbursement(row.id)}>
                            Raise reimbursement
                          </DropdownMenuItem>
                        )}
                      <DropdownMenuItem onClick={() => onPrint(row.id)}>
                        <ExternalLink className="h-3.5 w-3.5 mr-2" /> Print / PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(row.id)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => onDelete(row.id)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
