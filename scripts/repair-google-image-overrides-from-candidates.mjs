import fs from "node:fs";
import path from "node:path";

const auditPath = "reports/google-feed-image-audit.json";
const dataDir = path.resolve("public", "data");
const overridesPath = path.join(dataDir, "google-image-overrides.json");
const minImageBytes = 15_000;
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/gif"]);

const readJson = (filePath, fallback = []) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
};

const normalizeCode = (value) => String(value || "").trim().toUpperCase();
const absoluteUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw, "https://www.internext.com.au").href;
  } catch {
    return "";
  }
};

const hasSupportedExtension = (value) => {
  try {
    return /\.(jpe?g|png|gif)$/i.test(new URL(value).pathname);
  } catch {
    return false;
  }
};

const isObviouslyGeneric = (value) =>
  /alloys(?:%20|_|-|\s)*no(?:%20|_|-|\s)*image|alloys\.jpg|logo|placeholder|coming|brand-logos|icon-|controls\/bit\.gif/i.test(
    value,
  );

const getCandidates = (product) => {
  const gallery = Array.isArray(product.imageUrls) ? product.imageUrls : [];
  return [...new Set([product.imageUrl, ...gallery].map(absoluteUrl).filter(Boolean))]
    .filter(hasSupportedExtension)
    .filter((url) => !isObviouslyGeneric(url));
};

const probe = async (url) => {
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; InternextImageRepair/1.0)",
        accept: "image/jpeg,image/png,image/gif,image/*;q=0.8",
      },
    });
    const type = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const bytes = Buffer.from(await response.arrayBuffer()).length;
    return response.ok && acceptedTypes.has(type) && bytes >= minImageBytes
      ? { ok: true, type, bytes }
      : { ok: false, status: response.status, type, bytes };
  } catch (error) {
    return { ok: false, error: error.message };
  }
};

const audit = readJson(auditPath, { results: [] });
const badCodes = new Set(
  (audit.results || [])
    .filter((result) => Array.isArray(result.issues) && result.issues.length > 0)
    .map((result) => normalizeCode(result.id))
    .filter(Boolean),
);

const products = [
  ...readJson(path.join(dataDir, "catalog-products.json")),
  ...readJson(path.join(dataDir, "leader-products.json")),
];
const productByCode = new Map(products.map((product) => [normalizeCode(product.code), product]));
const overrides = readJson(overridesPath, { images: {} });
const images = { ...(overrides.images || {}) };
const repaired = [];
const unresolved = [];

for (const code of badCodes) {
  const product = productByCode.get(code);
  if (!product) {
    unresolved.push({ code, reason: "missing_product" });
    continue;
  }

  const candidates = getCandidates(product);
  let replacement = "";
  for (const candidate of candidates) {
    const result = await probe(candidate);
    if (result.ok) {
      replacement = candidate;
      break;
    }
  }

  if (replacement) {
    images[code] = [replacement];
    repaired.push({ code, image: replacement });
  } else {
    unresolved.push({ code, reason: "no_valid_candidate", candidates: candidates.length });
  }
}

fs.writeFileSync(
  overridesPath,
  `${JSON.stringify(
    {
      updatedAt: new Date().toISOString(),
      source: "reports/google-feed-image-audit.json",
      reason: "Primary Google Shopping image overrides. Products stay in the feed; overrides pick the best crawlable product image found in existing galleries.",
      images,
    },
    null,
    2,
  )}\n`,
);

fs.mkdirSync("reports", { recursive: true });
fs.writeFileSync(
  "reports/google-image-repair-unresolved.json",
  `${JSON.stringify({ generatedAt: new Date().toISOString(), repaired, unresolved }, null, 2)}\n`,
);

console.log(`Repaired from existing candidates: ${repaired.length}`);
console.log(`Unresolved: ${unresolved.length}`);
