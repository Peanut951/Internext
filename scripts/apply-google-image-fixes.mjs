import fs from "node:fs";
import path from "node:path";

const overridesPath = path.resolve("public/data/google-image-overrides.json");
const variantFixesPath = path.resolve("reports/google-image-url-variant-fixes.json");

const overrides = JSON.parse(fs.readFileSync(overridesPath, "utf8"));
const variants = fs.existsSync(variantFixesPath)
  ? JSON.parse(fs.readFileSync(variantFixesPath, "utf8"))
  : { found: [] };

const manual = {
  "AK-ACR-CID12": ["https://akuvoxdealer.com/cdn/shop/files/Akuvox-ACR-CID12-Card-Issuing-Device-for-Akuvox_1024x.jpg?v=1737059361&format=jpg"],
  "AK-R20K-BK-L-KIT": ["https://www.alloys.com.au/Images/ProductImages/Original/R20K%20-%20Black%20-%20F_3.png"],
  "AK-VP-R49G": ["https://akuvoxdealer.com/cdn/shop/products/akuvox-r49g-ipphone_1024x.jpg?v=1674501918&format=jpg"],
  "CIPFTM-250ST": ["https://www.alloys.com.au/Images/ProductImages/Original/TM-250LmSD-26_02fr_E.jpg"],
  "CLBP243DWII": ["https://www.printerland.co.uk/Images/Models/Full/172082.webp"],
  "CMF754CDWII": ["https://www.printerland.co.uk/Images/Models/Full/172085.webp"],
  "EP2YWSCP906": ["https://www.alloys.com.au/Images/ProductImages/Original/SureColor-P906-800.jpg"],
  "GR-GDS37X0-IN": ["https://www.alloys.com.au/Images/ProductImages/Large/-%20GR-GDS37X0-IN_1.jpg"],
  "KYP4060DN": ["https://www.abdofficesolutions.com/cdn/shop/products/Kyocera_ECOSYS_P4060dn_1200x1200.png?v=1727369575"],
  "KYPA2600CWX": ["https://www.abdofficesolutions.com/cdn/shop/files/Kyocera_ECOSYS_PA2600cwx_1200x1200.jpg?v=1741797054"],
  "KYPA2600CX": ["https://www.abdofficesolutions.com/cdn/shop/files/Kyocera_ECOSYS_PA2600cwx_1200x1200.jpg?v=1741797054"],
  "KYPA6000X": ["https://www.abdofficesolutions.com/cdn/shop/files/Kyocera_ECOSYS_PA_6000x_1_1200x1200.png?v=1727369530"],
  "LG-ST-136GF": ["https://www.lg.com/content/dam/channel/wcms/in/images/tv-accessories/fs21gb_al_eail_in_c/gallery/FS21GB-D-01.jpg"],
  "LG-ST-136GH": ["https://www.lg.com/content/dam/channel/wcms/in/images/tv-accessories/fs21gb_al_eail_in_c/gallery/FS21GB-D-01.jpg"],
  "LG-ST-163GF": ["https://www.lg.com/content/dam/channel/wcms/in/images/tv-accessories/fs21gb_al_eail_in_c/gallery/FS21GB-D-01.jpg"],
  "LG-WP601-B": ["https://www.lg.com/content/dam/channel/wcms/za/images/business/feature/wp601-b/WP601-Gallery-450-01-webOS-Box-Digital-Signage-ID.jpg"],
  "LM47C9667": ["https://i5.walmartimages.com/seo/Lexmark-CX735adse-Laser-Multifunction-Printer-Color-TAA-Compliant_9d49a7c6-7b28-474f-a84e-83f6531afba3.8a2697c1f93a8d4088f906994fdafbdf.jpeg"],
  "LMMX532ADWE": ["https://www.internext.com.au/product-images/google/repairs/lmmx532adwe.jpg"],
  "LMMX632ADWE": ["https://www.officecrave.com/image/cache/data/product_image_large/15014426-500x500-0.JPG"],
  "NB-FP3SHELF": ["https://www.alloys.com.au/Images/ProductImages/Original/FP-3-B.jpg"],
  "NB-T70": ["https://www.internext.com.au/product-images/google/repairs/nb-t70.jpg"],
  "PM-ACON1G-PSUKIT": ["https://www.internext.com.au/product-images/google/smart-board-gx-display.png"],
  "PM-AP9-NFC-2": ["https://www.internext.com.au/product-images/google/repairs/pm-ap6-pen-2.jpg"],
  "PM-AP-ERASER": ["https://www.internext.com.au/product-images/google/repairs/pm-ap6-pen-2.jpg"],
  "PM-AP-PEN-2": ["https://www.alloys.com.au/Images/ProductImages/Large/AP7-PEN-A_2.jpg"],
  "PM-ASB-402BRKTKT": ["https://www.internext.com.au/product-images/google/smart-board-gx-display.png"],
  "SH-SHELLYPROSHUT": ["https://us.shelly.com/cdn/shop/files/Shelly-Pro-Dual-Cover-Shutter-main-image_7bd08d0d-b0da-4504-b978-21edba4fb31c.png?v=1762463558"],
  "ST-RX265-5A": ["https://www.internext.com.au/product-images/google/smart-board-gx-display.png"],
  "ST-RX275-5A": ["https://www.internext.com.au/product-images/google/smart-board-gx-display.png"],
  "ST-RX286-5A": ["https://www.internext.com.au/product-images/google/smart-board-gx-display.png"],
  "ST-SVC-BC-OS": ["https://www.internext.com.au/product-images/google/smart-board-gx-display.png"],
  "ST-SVC-TMXF": ["https://www.internext.com.au/product-images/google/smart-board-gx-display.png"],
  "ST-SVC-TMXH": ["https://www.internext.com.au/product-images/google/smart-board-gx-display.png"],
};

const images = overrides.images || {};

for (const fix of variants.found || []) {
  images[String(fix.id || "").toUpperCase()] = [fix.image];
}

for (const [code, urls] of Object.entries(manual)) {
  images[String(code).toUpperCase()] = urls;
}

overrides.updatedAt = new Date().toISOString();
overrides.source = "reports/google-feed-image-audit.json";
overrides.reason =
  "Primary Google Shopping image overrides. Products stay in the feed; invalid, dead, logo, and small supplier images are replaced with crawlable product images.";
overrides.images = images;

fs.writeFileSync(overridesPath, `${JSON.stringify(overrides, null, 2)}\n`);

console.log(`Google image overrides now contain ${Object.keys(images).length} products.`);
