/**
 * Export contacts to CSV (backup). Uses service-role key to bypass RLS.
 * Run: npx tsx scripts/export-contacts.ts
 * Requires: .env with SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL
 * Optional: VITE_SUPABASE_URL if different from default.
 *
 * Otherwise use "Export" on the Contacts page (exports your contacts only).
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { join } from "path";

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  console.error("Missing VITE_SUPABASE_URL in .env");
  process.exit(1);
}

if (!serviceKey) {
  console.log(
    "SUPABASE_SERVICE_ROLE_KEY not set. Use Export CSV on the Contacts page to backup your contacts."
  );
  process.exit(0);
}

const supabase = createClient(url, serviceKey);

const CSV_HEADERS = [
  "id",
  "name",
  "email",
  "phone",
  "status",
  "source",
  "notes",
  "story",
  "pipeline_stage",
  "selling_intentions",
  "current_situation_notes",
  "pain_points",
  "pleasure_points",
  "created_at",
  "updated_at",
];

function escapeCsv(val: unknown): string {
  if (val == null) return "";
  const s = String(val).replace(/"/g, '""');
  return `"${s}"`;
}

async function main() {
  try {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Export failed:", error.message);
      process.exit(1);
    }

    const rows = (data ?? []).map((r: Record<string, unknown>) =>
      CSV_HEADERS.map((h) => escapeCsv(r[h])).join(",")
    );
    const csv = [CSV_HEADERS.join(","), ...rows].join("\n");
    const outPath = join(
      process.cwd(),
      `contacts-backup-${new Date().toISOString().slice(0, 10)}.csv`
    );
    writeFileSync(outPath, csv, "utf-8");
    console.log(`Exported ${data?.length ?? 0} contacts to ${outPath}`);
  } catch (e) {
    console.error("Export failed:", e);
    process.exit(1);
  }
}

main();
