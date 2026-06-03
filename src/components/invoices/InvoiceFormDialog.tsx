import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateInvoice,
  useUpdateInvoice,
  useUploadInvoiceFile,
  useNextOutgoingInvoiceNumber,
  useInvoice,
  formatInvoiceAud,
  type InvoiceDirection,
  type InvoiceLineItemInput,
} from "@/hooks/useInvoices";
import { useListings } from "@/hooks/useListings";
import { computeTotals, type InvoiceGstMode } from "@/lib/invoiceTotals";
import { DEFAULT_AGENCY_COUNTERPARTY, DEFAULT_REIMBURSEMENT_NOTE } from "@/lib/invoiceIssuer";
import { parseInvoicePdfFile } from "@/lib/parseInvoicePdf";
import type { ParsedInvoiceDraft } from "@/lib/parseInvoiceText";

type Mode = "create" | "edit" | "log_bill" | "new_outgoing";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  invoiceId?: string | null;
  onSaved?: (id: string) => void;
  initialFile?: File | null;
  initialDraft?: ParsedInvoiceDraft | null;
  onInitialConsumed?: () => void;
};

const emptyLine = (): InvoiceLineItemInput => ({
  description: "",
  quantity: 1,
  unit_price: 0,
  gst_rate: 10,
});

function matchListingByAddress(
  address: string | undefined,
  listings: { id: string; address?: string | null }[],
): string {
  if (!address?.trim()) return "";
  const needle = address.toLowerCase();
  const street = needle.split(",")[0]?.trim() ?? needle;
  const hit = listings.find((l) => {
    const hay = l.address?.toLowerCase() ?? "";
    return hay.includes(street) || needle.includes(hay.split(",")[0]?.trim() ?? "___");
  });
  return hit?.id ?? "";
}

export function InvoiceFormDialog({
  open,
  onOpenChange,
  mode,
  invoiceId,
  onSaved,
  initialFile,
  initialDraft,
  onInitialConsumed,
}: Props) {
  const { toast } = useToast();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const uploadFile = useUploadInvoiceFile();
  const { data: nextNumber } = useNextOutgoingInvoiceNumber();
  const { data: existing } = useInvoice(invoiceId ?? undefined);
  const { data: listings = [] } = useListings();

  const direction: InvoiceDirection =
    mode === "log_bill" ? "incoming" : "outgoing";

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [counterpartyAbn, setCounterpartyAbn] = useState("");
  const [listingId, setListingId] = useState<string>("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [issueDate, setIssueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [termsDays, setTermsDays] = useState(direction === "outgoing" ? "30" : "7");
  const [gstMode, setGstMode] = useState<InvoiceGstMode>(direction === "outgoing" ? "none" : "inclusive");
  const [reimbursable, setReimbursable] = useState(true);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<InvoiceLineItemInput[]>([emptyLine()]);
  const [file, setFile] = useState<File | null>(null);
  const [parsingPdf, setParsingPdf] = useState(false);
  const [detectedHint, setDetectedHint] = useState<string | null>(null);

  const applyDraft = useCallback(
    (draft: ParsedInvoiceDraft, fallbackOutgoingNumber?: string) => {
      if (draft.invoice_number) setInvoiceNumber(draft.invoice_number);
      else if (direction === "outgoing" && fallbackOutgoingNumber) setInvoiceNumber(fallbackOutgoingNumber);

      if (draft.counterparty_name) setCounterparty(draft.counterparty_name);
      if (draft.counterparty_abn) setCounterpartyAbn(draft.counterparty_abn);

      if (draft.property_address) {
        setPropertyAddress(draft.property_address);
        const matched = matchListingByAddress(draft.property_address, listings);
        if (matched) setListingId(matched);
      }

      if (draft.issue_date) setIssueDate(draft.issue_date);
      if (draft.terms_days != null) setTermsDays(String(draft.terms_days));
      if (draft.gst_mode) setGstMode(draft.gst_mode);
      if (draft.notes) setNotes(draft.notes);
      if (draft.line_items?.length) {
        setLines(
          draft.line_items.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unit_price: l.unit_price,
            gst_rate: l.gst_rate ?? (draft.gst_mode === "none" ? 0 : 10),
          })),
        );
      }
      if (draft.direction === "incoming") setReimbursable(true);

      const count = draft.detected_fields.filter((f) => f !== "gst_mode").length;
      setDetectedHint(
        count > 0 ? `Detected ${count} field${count === 1 ? "" : "s"} from PDF — review before saving.` : null,
      );
    },
    [direction, listings],
  );

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && existing) {
      setInvoiceNumber(existing.invoice_number);
      setCounterparty(existing.counterparty_name);
      setCounterpartyAbn(existing.counterparty_abn ?? "");
      setListingId(existing.listing_id ?? "");
      setPropertyAddress(existing.property_address ?? "");
      setIssueDate(existing.issue_date.slice(0, 10));
      setTermsDays(String(existing.terms_days));
      setGstMode(existing.gst_mode);
      setReimbursable(existing.reimbursable);
      setNotes(existing.notes ?? "");
      setLines(
        existing.line_items?.length
          ? existing.line_items.map((l) => ({
              description: l.description,
              quantity: Number(l.quantity),
              unit_price: Number(l.unit_price),
              gst_rate: Number(l.gst_rate),
            }))
          : [emptyLine()],
      );
      setFile(null);
      setDetectedHint(null);
      return;
    }
    setInvoiceNumber(direction === "outgoing" ? (nextNumber ?? "INV-001") : "");
    setCounterparty(direction === "outgoing" ? DEFAULT_AGENCY_COUNTERPARTY.name : "");
    setCounterpartyAbn("");
    setListingId("");
    setPropertyAddress("");
    setIssueDate(format(new Date(), "yyyy-MM-dd"));
    setTermsDays(direction === "outgoing" ? "30" : "7");
    setGstMode(direction === "outgoing" ? "none" : "inclusive");
    setReimbursable(true);
    setNotes(direction === "outgoing" ? DEFAULT_REIMBURSEMENT_NOTE : "");
    setLines([emptyLine()]);
    setFile(null);
    setDetectedHint(null);
  }, [open, mode, existing, nextNumber, direction]);

  useEffect(() => {
    if (!open || mode === "edit" || !initialDraft) return;
    applyDraft(initialDraft, nextNumber ?? undefined);
    if (initialFile) setFile(initialFile);
    onInitialConsumed?.();
  }, [open, mode, initialDraft, initialFile, nextNumber, applyDraft, onInitialConsumed]);

  const totals = useMemo(() => computeTotals(lines, gstMode), [lines, gstMode]);

  const title =
    mode === "edit"
      ? "Edit invoice"
      : mode === "log_bill"
        ? "Log supplier bill"
        : "New reimbursement invoice";

  const handlePdfFile = async (selected: File | null) => {
    setFile(selected);
    if (!selected || mode === "edit") return;

    setParsingPdf(true);
    setDetectedHint(null);
    try {
      const draft = await parseInvoicePdfFile(selected);
      applyDraft(draft, nextNumber ?? undefined);
      toast({
        title: "Invoice details detected",
        description: "Fields were pre-filled from the PDF. Review and edit before saving.",
      });
    } catch (err) {
      toast({
        title: "Could not read PDF",
        description: err instanceof Error ? err.message : "Failed to extract invoice details",
        variant: "destructive",
      });
    } finally {
      setParsingPdf(false);
    }
  };

  const save = async () => {
    if (!invoiceNumber.trim() || !counterparty.trim()) {
      toast({ title: "Number and counterparty required", variant: "destructive" });
      return;
    }
    const validLines = lines.filter((l) => l.description.trim());
    if (!validLines.length) {
      toast({ title: "Add at least one line item", variant: "destructive" });
      return;
    }
    try {
      if (mode === "edit" && invoiceId) {
        await updateInvoice.mutateAsync({
          id: invoiceId,
          patch: {
            invoice_number: invoiceNumber.trim(),
            counterparty_name: counterparty.trim(),
            counterparty_abn: counterpartyAbn.trim() || null,
            listing_id: listingId || null,
            property_address: propertyAddress.trim() || null,
            issue_date: issueDate,
            terms_days: Number(termsDays) || 30,
            gst_mode: gstMode,
            reimbursable,
            notes: notes.trim() || null,
          },
          line_items: validLines,
        });
        if (file) await uploadFile.mutateAsync({ invoiceId, file });
        toast({ title: "Invoice updated" });
        onSaved?.(invoiceId);
      } else {
        const created = await createInvoice.mutateAsync({
          direction,
          invoice_number: invoiceNumber.trim(),
          counterparty_name: counterparty.trim(),
          counterparty_abn: counterpartyAbn.trim() || null,
          listing_id: listingId || null,
          property_address: propertyAddress.trim() || null,
          issue_date: issueDate,
          terms_days: Number(termsDays) || 30,
          gst_mode: gstMode,
          reimbursable,
          notes: notes.trim() || null,
          source: mode === "new_outgoing" ? "generated" : "uploaded",
          status: direction === "outgoing" ? "draft" : "unpaid",
          line_items: validLines,
        });
        if (file) await uploadFile.mutateAsync({ invoiceId: created.id, file });
        toast({ title: direction === "incoming" ? "Bill logged" : "Invoice created" });
        onSaved?.(created.id);
      }
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Could not save",
        description: err instanceof Error ? err.message : "Failed",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[min(92vh,900px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-1.5 rounded-lg border border-dashed border-border p-3 bg-muted/30">
          <Label htmlFor="invoice-pdf-upload">Upload PDF to auto-fill</Label>
          <Input
            id="invoice-pdf-upload"
            type="file"
            accept="application/pdf"
            disabled={parsingPdf}
            onChange={(e) => void handlePdfFile(e.target.files?.[0] ?? null)}
          />
          {parsingPdf ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading invoice details…
            </p>
          ) : detectedHint ? (
            <p className="text-xs text-primary">{detectedHint}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Works with text-based PDFs (supplier bills and reimbursement invoices).
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Invoice number</Label>
            <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Counterparty</Label>
            <Input value={counterparty} onChange={(e) => setCounterparty(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>ABN</Label>
            <Input value={counterpartyAbn} onChange={(e) => setCounterpartyAbn(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Listing</Label>
            <Select
              value={listingId || "__none__"}
              onValueChange={(v) => {
                const id = v === "__none__" ? "" : v;
                setListingId(id);
                const listing = listings.find((l) => l.id === id);
                if (listing?.address) setPropertyAddress(listing.address);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {listings.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Property address</Label>
            <Input value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Issue date</Label>
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Terms (days)</Label>
            <Input value={termsDays} onChange={(e) => setTermsDays(e.target.value)} inputMode="numeric" />
          </div>
          <div className="space-y-1.5">
            <Label>GST mode</Label>
            <Select value={gstMode} onValueChange={(v) => setGstMode(v as InvoiceGstMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="inclusive">Inclusive</SelectItem>
                <SelectItem value="exclusive">Exclusive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {direction === "incoming" && (
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={reimbursable} onCheckedChange={setReimbursable} id="reimbursable" />
              <Label htmlFor="reimbursable">Reimbursable from agency</Label>
            </div>
          )}
        </div>

        <div className="space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <Label>Line items</Label>
            <Button type="button" variant="outline" size="sm" onClick={() => setLines((l) => [...l, emptyLine()])}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add line
            </Button>
          </div>
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-[1fr_72px_100px_32px] gap-2 items-end">
              <Input
                placeholder="Description"
                value={line.description}
                onChange={(e) =>
                  setLines((rows) => rows.map((r, j) => (j === i ? { ...r, description: e.target.value } : r)))
                }
              />
              <Input
                placeholder="Qty"
                inputMode="decimal"
                value={String(line.quantity ?? 1)}
                onChange={(e) =>
                  setLines((rows) =>
                    rows.map((r, j) => (j === i ? { ...r, quantity: Number(e.target.value) || 1 } : r)),
                  )
                }
              />
              <Input
                placeholder="Amount"
                inputMode="decimal"
                value={String(line.unit_price || "")}
                onChange={(e) =>
                  setLines((rows) =>
                    rows.map((r, j) => (j === i ? { ...r, unit_price: Number(e.target.value) || 0 } : r)),
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setLines((rows) => rows.filter((_, j) => j !== i))}
                disabled={lines.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <p className="text-sm text-muted-foreground text-right tabular-nums">
            Total {formatInvoiceAud(totals.total)}
            {totals.gstAmount != null ? ` (GST ${formatInvoiceAud(totals.gstAmount)})` : ""}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={createInvoice.isPending || updateInvoice.isPending || parsingPdf}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
