import { Badge } from "@/components/ui/badge";
import { deriveStatus, statusBadgeVariant, statusLabel } from "@/lib/invoiceStatus";
import type { InvoiceDirection, InvoiceStoredStatus } from "@/hooks/useInvoices";

type Props = {
  direction: InvoiceDirection;
  status: InvoiceStoredStatus;
  due_date: string;
};

export function InvoiceStatusBadge({ direction, status, due_date }: Props) {
  const effective = deriveStatus({ direction, status, due_date });
  return (
    <Badge variant={statusBadgeVariant(effective)} className="font-normal text-[10px] uppercase tracking-wide">
      {statusLabel(effective)}
    </Badge>
  );
}
