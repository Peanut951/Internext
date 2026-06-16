import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const catalogPath = path.resolve("public/data/catalog-products.json");
const outputDir = path.resolve("public/product-images/catalog/repairs");
const sitePrefix = "https://www.internext.com.au/product-images/catalog/repairs";

const targets = [
  {
    code: "CCART051D",
    url: "https://oztoner.au/cdn/shop/files/genuine-canon-cart051-black-laser-drum-cartridge-for-mf269dw-23k-cart051d-334.webp?v=1716000927&width=600",
  },
  {
    code: "CFX12CART",
    url: "https://oztoner.au/cdn/shop/files/genuine-canon-fx12-black-toner-cartridge-for-l3000-4-5k-accessories-327.webp?v=1715951051&width=600",
  },
  {
    code: "BQ5J.F7C14.003",
    url: "http://www.tecisoft.com/cdn/shop/files/BenQ-TPY24-Stylus-for-interactive-display-germ-resistant-pack-of-2.jpg?v=1749155447",
  },
];

const slugify = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

fs.mkdirSync(outputDir, { recursive: true });

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const productByCode = new Map(catalog.map((product) => [String(product.code || "").toUpperCase(), product]));
const updates = [];

for (const target of targets) {
  const slug = slugify(target.code);
  const sourcePath = path.join(outputDir, `${slug}.webp`);
  const outputPath = path.join(outputDir, `${slug}.jpg`);
  const publicUrl = `${sitePrefix}/${slug}.jpg`;

  const response = await fetch(target.url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; InternextImageRepair/1.0)",
      Accept: "image/webp,image/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to download ${target.code}: HTTP ${response.status}`);
  }

  fs.writeFileSync(sourcePath, Buffer.from(await response.arrayBuffer()));
  execFileSync("ffmpeg", [
    "-y",
    "-i",
    sourcePath,
    "-vf",
    "scale=900:900:force_original_aspect_ratio=decrease,pad=900:900:(ow-iw)/2:(oh-ih)/2:white",
    "-q:v",
    "2",
    outputPath,
  ], { stdio: "ignore" });
  fs.rmSync(sourcePath, { force: true });

  const product = productByCode.get(target.code);
  if (!product) {
    continue;
  }

  const existingImages = [product.imageUrl, ...(Array.isArray(product.imageUrls) ? product.imageUrls : [])].filter(Boolean);
  product.imageUrl = publicUrl;
  product.imageUrls = [publicUrl, ...existingImages.filter((image) => image !== publicUrl)];
  updates.push({ code: target.code, imageUrl: publicUrl });
}

fs.writeFileSync(catalogPath, JSON.stringify(catalog));
fs.mkdirSync("reports", { recursive: true });
fs.writeFileSync(
  "reports/catalog-webp-localize-report.json",
  `${JSON.stringify({ generatedAt: new Date().toISOString(), updates }, null, 2)}\n`,
);

console.log(JSON.stringify({ updatedCount: updates.length, updates }, null, 2));
