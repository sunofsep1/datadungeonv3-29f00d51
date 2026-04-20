import { format } from "date-fns";

export type UsageRowLike = {
  usage_date: string;
  model: string;
  total_tokens: number;
  cost_usd: number;
};

export type AIUsageSummary = {
  spendToday: number;
  spendPeriod: number;
  totalTokens: number;
  modelsUsed: number;
  byModel: Array<{ model: string; spend: number; tokens: number }>;
};

export function summarizeUsageRows(rows: UsageRowLike[], now = new Date()): AIUsageSummary {
  let spend = 0;
  let tokens = 0;
  for (const r of rows) {
    spend += Number(r.cost_usd ?? 0);
    tokens += Number(r.total_tokens ?? 0);
  }
  const todayStr = format(now, "yyyy-MM-dd");
  const todaySpend = rows
    .filter((r) => r.usage_date === todayStr)
    .reduce((acc, r) => acc + Number(r.cost_usd ?? 0), 0);

  const byModelMap = rows.reduce<Record<string, { spend: number; tokens: number }>>((acc, row) => {
    const key = row.model || "unknown";
    const prev = acc[key] ?? { spend: 0, tokens: 0 };
    prev.spend += Number(row.cost_usd ?? 0);
    prev.tokens += Number(row.total_tokens ?? 0);
    acc[key] = prev;
    return acc;
  }, {});

  return {
    spendToday: todaySpend,
    spendPeriod: spend,
    totalTokens: tokens,
    modelsUsed: [...new Set(rows.map((r) => r.model))].length,
    byModel: Object.entries(byModelMap)
      .map(([model, v]) => ({ model, spend: v.spend, tokens: v.tokens }))
      .sort((a, b) => b.spend - a.spend),
  };
}
