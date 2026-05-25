/**
 * Rebuild public/drako from transparent PNGs (true RGBA, de-fringed).
 * Usage: node scripts/optimize-drako-sprites.mjs [sourceDir]
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const srcDir = process.argv[2] ?? path.join(process.env.HOME ?? "", "Desktop/drako/transparent");
const outDir = path.join(root, "public/drako");
const pyScript = path.join(__dirname, "optimize_drako_sprites.py");

if (!fs.existsSync(srcDir)) {
  console.error("Source not found:", srcDir);
  process.exit(1);
}

execSync(`python3 "${pyScript}" "${srcDir}" "${outDir}"`, { stdio: "inherit" });
