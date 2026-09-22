import fs from "node:fs";
import path from "node:path";
import { mergeFourCMeasurements } from "./lib/four-c-measurement-import.mjs";

const inputPath = process.argv[2] ? path.resolve(process.argv[2]) : "";
if (!inputPath || !fs.existsSync(inputPath)) {
  throw new Error("Usage: node scripts/import-4c-measurements.mjs <verified 4C package measurement CSV>");
}
const outputPath = path.resolve("public/data/catalog-sourced-measurements.json");
const catalog = JSON.parse(fs.readFileSync("public/data/4c-products.json", "utf8"));
const existing = JSON.parse(fs.readFileSync(outputPath, "utf8"));
const next = mergeFourCMeasurements(fs.readFileSync(inputPath, "utf8"), catalog, existing);
fs.writeFileSync(outputPath, `${JSON.stringify(next, null, 2)}\n`);
console.log(`Imported ${next.items.filter((item) => item.source === "4Cabling package measurement export" && item.updatedAt === next.updatedAt).length} 4C package measurement rows.`);
