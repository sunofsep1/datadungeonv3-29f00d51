/**
 * Title-case ALL-CAPS fragments on property, listing, and contact_addresses columns in Supabase.
 * Uses the same rules as src/lib/formatAddressDisplay.ts (formatAddressFieldForStorage).
 *
 * Run: npx tsx scripts/backfill-property-address-titlecase.ts
 * Requires: .env with VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional: DRY_RUN=1 — log changes only, no updates.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { formatAddressFieldForStorage } from "../src/lib/formatAddressDisplay";

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

const PROPERTY_TEXT_FIELDS = [
  "address",
  "address_line1",
  "address_line2",
  "city",
  "state",
  "country",
  "street_address",
  "suburb",
] as const;

type PropertyField = (typeof PROPERTY_TEXT_FIELDS)[number];

const CONTACT_ADDRESS_FIELDS = [
  "address_line1",
  "address_line2",
  "city",
  "state",
  "country",
] as const;

type ContactAddressField = (typeof CONTACT_ADDRESS_FIELDS)[number];

function trimmedOrNull(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

function buildPropertyUpdates(row: Record<string, unknown>): Partial<Record<PropertyField, string | null>> | null {
  const updates: Partial<Record<PropertyField, string | null>> = {};
  for (const field of PROPERTY_TEXT_FIELDS) {
    const raw = row[field];
    if (raw != null && typeof raw !== "string") continue;
    const before = trimmedOrNull(raw as string | null | undefined);
    const after = formatAddressFieldForStorage(before ?? undefined);
    if (before === after) continue;
    if (before === null && after === null) continue;
    updates[field] = after;
  }
  return Object.keys(updates).length > 0 ? updates : null;
}

function buildContactAddressUpdates(row: Record<string, unknown>): Partial<Record<ContactAddressField, string | null>> | null {
  const updates: Partial<Record<ContactAddressField, string | null>> = {};
  for (const field of CONTACT_ADDRESS_FIELDS) {
    const raw = row[field];
    if (raw != null && typeof raw !== "string") continue;
    const before = trimmedOrNull(raw as string | null | undefined);
    const after = formatAddressFieldForStorage(before ?? undefined);
    if (before === after) continue;
    if (before === null && after === null) continue;
    updates[field] = after;
  }
  return Object.keys(updates).length > 0 ? updates : null;
}

async function main() {
  if (!url) {
    console.error("Missing VITE_SUPABASE_URL in .env");
    process.exit(1);
  }
  if (!serviceKey) {
    console.error(
      "Missing SUPABASE_SERVICE_ROLE_KEY in .env — required to update all rows (bypass RLS).\n" +
        "Add it from Supabase Dashboard → Settings → API, then re-run this script."
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey);
  let propertiesUpdated = 0;
  let listingsUpdated = 0;
  let contactAddressesUpdated = 0;

  const propSelect = ["id", ...PROPERTY_TEXT_FIELDS].join(", ");

  for (let from = 0; ; from += 500) {
    const { data: rows, error } = await supabase
      .from("properties")
      .select(propSelect)
      .range(from, from + 499);

    if (error) {
      console.error("properties select error:", error.message);
      process.exit(1);
    }
    if (!rows?.length) break;

    for (const row of rows as Record<string, unknown>[]) {
      const updates = buildPropertyUpdates(row);
      if (!updates) continue;
      const id = row.id as string;
      if (dryRun) {
        console.log(`[DRY_RUN] property ${id}`, updates);
        propertiesUpdated++;
        continue;
      }
      const { error: upErr } = await supabase.from("properties").update(updates).eq("id", id);
      if (upErr) {
        console.error(`property ${id} update failed:`, upErr.message);
        process.exit(1);
      }
      propertiesUpdated++;
    }
  }

  for (let from = 0; ; from += 500) {
    const { data: rows, error } = await supabase.from("listings").select("id, address").range(from, from + 499);

    if (error) {
      console.error("listings select error:", error.message);
      process.exit(1);
    }
    if (!rows?.length) break;

    for (const row of rows as { id: string; address: string }[]) {
      const before = trimmedOrNull(row.address);
      const after = formatAddressFieldForStorage(before ?? undefined);
      if (before === after) continue;
      if (dryRun) {
        console.log(`[DRY_RUN] listing ${row.id}`, { address: after });
        listingsUpdated++;
        continue;
      }
      const { error: upErr } = await supabase.from("listings").update({ address: after ?? "" }).eq("id", row.id);
      if (upErr) {
        console.error(`listing ${row.id} update failed:`, upErr.message);
        process.exit(1);
      }
      listingsUpdated++;
    }
  }

  const caSelect = ["id", ...CONTACT_ADDRESS_FIELDS].join(", ");
  for (let from = 0; ; from += 500) {
    const { data: rows, error } = await supabase
      .from("contact_addresses")
      .select(caSelect)
      .range(from, from + 499);

    if (error) {
      console.error("contact_addresses select error:", error.message);
      process.exit(1);
    }
    if (!rows?.length) break;

    for (const row of rows as Record<string, unknown>[]) {
      const updates = buildContactAddressUpdates(row);
      if (!updates) continue;
      const id = row.id as string;
      if (dryRun) {
        console.log(`[DRY_RUN] contact_addresses ${id}`, updates);
        contactAddressesUpdated++;
        continue;
      }
      const { error: upErr } = await supabase.from("contact_addresses").update(updates).eq("id", id);
      if (upErr) {
        console.error(`contact_addresses ${id} update failed:`, upErr.message);
        process.exit(1);
      }
      contactAddressesUpdated++;
    }
  }

  console.log(
    dryRun ? "Dry run complete." : "Backfill complete.",
    `Properties ${dryRun ? "would update" : "updated"}: ${propertiesUpdated}; listings: ${listingsUpdated}; contact_addresses: ${contactAddressesUpdated}.`
  );
}

main();
