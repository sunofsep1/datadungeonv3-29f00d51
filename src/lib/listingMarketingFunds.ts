/** Marketing funds ledger helpers (Reapit §6). */

export const EXPENSE_CATEGORIES = [
  { value: "digital_media", label: "Digital media" },
  { value: "signage", label: "Signage" },
  { value: "printing", label: "Printing" },
  { value: "photography", label: "Photography" },
  { value: "staging", label: "Staging" },
  { value: "office_essentials", label: "Office essentials" },
  { value: "other", label: "Other" },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["value"];

export type MarketingFundRow = {
  approved_amount: number;
  received_amount: number;
};

export type CampaignExpenseRow = {
  cost: number;
  office_paid: number;
  agent_paid: number;
  vendor_paid: number;
};

export type MarketingFundsSummary = {
  totalApproved: number;
  totalReceived: number;
  totalExpenses: number;
  totalOfficePaid: number;
  totalAgentPaid: number;
  totalVendorPaid: number;
  balance: number;
  overspent: boolean;
};

export function formatMarketingAud(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function expenseCategoryLabel(value: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value.replace(/_/g, " ");
}

export function summarizeMarketingFunds(
  funds: MarketingFundRow[],
  expenses: CampaignExpenseRow[],
): MarketingFundsSummary {
  const totalApproved = funds.reduce((s, r) => s + Number(r.approved_amount || 0), 0);
  const totalReceived = funds.reduce((s, r) => s + Number(r.received_amount || 0), 0);
  const totalExpenses = expenses.reduce((s, r) => s + Number(r.cost || 0), 0);
  const totalOfficePaid = expenses.reduce((s, r) => s + Number(r.office_paid || 0), 0);
  const totalAgentPaid = expenses.reduce((s, r) => s + Number(r.agent_paid || 0), 0);
  const totalVendorPaid = expenses.reduce((s, r) => s + Number(r.vendor_paid || 0), 0);
  const balance = totalReceived - totalExpenses;

  return {
    totalApproved,
    totalReceived,
    totalExpenses,
    totalOfficePaid,
    totalAgentPaid,
    totalVendorPaid,
    balance,
    overspent: balance < 0,
  };
}

export function parseMoneyInput(raw: string): number | null {
  const n = Number(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
}
