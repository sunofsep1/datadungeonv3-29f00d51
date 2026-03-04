/**
 * Health check: verify Supabase connection and core schema (contacts, tags,
 * contact_tags, contact_channels, properties, contact_property_links).
 * Run: npm run health  or  npx tsx scripts/health.ts
 * Requires: .env with VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(url, key);

const CORE_TABLES = [
  "contacts",
  "tags",
  "contact_tags",
  "contact_channels",
  "properties",
  "contact_property_links",
] as const;

async function checkTable(table: string): Promise<{ ok: boolean; count: number | null; error?: string }> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  if (error) {
    return { ok: false, count: null, error: error.message };
  }
  return { ok: true, count: count ?? 0 };
}

/** Inspect table columns (schema cache) — helps debug "Could not find 'X' column" errors */
async function inspectTableColumns(table: string): Promise<string[]> {
  const { data, error } = await supabase.from(table).select("*").limit(1);
  if (error) return [];
  const row = Array.isArray(data) ? data[0] : data;
  return row ? Object.keys(row) : [];
}

async function main() {
  try {
    console.log("Supabase: connecting...\n");

    const results: Record<string, { ok: boolean; count: number | null; error?: string }> = {};
    for (const table of CORE_TABLES) {
      results[table] = await checkTable(table);
    }

    const allOk = CORE_TABLES.every((t) => results[t].ok);
    if (!allOk) {
      console.error("Schema health: one or more tables missing or not queryable.\n");
      for (const table of CORE_TABLES) {
        const r = results[table];
        console.log(`  ${table}: ${r.ok ? `ok (count: ${r.count})` : `error — ${r.error ?? "unknown"}`}`);
      }
      console.log("\nRun migrations: npm run supabase:link && npm run db:push");
    }

    console.log("\nSchema health: core tables status above");
    for (const table of CORE_TABLES) {
      const r = results[table];
      console.log(`  ${table}: ${r.count ?? 0} rows`);
    }

    console.log("\nSupabase: connected");
    console.log(
      "Contact count (anon, no auth):",
      results.contacts.count ?? 0,
      "— RLS filters by user; log in via app to see your contacts."
    );

    const contactsColumns = await inspectTableColumns("contacts");
    if (contactsColumns.length > 0) {
      console.log("\n--- contacts table columns ---");
      console.log(contactsColumns.join(", "));
      const hasName = contactsColumns.includes("name");
      const hasStatus = contactsColumns.includes("status");
      const hasUserId = contactsColumns.includes("user_id");
      if (!hasName || !hasStatus || !hasUserId) {
        console.warn("  ⚠ DataDungeon expects name, status, user_id — run migrations if missing.");
      }
    }

    const propertiesColumns = await inspectTableColumns("properties");
    if (propertiesColumns.length > 0) {
      console.log("\n--- properties table columns ---");
      console.log(propertiesColumns.join(", "));
      const hasAddress = propertiesColumns.includes("address_line1");
      const hasCity = propertiesColumns.includes("city");
      const hasUserId = propertiesColumns.includes("user_id");
      if (!hasAddress || !hasCity || !hasUserId) {
        console.warn("  ⚠ DataDungeon expects address_line1, city, user_id — run migrations if missing.");
      }
    } else if (results.properties.ok) {
      console.log("\n--- properties: table exists but empty (no rows to infer columns) ---");
    }

    const linksColumns = await inspectTableColumns("contact_property_links");
    if (linksColumns.length > 0) {
      console.log("\n--- contact_property_links columns ---");
      console.log(linksColumns.join(", "));
    }

    console.log("\nTo verify: log in, open /contacts, try CSV import with devtools Network tab open.");

    if (!allOk) process.exit(1);
  } catch (e) {
    console.error("Health check failed:", e);
    process.exit(1);
  }
}

main();
