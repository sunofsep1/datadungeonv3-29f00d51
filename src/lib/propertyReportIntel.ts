import type { PricefinderPropertyData } from "@/lib/pricefinderTypes";

type SalesRow = { amount?: number; date?: string; type?: string };

function parseSaleDate(value: string | undefined | null): Date | null {
  if (!value?.trim()) return null;
  const dmy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const iso = new Date(value);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

function latestSaleFromHistory(history: SalesRow[] | null | undefined): {
  price: number | null;
  date: string | null;
} {
  if (!history?.length) return { price: null, date: null };
  let best: SalesRow | null = null;
  let bestTime = 0;
  for (const row of history) {
    const t = parseSaleDate(row.date)?.getTime() ?? 0;
    if (t >= bestTime) {
      bestTime = t;
      best = row;
    }
  }
  return {
    price: best?.amount ?? null,
    date: best?.date ?? null,
  };
}

/** Normalize property_report JSONB into display/enrich shape (PDF import or API cache). */
export function intelFromPropertyReport(
  report: Record<string, unknown> | null | undefined,
): PricefinderPropertyData | null {
  if (!report || typeof report !== "object") return null;

  const salesHistory = report.sales_history as SalesRow[] | undefined;
  const fromHistory = latestSaleFromHistory(salesHistory);

  const lastSalePrice =
    (report.last_sale_price as number | null | undefined) ??
    (report.lastSalePrice as number | null | undefined) ??
    fromHistory.price;

  const lastSaleDate =
    (report.last_sale_date as string | null | undefined) ??
    (report.lastSaleDate as string | null | undefined) ??
    fromHistory.date;

  const bedrooms = (report.bedrooms as number | null | undefined) ?? null;
  const bathrooms = (report.bathrooms as number | null | undefined) ?? null;
  const land =
    (report.land_area_sqm as number | null | undefined) ??
    (report.area_land as number | null | undefined) ??
    null;

  const hasData =
    lastSalePrice != null ||
    lastSaleDate != null ||
    bedrooms != null ||
    bathrooms != null ||
    land != null ||
    report.property_type_full != null ||
    report.rpd != null ||
    (Array.isArray(report.valuation_amounts) && report.valuation_amounts.length > 0);

  if (!hasData) return null;

  return {
    address: "",
    lot_plan: (report.rpd as string | null) ?? (report.lot_plan as string | null) ?? null,
    last_sale_date: lastSaleDate,
    last_sale_price: lastSalePrice,
    land_area_sqm: land,
    bedrooms,
    bathrooms,
    carspaces: (report.car_spaces as number | null) ?? null,
    property_type: (report.property_type as string | null) ?? null,
  };
}

export function hasPricefinderReportData(report: Record<string, unknown> | null | undefined): boolean {
  return intelFromPropertyReport(report) != null;
}

export function yearsSinceLastSale(report: Record<string, unknown> | null | undefined): number | null {
  const intel = intelFromPropertyReport(report);
  if (!intel?.last_sale_date) return null;
  const sold = parseSaleDate(intel.last_sale_date);
  if (!sold) return null;
  const years = (Date.now() - sold.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return years >= 0 ? Math.floor(years) : null;
}

export function isLongHoldProperty(
  report: Record<string, unknown> | null | undefined,
  minYears = 5,
): boolean {
  const years = yearsSinceLastSale(report);
  return years != null && years >= minYears;
}

export function formatLastSaleSummary(report: Record<string, unknown> | null | undefined): string | null {
  const intel = intelFromPropertyReport(report);
  if (!intel) return null;
  const parts: string[] = [];
  if (intel.last_sale_price != null) {
    parts.push(`$${intel.last_sale_price.toLocaleString()}`);
  }
  if (intel.last_sale_date) parts.push(intel.last_sale_date);
  if (intel.land_area_sqm != null) parts.push(`${intel.land_area_sqm} m²`);
  const years = yearsSinceLastSale(report);
  if (years != null) parts.push(`${years}y hold`);
  return parts.length ? parts.join(" · ") : null;
}
