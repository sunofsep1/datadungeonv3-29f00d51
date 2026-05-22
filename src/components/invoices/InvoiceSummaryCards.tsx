import { Card } from "@/components/ui/card";
import { formatInvoiceAud } from "@/hooks/useInvoices";
import type { RecoverablePosition } from "@/lib/recoverablePosition";

type Props = {
  summary: RecoverablePosition;
  loading?: boolean;
};

export function InvoiceSummaryCards({ summary, loading }: Props) {
  const cards = [
    {
      label: "Owed to me",
      value: summary.owedToMe,
      hint: "Sent reimbursements + unlinked bills",
      accent: "text-primary",
    },
    {
      label: "Overdue",
      value: summary.overdue,
      hint: "Past due, unpaid by agency",
      accent: "text-red-400",
    },
    {
      label: "Unbilled costs",
      value: summary.unbilledCosts,
      hint: "Paid trades — raise invoice",
      accent: "text-amber-400",
    },
    {
      label: "Out of pocket",
      value: summary.outOfPocket,
      hint: "Paid suppliers − reimbursements received",
      accent: summary.outOfPocket > 0 ? "text-amber-300" : "text-emerald-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ label, value, hint, accent }) => (
        <Card key={label} className="zoho-card p-4 border-border">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
          <p className={`text-2xl font-bold tabular-nums mt-1 ${accent}`}>
            {loading ? "—" : formatInvoiceAud(value)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>
        </Card>
      ))}
    </div>
  );
}
