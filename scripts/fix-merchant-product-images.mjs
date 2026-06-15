import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve("public", "data");
const catalogPath = path.join(dataDir, "catalog-products.json");
const exclusionsPath = path.join(dataDir, "google-feed-exclusions.json");
const overridesPath = path.join(dataDir, "google-image-overrides.json");

const replacements = {
  "CPFI-5100M": [
    "https://www.alloys.com.au/Images/ProductImages/Original/PFI-5100M%20Inks-7.jpg",
  ],
  "CPFI-5100Y": [
    "https://www.alloys.com.au/Images/ProductImages/Original/PFI-5100Y%20Inks-8.jpg",
  ],
  "EPC11CJ71501": [
    "https://www.alloys.com.au/Images/ProductImages/Original/EPC11CJ71501%20(4).jpg",
  ],
  "EPC13S020693": [
    "https://media.ldlc.com/r1600/ld/products/00/06/30/68/LD0006306822.jpg",
  ],
  "NVR501-04B-P4-IQ": [
    "https://www.alloys.com.au/Images/ProductImages/Original/NVR501-04B-P4-IQ%202.png",
    "https://www.alloys.com.au/Images/ProductImages/Large/NVR501-04B-P4-IQ.png",
  ],
  "NVR501-08B-P8-IQ": [
    "https://ellipsesecurity.com/wp-content/uploads/2024/12/NVR501-08B-P8-IQ-2.png",
  ],
  "NVR502-16B-P16-I": [
    "https://www.internext.com.au/product-images/google/nvr502-16b-p16-iq.png",
  ],
  "RW-127128": [
    "https://www.internext.com.au/product-images/google/realwear-navigator-520.png",
  ],
  "ST-GX065-V3-5L": [
    "https://www.internext.com.au/product-images/google/smart-board-gx-display.png",
  ],
  "ST-GX075-V3-5L": [
    "https://www.internext.com.au/product-images/google/smart-board-gx-display.png",
  ],
  "ST-GX086-V3-5L": [
    "https://www.internext.com.au/product-images/google/smart-board-gx-display.png",
  ],
  "TRJB07/WM03-F-IN": [
    "https://www.internext.com.au/product-images/google/tr-jb07-wm03-h-in.jpg",
  ],
};

const normalizeCode = (value) => String(value || "").trim().toUpperCase();
const replacementByCode = new Map(
  Object.entries(replacements).map(([code, images]) => [normalizeCode(code), images]),
);

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const touched = [];

for (const product of catalog) {
  const images = replacementByCode.get(normalizeCode(product.code));
  if (!images?.length) continue;

  product.imageUrl = images[0];
  product.imageUrls = [...images];
  touched.push(product.code);
}

fs.writeFileSync(catalogPath, `${JSON.stringify(catalog)}\n`);

const exclusions = JSON.parse(fs.readFileSync(exclusionsPath, "utf8"));
const replacementCodes = new Set([...replacementByCode.keys()]);
exclusions.generatedAt = new Date().toISOString();
exclusions.source = "product_issues_2026-06-15_11-25-55.csv";
exclusions.reason = "Temporarily excludes only products whose images are still unsafe for Google Shopping.";
exclusions.codes = Array.isArray(exclusions.codes)
  ? exclusions.codes.filter((code) => !replacementCodes.has(normalizeCode(code)))
  : [];
fs.writeFileSync(exclusionsPath, `${JSON.stringify(exclusions, null, 2)}\n`);

const overrides = {
  updatedAt: new Date().toISOString(),
  source: "product_issues_2026-06-15_11-25-55.csv",
  reason: "Merchant Centre image issue fixes applied to the site catalogue and Google Shopping feed.",
  images: replacements,
};
fs.writeFileSync(overridesPath, `${JSON.stringify(overrides, null, 2)}\n`);

console.log(`Updated ${touched.length} product image records.`);
console.log(touched.sort().join("\n"));
