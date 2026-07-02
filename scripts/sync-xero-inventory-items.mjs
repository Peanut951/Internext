import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const INVENTORY_TABLE = "xero_inventory_items";
const GST_RATE = 0.1;
const GST_MULTIPLIER = 1 + GST_RATE;

const readEnvFile = (filePath) => {
  if (!existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const [key, ...valueParts] = line.split("=");
        return [key.trim(), valueParts.join("=").trim().replace(/^["']|["']$/g, "")];
      }),
  );
};

const env = {
  ...readEnvFile(path.join(rootDir, ".env")),
  ...readEnvFile(path.join(rootDir, ".env.local")),
  ...process.env,
};

const readEnv = (key, fallback = "") => String(env[key] || fallback).trim();

const loadProducts = (relativePath) => {
  const filePath = path.join(rootDir, relativePath);
  if (!existsSync(filePath)) {
    return [];
  }

  const parsed = JSON.parse(readFileSync(filePath, "utf8"));
  return Array.isArray(parsed) ? parsed : [];
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const money = (value) => {
  const parsed = toNumber(value);
  return parsed === null ? null : Math.round(parsed * 100) / 100;
};

const exGstPrice = (product) => {
  const price = toNumber(product.price);
  if (price === null) {
    return null;
  }

  return /\bex\s*gst\b/i.test(String(product.priceText || ""))
    ? money(price)
    : money(price / GST_MULTIPLIER);
};

const itemCode = (product) => String(product.code || product.supplierCode || "").trim().slice(0, 30);

const itemName = (product) =>
  String(product.description || product.name || product.code || "Internext product")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 255);

const itemDescription = (product) =>
  String(product.longDescription || product.description || product.name || product.code || "Internext product")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, 4000);

const sourceProducts = [
  ...loadProducts("public/data/catalog-products.json"),
  ...loadProducts("public/data/leader-products.json"),
];

const productsByCode = new Map();
for (const product of sourceProducts) {
  const code = itemCode(product);
  if (!code) {
    continue;
  }

  const existing = productsByCode.get(code);
  if (!existing || (existing.price == null && product.price != null)) {
    productsByCode.set(code, product);
  }
}

const now = new Date().toISOString();
const rows = Array.from(productsByCode.values())
  .map((product) => {
    const code = itemCode(product);
    const description = itemDescription(product);

    return {
      item_code: code,
      item_name: itemName(product),
      purchases_description: description,
      purchases_unit_price: money(product.supplierPrice ?? product.leaderDealerBuyEx ?? product.alloysPrice),
      purchases_account: readEnv("XERO_PURCHASES_ACCOUNT_CODE"),
      purchases_tax_rate: readEnv("XERO_PURCHASES_TAX_RATE"),
      sales_description: description,
      sales_unit_price: exGstPrice(product),
      sales_account: readEnv("XERO_SALES_ACCOUNT_CODE", "200"),
      sales_tax_rate: readEnv("XERO_SALES_TAX_RATE", readEnv("XERO_GST_TAX_TYPE", "OUTPUT")),
      inventory_asset_account: readEnv("XERO_INVENTORY_ASSET_ACCOUNT_CODE"),
      cost_of_goods_sold_account: readEnv("XERO_COGS_ACCOUNT_CODE"),
      source: product.source || (product.leaderCategory ? "leader" : "catalog"),
      product_data: product,
      updated_at: now,
    };
  })
  .filter((row) => row.item_code);

const dryRun = process.argv.includes("--dry-run");
if (dryRun) {
  console.log(`Prepared ${rows.length} Xero inventory item rows.`);
  console.log(JSON.stringify(rows.slice(0, 3).map(({ product_data, ...row }) => row), null, 2));
  process.exit(0);
}

const supabaseUrl = readEnv("SUPABASE_URL", readEnv("VITE_SUPABASE_URL")).replace(/\/$/, "");
const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY", readEnv("SERVICE_ROLE_SECRET_KEY"));

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for inventory sync.");
}

const upsertBatch = async (batch) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/${INVENTORY_TABLE}?on_conflict=item_code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(batch),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Supabase inventory sync failed with HTTP ${response.status}${text ? `: ${text}` : ""}`);
  }
};

const batchSize = 500;
for (let index = 0; index < rows.length; index += batchSize) {
  const batch = rows.slice(index, index + batchSize);
  await upsertBatch(batch);
  console.log(`Synced ${Math.min(index + batch.length, rows.length)} of ${rows.length} inventory items.`);
}

console.log(`Synced ${rows.length} Xero inventory items to Supabase.`);
