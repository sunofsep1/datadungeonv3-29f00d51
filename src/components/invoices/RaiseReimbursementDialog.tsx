import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  formatInvoiceAud,
  useInvoices,
  useRaiseReimbursementInvoice,
} from "@/hooks/useInvoices";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedIds?: string[];
  onCreated?: (id: string) => void;
};

export function RaiseReimbursementDialog({
  open,
  onOpenChange,
  preselectedIds = [],
  onCreated,
}: Props) {
  const { toast } = useToast();
  const raise = useRaiseReimbursementInvoice();
  const { data: all = [] } = useInvoices({ tab: "to_invoice" });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const eligible = useMemo(
    () =>
      all.filter(
        (r) =>
          r.direction === "incoming" &&
          r.status === "paid" &&
          r.reimbursable &&
          !r.reimbursement_invoice_id,
      ),
    [all],
  );

  const effectiveSelected = useMemo(() => {
    const s = new Set(selected);
    for (const id of preselectedIds) s.add(id);
    return s;
  }, [selected, preselectedIds]);

  const selectedRows = eligible.filter((r) => effectiveSelected.has(r.id));
  const total = selectedRows.reduce((n, r) => n + Number(r.total), 0);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirm = async () => {
    const ids = [...effectiveSelected];
    if (!ids.length) {
      toast({ title: "Select at least one bill", variant: "destructive" });
      return;
    }
    try {
      const created = await raise.mutateAsync(ids);
      toast({ title: "Reimbursement invoice created", description: created.invoice_number });
      onCreated?.(created.id);
      onOpenChange(false);
      setSelected(new Set());
    } catch (err) {
      toast({
        title: "Could not raise invoice",
        description: err instanceof Error ? err.message : "Failed",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Raise reimbursement invoice</DialogTitle>
        </DialogHeader>
        {eligible.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No paid, unbilled supplier bills. Mark bills as paid first.
          </p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {eligible.map((row) => (
              <li key={row.id} className="flex items-start gap-2 rounded border border-border/60 p-2 text-sm">
                <Checkbox
                  checked={effectiveSelected.has(row.id)}
                  onCheckedChange={() => toggle(row.id)}
                  className="mt-0.5"
                />
                <div className="min-w-0">
                  <p className="font-medium">{row.invoice_number} · {row.counterparty_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{row.property_address ?? "—"}</p>
                  <p className="text-xs tabular-nums mt-0.5">{formatInvoiceAud(row.total)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm font-medium tabular-nums">Total {formatInvoiceAud(total)}</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void confirm()} disabled={raise.isPending || selectedRows.length === 0}>
            Create draft invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
