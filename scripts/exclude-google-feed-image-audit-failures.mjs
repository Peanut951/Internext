import fs from "node:fs";

const auditPath = "reports/google-feed-image-audit.json";
const exclusionsPath = "public/data/google-feed-exclusions.json";
const minImageBytes = 15_000;

const normalizeCode = (value) => String(value || "").trim().toUpperCase();

const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
const current = JSON.parse(fs.readFileSync(exclusionsPath, "utf8"));
const existingCodes = new Set((Array.isArray(current.codes) ? current.codes : []).map(normalizeCode).filter(Boolean));

const failed = audit.results.filter((result) => {
  if (!result?.id) return false;
  if (Array.isArray(result.issues) && result.issues.length > 0) return true;
  return Number(result.bytes || 0) > 0 && Number(result.bytes || 0) < minImageBytes;
});

for (const result of failed) {
  existingCodes.add(normalizeCode(result.id));
}

const next = {
  generatedAt: new Date().toISOString(),
  source: "reports/google-feed-image-audit.json",
  reason: `Temporarily excludes products whose primary Google Shopping image fails crawl/type checks or is under ${minImageBytes} bytes.`,
  codes: [...existingCodes].sort(),
};

fs.writeFileSync(exclusionsPath, `${JSON.stringify(next, null, 2)}\n`);

console.log(`Excluded ${failed.length} products from the latest image audit.`);
console.log(`Total Google feed exclusions: ${next.codes.length}`);
