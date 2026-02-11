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
      process.exit(1);
    }

    console.log("Schema health: all core tables present and queryable\n");
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
    console.log("To verify local vs production: log in, open /contacts, compare counts.");
  } catch (e) {
    console.error("Health check failed:", e);
    process.exit(1);
  }
}

main();
