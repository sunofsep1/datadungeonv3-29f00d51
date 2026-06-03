export type ReiqReadyReckonerInput = {
  salePrice: number;
  commissionRatePct: number;
  includeGstOnCommission: boolean;
  marketingCost: number;
  legalFees: number;
  mortgagePayout: number;
  otherCosts: number;
};

export type ReiqReadyReckonerResult = {
  commissionExGst: number;
  commissionGst: number;
  commissionIncGst: number;
  totalCosts: number;
  estimatedNetProceeds: number;
};

function toSafeNumber(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function calculateReiqReadyReckoner(input: ReiqReadyReckonerInput): ReiqReadyReckonerResult {
  const salePrice = toSafeNumber(input.salePrice);
  const commissionRate = toSafeNumber(input.commissionRatePct) / 100;
  const marketingCost = toSafeNumber(input.marketingCost);
  const legalFees = toSafeNumber(input.legalFees);
  const mortgagePayout = toSafeNumber(input.mortgagePayout);
  const otherCosts = toSafeNumber(input.otherCosts);

  const commissionExGst = salePrice * commissionRate;
  const commissionGst = input.includeGstOnCommission ? commissionExGst * 0.1 : 0;
  const commissionIncGst = commissionExGst + commissionGst;
  const totalCosts = commissionIncGst + marketingCost + legalFees + mortgagePayout + otherCosts;

  return {
    commissionExGst,
    commissionGst,
    commissionIncGst,
    totalCosts,
    estimatedNetProceeds: salePrice - totalCosts,
  };
}

export function formatAudCurrency(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}
