import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatInvoiceAud, useListingInvoices } from "@/hooks/useInvoices";
import { computeRecoverablePosition } from "@/lib/recoverablePosition";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";

type Props = { listingId: string };

export function ListingInvoicesPanel({ listingId }: Props) {
  const { data: rows = [], isLoading } = useListingInvoices(listingId);
  const position = computeRecoverablePosition(rows);

  return (
    <Card className="zoho-card p-5 border-border">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Invoicing
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Reimbursable position on this listing
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
          <Link to="/invoices">All invoices</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-xs">
        {[
          { label: "Owed to me", value: position.owedToMe },
          { label: "Unbilled", value: position.unbilledCosts },
          { label: "Overdue", value: position.overdue },
          { label: "Out of pocket", value: position.outOfPocket },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border/60 bg-muted/15 px-2.5 py-2">
            <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
            <p className="font-semibold tabular-nums">{formatInvoiceAud(value)}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invoices linked to this listing yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.slice(0, 6).map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-2 text-sm border-b border-border/50 pb-2 last:border-0">
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {row.invoice_number} · {row.counterparty_name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(row.issue_date), "d MMM yyyy")} · {row.direction === "incoming" ? "Bill" : "Reimb."}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="tabular-nums text-[10px]">
                  {formatInvoiceAud(row.total)}
                </Badge>
                <InvoiceStatusBadge direction={row.direction} status={row.status} due_date={row.due_date} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
