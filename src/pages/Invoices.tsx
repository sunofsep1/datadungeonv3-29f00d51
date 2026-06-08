import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileUp, Loader2, Plus, Receipt } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { InvoiceSummaryCards } from "@/components/invoices/InvoiceSummaryCards";
import { InvoiceList } from "@/components/invoices/InvoiceList";
import { InvoiceFormDialog } from "@/components/invoices/InvoiceFormDialog";
import { InvoiceDetailSheet } from "@/components/invoices/InvoiceDetailSheet";
import { RaiseReimbursementDialog } from "@/components/invoices/RaiseReimbursementDialog";
import {
  useDeleteInvoice,
  useInvoices,
  useInvoiceSummary,
  useMarkInvoicePaid,
  formatInvoiceAud,
  type InvoiceFilters,
} from "@/hooks/useInvoices";
import { parseInvoicePdfFile } from "@/lib/parseInvoicePdf";
import type { ParsedInvoiceDraft } from "@/lib/parseInvoiceText";

type FormMode = "create" | "edit" | "log_bill" | "new_outgoing";

export default function Invoices() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const markPaid = useMarkInvoicePaid();
  const deleteInvoice = useDeleteInvoice();

  const [tab, setTab] = useState<InvoiceFilters["tab"]>("all");
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState<"all" | "incoming" | "outgoing">("all");

  const filters = useMemo(
    (): InvoiceFilters => ({ tab, search, direction }),
    [tab, search, direction],
  );

  const { data: rows = [], isLoading } = useInvoices(filters);
  const { data: summary, isLoading: summaryLoading } = useInvoiceSummary();

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("new_outgoing");
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [raisePreselect, setRaisePreselect] = useState<string[]>([]);
  const [initialFile, setInitialFile] = useState<File | null>(null);
  const [initialDraft, setInitialDraft] = useState<ParsedInvoiceDraft | null>(null);
  const [uploadParsing, setUploadParsing] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  const openForm = (mode: FormMode, id?: string) => {
    setDetailId(null);
    setFormMode(mode);
    setEditId(id ?? null);
    setInitialFile(null);
    setInitialDraft(null);
    // Defer so the opening click isn't treated as an outside dismiss (sheet → dialog).
    window.setTimeout(() => setFormOpen(true), 0);
  };

  const handleUploadPdf = async (file: File) => {
    setUploadParsing(true);
    try {
      const draft = await parseInvoicePdfFile(file);
      setInitialFile(file);
      setInitialDraft(draft);
      setFormMode(draft.direction === "outgoing" ? "new_outgoing" : "log_bill");
      setEditId(null);
      setFormOpen(true);
      toast({
        title: "Invoice details detected",
        description: "Review the pre-filled fields before saving.",
      });
    } catch (err) {
      toast({
        title: "Could not read PDF",
        description: err instanceof Error ? err.message : "Failed to extract invoice details",
        variant: "destructive",
      });
    } finally {
      setUploadParsing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Invoicing" />

      <div className="flex flex-wrap gap-2">
        <Button className="gap-1.5" onClick={() => openForm("new_outgoing")}>
          <Plus className="h-4 w-4" /> New invoice
        </Button>
        <Button variant="outline" className="gap-1.5" onClick={() => openForm("log_bill")}>
          <Receipt className="h-4 w-4" /> Log a bill
        </Button>
        <Button
          variant="outline"
          className="gap-1.5"
          disabled={uploadParsing}
          onClick={() => uploadRef.current?.click()}
        >
          {uploadParsing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileUp className="h-4 w-4" />
          )}
          Upload PDF
        </Button>
        <input
          ref={uploadRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUploadPdf(file);
            e.target.value = "";
          }}
        />
        <Button
          variant="outline"
          className="gap-1.5"
          onClick={() => {
            setRaisePreselect([]);
            setRaiseOpen(true);
          }}
        >
          <FileUp className="h-4 w-4" /> Raise reimbursement
        </Button>
      </div>

      <InvoiceSummaryCards
        summary={summary ?? { owedToMe: 0, overdue: 0, unbilledCosts: 0, outOfPocket: 0 }}
        loading={summaryLoading}
      />

      <Card className="zoho-card p-4 border-border space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <Tabs value={tab} onValueChange={(v) => setTab(v as InvoiceFilters["tab"])}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="owed" className="text-xs">Owed to me</TabsTrigger>
              <TabsTrigger value="to_invoice" className="text-xs">To invoice</TabsTrigger>
              <TabsTrigger value="bills" className="text-xs">Bills</TabsTrigger>
              <TabsTrigger value="closed" className="text-xs">Paid / closed</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search number, counterparty, address…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full sm:w-56"
            />
            <Select value={direction} onValueChange={(v) => setDirection(v as typeof direction)}>
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="incoming">Bills</SelectItem>
                <SelectItem value="outgoing">Reimbursements</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading invoices…</p>
        ) : (
          <InvoiceList
            rows={rows}
            onOpen={(id) => setDetailId(id)}
            onMarkPaid={(id) => {
              const row = rows.find((r) => r.id === id);
              void markPaid
                .mutateAsync({ id })
                .then(() =>
                  toast({
                    title:
                      row?.direction === "outgoing" ? "Payment received" : "Bill marked paid",
                    description:
                      row?.direction === "outgoing"
                        ? "Out of pocket has been updated."
                        : undefined,
                  }),
                );
            }}
            onRaiseReimbursement={(id) => {
              setRaisePreselect([id]);
              setRaiseOpen(true);
            }}
            onEdit={(id) => openForm("edit", id)}
            onDelete={(id) => {
              const row = rows.find((r) => r.id === id);
              const label = row ? `${row.invoice_number} (${formatInvoiceAud(row.total)})` : "this invoice";
              if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
              void deleteInvoice.mutateAsync(id).then(() => toast({ title: "Invoice deleted" }));
            }}
            onPrint={(id) => navigate(`/invoices/${id}/print`)}
          />
        )}
      </Card>

      <InvoiceFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditId(null);
        }}
        mode={formMode}
        invoiceId={editId}
        onSaved={(id) => setDetailId(id)}
        initialFile={initialFile}
        initialDraft={initialDraft}
        onInitialConsumed={() => {
          setInitialFile(null);
          setInitialDraft(null);
        }}
      />

      <InvoiceDetailSheet
        invoiceId={detailId}
        open={!!detailId}
        onOpenChange={(o) => !o && setDetailId(null)}
        onEdit={(id) => openForm("edit", id)}
        onDelete={(id) =>
          void deleteInvoice.mutateAsync(id).then(() => toast({ title: "Invoice deleted" }))
        }
        onPrint={(id) => navigate(`/invoices/${id}/print`)}
        onRaiseReimbursement={(id) => {
          setRaisePreselect([id]);
          setRaiseOpen(true);
        }}
      />

      <RaiseReimbursementDialog
        open={raiseOpen}
        onOpenChange={setRaiseOpen}
        preselectedIds={raisePreselect}
        onCreated={(id) => setDetailId(id)}
      />
    </div>
  );
}
