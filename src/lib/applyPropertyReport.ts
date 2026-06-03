import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedPropertyReport } from "@/lib/parsePropertyReportPdf";
import { normalizePropertyType } from "@/lib/propertyType";

type PostgrestColumnError = { code?: string | null; message?: string | null };

export type ApplyPropertyReportResult = {
  propertyId: string;
  appliedFields: string[];
  warnings: string[];
  partialSave: boolean;
};

function latestSaleFromParsedReport(parsed: ParsedPropertyReport): {
  price: number | null;
  date: string | null;
} {
  if (parsed.sales_history?.length) {
    let best = parsed.sales_history[0];
    for (const row of parsed.sales_history) {
      if (!row.date) continue;
      if (!best?.date || row.date > best.date) best = row;
    }
    return { price: best?.amount ?? parsed.price ?? null, date: best?.date ?? null };
  }
  return { price: parsed.price ?? null, date: null };
}

export { latestSaleFromParsedReport };

export function isPropertyColumnError(error: PostgrestColumnError | null | undefined): boolean {
  if (!error) return false;
  const message = String(error.message ?? "").toLowerCase();
  if (error.code === "PGRST204" || error.code === "42703") return true;
  return message.includes("column") && (message.includes("could not find") || message.includes("does not exist"));
}

function getMissingColumnName(error: PostgrestColumnError | null | undefined): string | null {
  if (!error?.message) return null;
  const message = String(error.message);
  const pgrstMatch = message.match(/'([a-zA-Z0-9_]+)'\s+column/i);
  if (pgrstMatch?.[1]) return pgrstMatch[1];
  const postgresMatch = message.match(/column\s+["']?([a-zA-Z0-9_]+)["']?/i);
  if (postgresMatch?.[1]) return postgresMatch[1];
  return null;
}

export function omitMissingColumn(
  payload: Record<string, unknown>,
  error: PostgrestColumnError | null | undefined,
): Record<string, unknown> | null {
  const column = getMissingColumnName(error);
  if (!column || !(column in payload)) return null;
  const { [column]: _ignored, ...rest } = payload;
  return rest;
}

export function errorMessageFromUnknown(e: unknown): string {
  if (e != null && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  if (e instanceof Error) return e.message;
  return String(e);
}

/** Build Supabase property update payload from a parsed Pricefinder PDF. */
export function buildPropertyUpdatesFromReport(
  parsed: ParsedPropertyReport,
  existingReport?: Record<string, unknown> | null,
): Record<string, unknown> {
  const { price: lastSalePrice, date: lastSaleDate } = latestSaleFromParsedReport(parsed);

  const reportPayload: Record<string, unknown> = {
    ...(existingReport && typeof existingReport === "object" ? existingReport : {}),
    property_type_full: parsed.property_type_full,
    rpd: parsed.lot_plan,
    valuation_amounts: parsed.valuation_amounts,
    land_use: parsed.land_use,
    zoning: parsed.zoning,
    council: parsed.council,
    features: parsed.features?.slice(0, 20) ?? null,
    area_land: parsed.lot_size,
    area_building: parsed.building_size,
    area_per_m2: parsed.area_per_m2,
    water_sewerage: parsed.water_sewerage,
    property_id: parsed.property_id,
    ubd_ref: parsed.ubd_ref,
    bedrooms: parsed.bedrooms,
    bathrooms: parsed.bathrooms,
    car_spaces: parsed.car_spaces,
    owner_names: parsed.owner_names,
    owner_phones: parsed.owner_phones,
    owner_type: parsed.owner_type,
    sales_history: parsed.sales_history?.slice(0, 10) ?? null,
    last_sale_price: lastSalePrice,
    last_sale_date: lastSaleDate,
    source: "pricefinder_pdf",
    imported_at: new Date().toISOString(),
  };

  const updates: Record<string, unknown> = {};
  if (parsed.address_line1) updates.address_line1 = parsed.address_line1;
  if (parsed.city) {
    updates.city = parsed.city;
    updates.suburb = parsed.city;
  }
  if (parsed.state) updates.state = parsed.state;
  if (parsed.postcode) updates.postcode = parsed.postcode;
  if (parsed.property_type) updates.property_type = normalizePropertyType(parsed.property_type);
  if (parsed.bedrooms != null) updates.bedrooms = parsed.bedrooms;
  if (parsed.bathrooms != null) updates.bathrooms = parsed.bathrooms;
  if (parsed.price != null) updates.price = parsed.price;
  else if (lastSalePrice != null) updates.price = lastSalePrice;
  if (parsed.notes) updates.notes = parsed.notes;
  if (parsed.lot_size != null) {
    updates.lot_size = parsed.lot_size;
    updates.land_area_sqm = parsed.lot_size;
  }
  if (parsed.car_spaces != null) updates.car_spaces = parsed.car_spaces;
  if (parsed.building_size != null) {
    updates.building_size = parsed.building_size;
    updates.floor_area_sqm = parsed.building_size;
  }
  if (parsed.estimated_value != null) updates.estimated_value = parsed.estimated_value;

  const hasReportData = Object.values(reportPayload).some(
    (v) => v != null && (Array.isArray(v) ? v.length > 0 : true),
  );
  if (hasReportData) updates.property_report = reportPayload;

  return updates;
}

const MIGRATION_HINT =
  " Run migration: supabase/migrations/20260311000000_properties_report_data.sql in Supabase.";

/**
 * Apply parsed Pricefinder report to a property row with progressive column strip retry.
 */
export async function applyPropertyReportToProperty(
  client: SupabaseClient,
  propertyId: string,
  parsed: ParsedPropertyReport,
  existingReport?: Record<string, unknown> | null,
): Promise<ApplyPropertyReportResult> {
  const fullUpdates = buildPropertyUpdatesFromReport(parsed, existingReport);
  const warnings: string[] = [];
  let payload: Record<string, unknown> = { ...fullUpdates };
  let partialSave = false;

  const tryUpdate = async (body: Record<string, unknown>) => {
    const { data, error } = await client
      .from("properties")
      .update(body)
      .eq("id", propertyId)
      .select()
      .single();
    return { data, error: error as PostgrestColumnError | null };
  };

  let result = await tryUpdate(payload);
  const maxRetries = Math.max(8, Object.keys(payload).length + 2);

  for (let attempt = 0; result.error && isPropertyColumnError(result.error) && attempt < maxRetries; attempt++) {
    const column = getMissingColumnName(result.error);
    partialSave = true;
    if (column) {
      warnings.push(`Skipped column "${column}" (not in database schema).`);
    }
    const reduced = omitMissingColumn(payload, result.error);
    if (!reduced || Object.keys(reduced).length === 0) break;
    payload = reduced;
    result = await tryUpdate(payload);
  }

  if (result.error) {
    const msg = errorMessageFromUnknown(result.error);
    if (isPropertyColumnError(result.error)) {
      throw new Error(msg + MIGRATION_HINT);
    }
    throw new Error(msg);
  }

  if (partialSave && !payload.property_report && fullUpdates.property_report) {
    warnings.push("Report JSON was not saved — property_report column may be missing." + MIGRATION_HINT);
  }

  return {
    propertyId,
    appliedFields: Object.keys(payload),
    warnings,
    partialSave,
  };
}
