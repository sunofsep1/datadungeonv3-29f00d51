import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useListingMarketingFunds,
  useListingCampaignExpenses,
  useCreateListingMarketingFund,
  useDeleteListingMarketingFund,
  useCreateListingCampaignExpense,
  useDeleteListingCampaignExpense,
} from "@/hooks/useListingMarketingFunds";
import {
  EXPENSE_CATEGORIES,
  expenseCategoryLabel,
  formatMarketingAud,
  parseMoneyInput,
  summarizeMarketingFunds,
} from "@/lib/listingMarketingFunds";
import { cn } from "@/lib/utils";

type Props = { listingId: string };

export function ListingMarketingFundsPanel({ listingId }: Props) {
  const { toast } = useToast();
  const { data: funds = [], isLoading: fundsLoading } = useListingMarketingFunds(listingId);
  const { data: expenses = [], isLoading: expensesLoading } = useListingCampaignExpenses(listingId);
  const createFund = useCreateListingMarketingFund();
  const deleteFund = useDeleteListingMarketingFund();
  const createExpense = useCreateListingCampaignExpense();
  const deleteExpense = useDeleteListingCampaignExpense();

  const [fundOpen, setFundOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);

  const [fundDate, setFundDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [fundComments, setFundComments] = useState("");
  const [fundApproved, setFundApproved] = useState("");
  const [fundReceived, setFundReceived] = useState("");

  const [expenseDate, setExpenseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [category, setCategory] = useState("digital_media");
  const [supplier, setSupplier] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [itemComment, setItemComment] = useState("");
  const [supplierStatus, setSupplierStatus] = useState("pending");
  const [cost, setCost] = useState("");
  const [officePaid, setOfficePaid] = useState("");
  const [agentPaid, setAgentPaid] = useState("");
  const [vendorPaid, setVendorPaid] = useState("");

  const summary = useMemo(() => summarizeMarketingFunds(funds, expenses), [funds, expenses]);

  const saveFund = async () => {
    try {
      await createFund.mutateAsync({
        listing_id: listingId,
        fund_date: fundDate,
        comments: fundComments,
        approved_amount: parseMoneyInput(fundApproved) ?? 0,
        received_amount: parseMoneyInput(fundReceived) ?? 0,
      });
      toast({ title: "Marketing funds entry added" });
      setFundOpen(false);
      setFundComments("");
      setFundApproved("");
      setFundReceived("");
    } catch (e) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const saveExpense = async () => {
    const costVal = parseMoneyInput(cost);
    if (costVal == null || costVal <= 0) {
      toast({ title: "Enter a valid cost", variant: "destructive" });
      return;
    }
    try {
      await createExpense.mutateAsync({
        listing_id: listingId,
        expense_date: expenseDate,
        category,
        supplier,
        invoice_no: invoiceNo,
        item_comment: itemComment,
        supplier_status: supplierStatus,
        cost: costVal,
        office_paid: parseMoneyInput(officePaid) ?? 0,
        agent_paid: parseMoneyInput(agentPaid) ?? 0,
        vendor_paid: parseMoneyInput(vendorPaid) ?? 0,
      });
      toast({ title: "Expense added" });
      setExpenseOpen(false);
      setSupplier("");
      setInvoiceNo("");
      setItemComment("");
      setCost("");
      setOfficePaid("");
      setAgentPaid("");
      setVendorPaid("");
    } catch (e) {
      toast({
        title: "Could not save expense",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const fillVendorPaysAll = () => {
    const costVal = parseMoneyInput(cost);
    if (costVal == null) return;
    setVendorPaid(String(costVal));
    setOfficePaid("0");
    setAgentPaid("0");
  };

  return (
    <Card className="zoho-card p-4 sm:p-5 border-border">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            Marketing funds
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Vendor campaign budget and expenses</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <SummaryTile label="Approved" value={summary.totalApproved} />
        <SummaryTile label="Received" value={summary.totalReceived} />
        <SummaryTile label="Expenses" value={summary.totalExpenses} />
        <SummaryTile label="Balance" value={summary.balance} highlight={summary.overspent} negative={summary.overspent} />
      </div>

      {summary.overspent ? (
        <p className="text-xs text-destructive mb-3 font-medium">Campaign is overspent against funds received.</p>
      ) : null}

      <Tabs defaultValue="funds">
        <div className="flex items-center justify-between gap-2 mb-2">
          <TabsList className="h-8">
            <TabsTrigger value="funds" className="text-xs px-3">
              Funds ({funds.length})
            </TabsTrigger>
            <TabsTrigger value="expenses" className="text-xs px-3">
              Expenses ({expenses.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="funds" className="mt-0 space-y-2">
          <div className="flex justify-end">
            <Button type="button" size="sm" variant="outline" className="gap-1 h-8" onClick={() => setFundOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Add funds
            </Button>
          </div>
          {fundsLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : funds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No marketing fund entries yet.</p>
          ) : (
            <ul className="space-y-2">
              {funds.map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-2 rounded-lg border border-border/70 bg-muted/10 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{format(new Date(row.fund_date), "d MMM yyyy")}</p>
                    <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                      Approved {formatMarketingAud(row.approved_amount)} · Received {formatMarketingAud(row.received_amount)}
                    </p>
                    {row.comments ? <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{row.comments}</p> : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive shrink-0"
                    onClick={() => void deleteFund.mutateAsync({ id: row.id, listingId })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="expenses" className="mt-0 space-y-2">
          <div className="flex justify-end">
            <Button type="button" size="sm" variant="outline" className="gap-1 h-8" onClick={() => setExpenseOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Add expense
            </Button>
          </div>
          {expensesLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No campaign expenses logged yet.</p>
          ) : (
            <ul className="space-y-2">
              {expenses.map((row) => (
                <li key={row.id} className="rounded-lg border border-border/70 bg-muted/10 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums">{formatMarketingAud(row.cost)}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {expenseCategoryLabel(row.category)}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {row.supplier_status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(row.expense_date), "d MMM yyyy")}
                        {row.supplier ? ` · ${row.supplier}` : ""}
                        {row.invoice_no ? ` · #${row.invoice_no}` : ""}
                      </p>
                      {row.item_comment ? (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{row.item_comment}</p>
                      ) : null}
                      <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                        Office {formatMarketingAud(row.office_paid)} · Agent {formatMarketingAud(row.agent_paid)} · Vendor{" "}
                        {formatMarketingAud(row.vendor_paid)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive shrink-0"
                      onClick={() => void deleteExpense.mutateAsync({ id: row.id, listingId })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={fundOpen} onOpenChange={setFundOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add marketing funds</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Date</Label>
              <Input type="date" className="mt-1" value={fundDate} onChange={(e) => setFundDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Funds approved</Label>
                <Input className="mt-1" value={fundApproved} onChange={(e) => setFundApproved(e.target.value)} placeholder="5000" />
              </div>
              <div>
                <Label>Funds received</Label>
                <Input className="mt-1" value={fundReceived} onChange={(e) => setFundReceived(e.target.value)} placeholder="5000" />
              </div>
            </div>
            <div>
              <Label>Comments</Label>
              <Textarea className="mt-1" rows={2} value={fundComments} onChange={(e) => setFundComments(e.target.value)} />
            </div>
            <Button type="button" className="w-full" onClick={() => void saveFund()} disabled={createFund.isPending}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add campaign expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input type="date" className="mt-1" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Cost *</Label>
              <Input className="mt-1" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="850" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Supplier</Label>
                <Input className="mt-1" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
              </div>
              <div>
                <Label>Invoice #</Label>
                <Input className="mt-1" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Supplier status</Label>
              <Select value={supplierStatus} onValueChange={setSupplierStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Item / comment</Label>
              <Textarea className="mt-1" rows={2} value={itemComment} onChange={(e) => setItemComment(e.target.value)} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Payment split</Label>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={fillVendorPaysAll}>
                  Vendor pays all
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input value={officePaid} onChange={(e) => setOfficePaid(e.target.value)} placeholder="Office" />
                <Input value={agentPaid} onChange={(e) => setAgentPaid(e.target.value)} placeholder="Agent" />
                <Input value={vendorPaid} onChange={(e) => setVendorPaid(e.target.value)} placeholder="Vendor" />
              </div>
            </div>
            <Button type="button" className="w-full" onClick={() => void saveExpense()} disabled={createExpense.isPending}>
              Save expense
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function SummaryTile({
  label,
  value,
  highlight,
  negative,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  negative?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-2.5",
        highlight ? "border-destructive/40 bg-destructive/5" : "border-border/70 bg-muted/10",
      )}
    >
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-semibold tabular-nums", negative && "text-destructive")}>
        {formatMarketingAud(value)}
      </p>
    </div>
  );
}
