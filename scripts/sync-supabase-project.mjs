#!/usr/bin/env node
/**
 * Single source of truth for Supabase project ref.
 * Edit supabase/project-ref, then run: npm run supabase:sync
 */
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const projectRefPath = join(root, "supabase", "project-ref");
const projectRef = readFileSync(projectRefPath, "utf8").trim();

if (!projectRef) {
  console.error("supabase/project-ref is empty. Add your Supabase project ref.");
  process.exit(1);
}

// Update supabase/config.toml
const configPath = join(root, "supabase", "config.toml");
let config = readFileSync(configPath, "utf8");
config = config.replace(/^project_id\s*=\s*"[^"]*"/m, `project_id = "${projectRef}"`);
writeFileSync(configPath, config);

// Update package.json
const pkgPath = join(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.scripts["supabase:link"] = `npx supabase link --project-ref ${projectRef}`;
pkg.scripts["supabase:gen-types"] = `npx supabase gen types typescript --project-id ${projectRef} > src/integrations/supabase/types.ts`;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

console.log(`Supabase project ref synced to: ${projectRef}`);
console.log("Updated: supabase/config.toml, package.json");
