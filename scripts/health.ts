/**
 * Health check: verify Supabase connection and optionally contact count.
 * Run: npx tsx scripts/health.ts
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

async function main() {
  try {
    const { count, error } = await supabase
      .from("contacts")
      .select("id", { count: "exact", head: true });

    if (error) {
      console.error("Supabase error:", error.message);
      process.exit(1);
    }

    console.log("Supabase: connected");
    console.log(
      "Contact count (anon, no auth):",
      count ?? 0,
      "— RLS filters by user; log in via app to see your contacts."
    );
    console.log("To verify local vs production: log in, open /contacts, compare counts.");
  } catch (e) {
    console.error("Health check failed:", e);
    process.exit(1);
  }
}

main();
