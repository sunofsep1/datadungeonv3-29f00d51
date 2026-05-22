import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErrorMessage } from "@/lib/supabaseErrorMessage";
import { computeTotals, lineItemAmount, type InvoiceGstMode } from "@/lib/invoiceTotals";
import { computeDueDate } from "@/lib/invoiceStatus";
import { nextInvoiceNumber } from "@/lib/invoiceNumber";
import { DEFAULT_AGENCY_COUNTERPARTY, DEFAULT_REIMBURSEMENT_NOTE } from "@/lib/invoiceIssuer";
import { computeRecoverablePosition, type RecoverablePosition } from "@/lib/recoverablePosition";

const BUCKET = "invoices";
const SIGNED_URL_EXPIRY = 60 * 60;

export type InvoiceDirection = "incoming" | "outgoing";
export type InvoiceStoredStatus =
  | "draft"
  | "sent"
  | "paid"
  | "overdue"
  | "void"
  | "unpaid";
export type InvoiceSource = "uploaded" | "generated";

export type InvoiceLineItem = {
  id: string;
  invoice_id: string;
  user_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  amount: number;
  position: number;
  created_at: string;
};

export type Invoice = {
  id: string;
  user_id: string;
  direction: InvoiceDirection;
  invoice_number: string;
  status: InvoiceStoredStatus;
  source: InvoiceSource;
  reimbursable: boolean;
  reimbursement_invoice_id: string | null;
  counterparty_name: string;
  counterparty_abn: string | null;
  listing_id: string | null;
  contact_id: string | null;
  property_address: string | null;
  issue_date: string;
  terms_days: number;
  due_date: string;
  currency: string;
  gst_mode: InvoiceGstMode;
  subtotal: number;
  gst_amount: number | null;
  total: number;
  notes: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  paid_date: string | null;
  paid_amount: number | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceWithMeta = Invoice & {
  line_items?: InvoiceLineItem[];
  signed_file_url?: string | null;
  linked_bills?: Invoice[];
  reimbursement_invoice?: Invoice | null;
};

export type InvoiceLineItemInput = {
  description: string;
  quantity?: number;
  unit_price: number;
  gst_rate?: number;
  position?: number;
};

export type InvoiceFilters = {
  direction?: InvoiceDirection | "all";
  tab?: "all" | "owed" | "to_invoice" | "bills" | "closed";
  status?: InvoiceStoredStatus | "all";
  search?: string;
  listingId?: string;
};

function isMissingTable(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code?: string }).code === "42P01"
  );
}

async function signedUrlFor(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_EXPIRY);
  return data?.signedUrl ?? null;
}

function matchesFilters(row: Invoice, filters?: InvoiceFilters): boolean {
  if (!filters) return true;
  if (filters.direction && filters.direction !== "all" && row.direction !== filters.direction) {
    return false;
  }
  if (filters.listingId && row.listing_id !== filters.listingId) return false;
  if (filters.status && filters.status !== "all" && row.status !== filters.status) return false;
  const q = filters.search?.trim().toLowerCase();
  if (q) {
    const hay = [
      row.invoice_number,
      row.counterparty_name,
      row.property_address ?? "",
    ]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (filters.tab === "owed") {
    return row.direction === "outgoing" && (row.status === "sent" || row.status === "overdue");
  }
  if (filters.tab === "to_invoice") {
    return (
      row.direction === "incoming" &&
      row.reimbursable &&
      row.status === "paid" &&
      !row.reimbursement_invoice_id
    );
  }
  if (filters.tab === "bills") return row.direction === "incoming";
  if (filters.tab === "closed") return row.status === "paid" || row.status === "void";
  return true;
}

export function useInvoices(filters?: InvoiceFilters) {
  return useQuery({
    queryKey: ["invoices", filters ?? {}],
    queryFn: async (): Promise<Invoice[]> => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("issue_date", { ascending: false });
      if (error) {
        if (isMissingTable(error)) return [];
        throw new Error(supabaseErrorMessage(error));
      }
      return ((data ?? []) as Invoice[]).filter((row) => matchesFilters(row, filters));
    },
  });
}

export function useListingInvoices(listingId: string | undefined) {
  return useQuery({
    queryKey: ["listing_invoices", listingId ?? ""],
    queryFn: async (): Promise<Invoice[]> => {
      if (!listingId) return [];
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("listing_id", listingId)
        .order("issue_date", { ascending: false });
      if (error) {
        if (isMissingTable(error)) return [];
        throw new Error(supabaseErrorMessage(error));
      }
      return (data ?? []) as Invoice[];
    },
    enabled: !!listingId,
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ["invoice", id ?? ""],
    queryFn: async (): Promise<InvoiceWithMeta | null> => {
      if (!id) return null;
      const { data: header, error } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
      if (error) {
        if (isMissingTable(error)) return null;
        throw new Error(supabaseErrorMessage(error));
      }
      if (!header) return null;
      const invoice = header as Invoice;

      const { data: items } = await supabase
        .from("invoice_line_items")
        .select("*")
        .eq("invoice_id", id)
        .order("position", { ascending: true });

      let linked_bills: Invoice[] = [];
      let reimbursement_invoice: Invoice | null = null;

      if (invoice.direction === "outgoing") {
        const { data: bills } = await supabase
          .from("invoices")
          .select("*")
          .eq("reimbursement_invoice_id", id);
        linked_bills = (bills ?? []) as Invoice[];
      } else if (invoice.reimbursement_invoice_id) {
        const { data: parent } = await supabase
          .from("invoices")
          .select("*")
          .eq("id", invoice.reimbursement_invoice_id)
          .maybeSingle();
        reimbursement_invoice = (parent as Invoice) ?? null;
      }

      return {
        ...invoice,
        line_items: (items ?? []) as InvoiceLineItem[],
        signed_file_url: await signedUrlFor(invoice.file_path),
        linked_bills,
        reimbursement_invoice,
      };
    },
    enabled: !!id,
  });
}

export function useInvoiceSummary() {
  return useQuery({
    queryKey: ["invoice_summary"],
    queryFn: async (): Promise<RecoverablePosition> => {
      const { data, error } = await supabase.from("invoices").select("*");
      if (error) {
        if (isMissingTable(error)) {
          return { owedToMe: 0, overdue: 0, unbilledCosts: 0, outOfPocket: 0 };
        }
        throw new Error(supabaseErrorMessage(error));
      }
      return computeRecoverablePosition((data ?? []) as Invoice[]);
    },
  });
}

export type CreateInvoiceInput = {
  direction: InvoiceDirection;
  invoice_number: string;
  status?: InvoiceStoredStatus;
  source?: InvoiceSource;
  reimbursable?: boolean;
  counterparty_name: string;
  counterparty_abn?: string | null;
  listing_id?: string | null;
  contact_id?: string | null;
  property_address?: string | null;
  issue_date: string;
  terms_days?: number;
  gst_mode?: InvoiceGstMode;
  notes?: string | null;
  line_items: InvoiceLineItemInput[];
};

async function insertLineItems(
  invoiceId: string,
  userId: string,
  items: InvoiceLineItemInput[],
) {
  if (!items.length) return;
  const rows = items.map((item, index) => ({
    invoice_id: invoiceId,
    user_id: userId,
    description: item.description.trim(),
    quantity: item.quantity ?? 1,
    unit_price: item.unit_price,
    gst_rate: item.gst_rate ?? 0,
    amount: lineItemAmount(item),
    position: item.position ?? index,
  }));
  const { error } = await supabase.from("invoice_line_items").insert(rows);
  if (error) throw new Error(supabaseErrorMessage(error));
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateInvoiceInput) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const terms = input.terms_days ?? (input.direction === "outgoing" ? 30 : 7);
      const gstMode = input.gst_mode ?? (input.direction === "outgoing" ? "none" : "inclusive");
      const totals = computeTotals(input.line_items, gstMode);
      const status =
        input.status ??
        (input.direction === "incoming" ? "unpaid" : "draft");

      const { data, error } = await supabase
        .from("invoices")
        .insert({
          user_id: auth.user.id,
          direction: input.direction,
          invoice_number: input.invoice_number.trim(),
          status,
          source: input.source ?? "uploaded",
          reimbursable: input.reimbursable ?? true,
          counterparty_name: input.counterparty_name.trim(),
          counterparty_abn: input.counterparty_abn?.trim() || null,
          listing_id: input.listing_id ?? null,
          contact_id: input.contact_id ?? null,
          property_address: input.property_address?.trim() || null,
          issue_date: input.issue_date,
          terms_days: terms,
          due_date: computeDueDate(input.issue_date, terms),
          gst_mode: gstMode,
          subtotal: totals.subtotal,
          gst_amount: totals.gstAmount,
          total: totals.total,
          notes: input.notes?.trim() || null,
        })
        .select()
        .single();
      if (error) throw new Error(supabaseErrorMessage(error));
      await insertLineItems(data.id, auth.user.id, input.line_items);
      return data as Invoice;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice_summary"] });
      qc.invalidateQueries({ queryKey: ["listing_invoices"] });
    },
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      patch: Partial<Invoice>;
      line_items?: InvoiceLineItemInput[];
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");

      let patch = { ...input.patch } as Record<string, unknown>;
      if (input.line_items) {
        const gstMode = (input.patch.gst_mode as InvoiceGstMode) ?? "none";
        const totals = computeTotals(input.line_items, gstMode);
        patch = {
          ...patch,
          subtotal: totals.subtotal,
          gst_amount: totals.gstAmount,
          total: totals.total,
        };
        await supabase.from("invoice_line_items").delete().eq("invoice_id", input.id);
        await insertLineItems(input.id, auth.user.id, input.line_items);
      }
      if (patch.issue_date && patch.terms_days != null) {
        patch.due_date = computeDueDate(String(patch.issue_date), Number(patch.terms_days));
      }

      const { data, error } = await supabase
        .from("invoices")
        .update(patch)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw new Error(supabaseErrorMessage(error));
      return data as Invoice;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice", data.id] });
      qc.invalidateQueries({ queryKey: ["invoice_summary"] });
      qc.invalidateQueries({ queryKey: ["listing_invoices"] });
    },
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw new Error(supabaseErrorMessage(error));
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice_summary"] });
      qc.invalidateQueries({ queryKey: ["listing_invoices"] });
    },
  });
}

export function useUploadInvoiceFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, file }: { invoiceId: string; file: File }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${auth.user.id}/${invoiceId}/${crypto.randomUUID()}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw new Error(supabaseErrorMessage(upErr));
      const { data, error } = await supabase
        .from("invoices")
        .update({
          file_path: path,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
        })
        .eq("id", invoiceId)
        .select()
        .single();
      if (error) throw new Error(supabaseErrorMessage(error));
      return data as Invoice;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["invoice", data.id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useMarkInvoicePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; paid_date?: string; paid_amount?: number }) => {
      const { data: row } = await supabase.from("invoices").select("*").eq("id", input.id).maybeSingle();
      if (!row) throw new Error("Invoice not found");
      const invoice = row as Invoice;
      const paidAmount = input.paid_amount ?? invoice.total;
      const { data, error } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          paid_date: input.paid_date ?? new Date().toISOString().slice(0, 10),
          paid_amount: paidAmount,
        })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw new Error(supabaseErrorMessage(error));
      return data as Invoice;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice", data.id] });
      qc.invalidateQueries({ queryKey: ["invoice_summary"] });
      qc.invalidateQueries({ queryKey: ["listing_invoices"] });
    },
  });
}

export function useRaiseReimbursementInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (incomingIds: string[]) => {
      if (!incomingIds.length) throw new Error("Select at least one bill");
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");

      const { data: bills, error: billsErr } = await supabase
        .from("invoices")
        .select("*")
        .in("id", incomingIds);
      if (billsErr) throw new Error(supabaseErrorMessage(billsErr));
      const incoming = (bills ?? []) as Invoice[];
      if (incoming.length !== incomingIds.length) throw new Error("Some bills not found");

      for (const bill of incoming) {
        if (bill.direction !== "incoming") throw new Error("Only supplier bills can be reimbursed");
        if (bill.status !== "paid") throw new Error("All bills must be marked paid first");
        if (bill.reimbursement_invoice_id) throw new Error("A bill is already invoiced");
      }

      const { data: outgoingRows } = await supabase
        .from("invoices")
        .select("invoice_number")
        .eq("direction", "outgoing");
      const invoice_number = nextInvoiceNumber(
        ((outgoingRows ?? []) as { invoice_number: string }[]).map((r) => r.invoice_number),
      );

      const first = incoming[0];
      const property_address =
        incoming.find((b) => b.property_address)?.property_address ?? first.property_address;
      const listing_id = incoming.find((b) => b.listing_id)?.listing_id ?? first.listing_id;
      const contact_id = incoming.find((b) => b.contact_id)?.contact_id ?? first.contact_id;
      const issue_date = new Date().toISOString().slice(0, 10);
      const line_items: InvoiceLineItemInput[] = incoming.map((bill, index) => ({
        description: bill.property_address
          ? `${bill.property_address} — ${bill.counterparty_name} (${bill.invoice_number})`
          : `${bill.counterparty_name} — ${bill.invoice_number}`,
        quantity: 1,
        unit_price: Number(bill.total),
        position: index,
      }));
      const totals = computeTotals(line_items, "none");

      const { data: created, error: createErr } = await supabase
        .from("invoices")
        .insert({
          user_id: auth.user.id,
          direction: "outgoing",
          invoice_number,
          status: "draft",
          source: "generated",
          reimbursable: true,
          counterparty_name: DEFAULT_AGENCY_COUNTERPARTY.name,
          listing_id,
          contact_id,
          property_address,
          issue_date,
          terms_days: 30,
          due_date: computeDueDate(issue_date, 30),
          gst_mode: "none",
          subtotal: totals.subtotal,
          gst_amount: null,
          total: totals.total,
          notes: DEFAULT_REIMBURSEMENT_NOTE,
        })
        .select()
        .single();
      if (createErr) throw new Error(supabaseErrorMessage(createErr));

      await insertLineItems(created.id, auth.user.id, line_items);

      const { error: linkErr } = await supabase
        .from("invoices")
        .update({ reimbursement_invoice_id: created.id })
        .in("id", incomingIds);
      if (linkErr) throw new Error(supabaseErrorMessage(linkErr));

      return created as Invoice;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice", data.id] });
      qc.invalidateQueries({ queryKey: ["invoice_summary"] });
      qc.invalidateQueries({ queryKey: ["listing_invoices"] });
    },
  });
}

export function useNextOutgoingInvoiceNumber() {
  return useQuery({
    queryKey: ["invoice_next_number"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("invoice_number")
        .eq("direction", "outgoing");
      if (error) {
        if (isMissingTable(error)) return "INV-001";
        throw new Error(supabaseErrorMessage(error));
      }
      return nextInvoiceNumber(((data ?? []) as { invoice_number: string }[]).map((r) => r.invoice_number));
    },
  });
}

export function formatInvoiceAud(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(Number(value));
}
