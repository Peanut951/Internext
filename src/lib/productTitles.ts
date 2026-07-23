type ProductTitleSource = {
  code?: string | null;
  supplierCode?: string | null;
  manufacturer?: string | null;
  name?: string | null;
  description?: string | null;
  longDescription?: string | null;
};

const stripHtml = (value: unknown) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeToken = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const removeSupplierReferences = (value: unknown) =>
  stripHtml(value)
    .replace(/^\s*\d{8,14}\s+/, "")
    .replace(/\s*Product code:\s*[^.;]+[.;]?/gi, "")
    .replace(/\s*supplier reference:\s*[^.;]+[.;]?/gi, "")
    .replace(/\s*;?\s*supplier reference\s+[^.;]+[.;]?/gi, "")
    .replace(/\s+/g, " ")
    .trim();

const removeLeadingBrandFromTitle = (title: string, brand: string) => {
  const cleanBrand = stripHtml(brand);
  const cleanTitle = stripHtml(title);
  if (!cleanBrand) return cleanTitle;

  const escapedBrand = cleanBrand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return cleanTitle.replace(new RegExp(`^${escapedBrand}\\s+`, "i"), "").trim();
};

const isBarcodeLikeCode = (value: string) => /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value.trim());

const stripInternalCodePrefix = (code: string, brand: string) => {
  const cleanCode = stripHtml(code);
  const cleanBrand = normalizeToken(brand);
  const prefix =
    cleanBrand === "akuvox" ? /^AK[-_]+/i
    : cleanBrand === "grandstream" ? /^GR[-_]+/i
    : cleanBrand === "yealink" ? /^IPY[-_]+/i
    : null;

  if (!prefix || !prefix.test(cleanCode)) {
    return cleanCode;
  }

  const stripped = cleanCode.replace(prefix, "").trim();
  return /[a-z]/i.test(stripped) && /\d/.test(stripped) ? stripped : cleanCode;
};

const getDisplayModelCode = (code: string, brand: string) => {
  const cleanBrand = normalizeToken(brand);
  const normalizedCode = normalizeToken(code);

  if (cleanBrand === "akuvox" && normalizedCode.startsWith("it88")) {
    return "IT88";
  }

  return code;
};

export const getProductMpnForTitle = (product: ProductTitleSource) => {
  const supplierCode = stripHtml(product.supplierCode);
  const brand = stripHtml(product.manufacturer);
  const code = getDisplayModelCode(stripInternalCodePrefix(stripHtml(product.code), brand), brand);
  const cleanSupplierCode = getDisplayModelCode(stripInternalCodePrefix(supplierCode, brand), brand);

  if (
    cleanSupplierCode.length >= 3 &&
    !isBarcodeLikeCode(cleanSupplierCode) &&
    normalizeToken(cleanSupplierCode) !== normalizeToken(code)
  ) {
    return cleanSupplierCode;
  }

  return code;
};

const getProductText = (product: ProductTitleSource) =>
  `${product.manufacturer || ""} ${product.name || ""} ${product.description || ""} ${product.longDescription || ""}`.toLowerCase();

const getDisplayProductType = (product: ProductTitleSource) => {
  const text = getProductText(product);

  if (/\btoner\b/.test(text)) return "Toner Cartridge";
  if (/\bink\b/.test(text)) return "Ink Cartridge";
  if (/\bdrum\b/.test(text)) return "Drum Unit";
  if (/\bribbon\b/.test(text)) return "Printer Ribbon";
  if (/\bprinthead\b/.test(text)) return "Printhead";
  if (/\b(printer|multifunction|mfp|copier|plotter|large format)\b/.test(text)) return "Printer";
  if (/\b(scanner|document scanner)\b/.test(text)) return "Scanner";
  if (/\b(laptop|notebook|chromebook)\b/.test(text)) return "Laptop";
  if (/\btablet\b/.test(text)) return "Tablet";
  if (/\bserver\b/.test(text)) return "Server";
  if (/\b(desktop|workstation|pc\b)\b/.test(text)) return "Computer";
  if (/\b(headset)\b/.test(text)) return "Headset";
  if (/\b(phone|handset|speakerphone|conference|voip|sip)\b/.test(text)) return "Business Phone";
  if (/\b(monitor|display|screen|signage|panel)\b/.test(text)) return "Display";
  if (/\bprojector\b/.test(text)) return "Projector";
  if (/\b(nvr|dvr)\b/.test(text)) return "Video Recorder";
  if (/\b(camera|cctv|surveillance)\b/.test(text)) return "Security Camera";
  if (/\b(intercom|access control|rfid|door station)\b/.test(text)) return "Access Control";
  if (/\b(access point|wifi|wi-fi|ap\b)\b/.test(text)) return "Wireless Access Point";
  if (/\bswitch\b/.test(text)) return "Network Switch";
  if (/\brouter\b/.test(text)) return "Router";
  if (/\b(nas|storage)\b/.test(text)) return "Network Storage";
  if (/\bfirewall\b/.test(text)) return "Firewall";
  if (/\bups\b/.test(text)) return "UPS";
  if (/\b(battery|power supply|powerboard|pdu)\b/.test(text)) return "Power Accessory";
  if (/\b(relay|controller|control module|interface)\b/.test(text)) return "Control Module";
  if (/\b(adapter|adaptor|converter|interface)\b/.test(text)) return "Adapter";
  if (/\b(cable|cord|lead)\b/.test(text)) return "Cable";
  if (/\b(mount|bracket|stand)\b/.test(text)) return "Mount";

  return "";
};

const normalizeBaseTitleForProduct = (base: string, product: ProductTitleSource, mpn: string) => {
  const brand = normalizeToken(product.manufacturer);
  const normalizedMpn = normalizeToken(mpn);

  if (brand === "akuvox" && normalizedMpn.startsWith("it88") && /\bindoor unit\b/i.test(base)) {
    const size = /\b10\s*(?:"|inch|in\b)?/i.test(base) ? `10" ` : "";
    const code = stripHtml(product.code);
    const mounting = /inwall|in-wall/i.test(code) ? " - In-Wall" : /onwall|on-wall/i.test(code) ? " - On-Wall" : "";
    const version = /\(([^)]+)\)/.exec(base)?.[0] || (/android/i.test(base) ? "(Android Version)" : "");
    return `${size}Smart Indoor Monitor${mounting} ${version}`.replace(/\s+/g, " ").trim();
  }

  return base;
};

const getComputerDisplayTitle = (base: string, product: ProductTitleSource) => {
  const text = stripHtml(base);
  const source = getProductText(product);
  if (!/\b(aio|all[- ]?in[- ]?one|desktop|workstation|pc\b|notebook|laptop|computer)\b/i.test(`${text} ${source}`)) {
    return "";
  }

  const family =
    text.match(/\b(EliteOne|EliteBook|ProBook|ProOne|ProDesk|EliteDesk|ZBook|ThinkPad|ThinkCentre|Latitude|OptiPlex|Precision|ProBook|Pavilion|Victus|Yoga)\s+[A-Z0-9]+(?:\s+[A-Z0-9]+){0,3}/i)?.[0] ||
    "";
  const screen = text.match(/\b([1-9][0-9](?:\.\d)?)\s*(?:"|inch|in\b)?/i)?.[1] || "";
  const isAio = /\b(aio|all[- ]?in[- ]?one|eliteone|proone)\b/i.test(`${text} ${source}`);
  const formFactor = isAio && screen ? `${screen}" All-in-One PC` : isAio ? "All-in-One PC" : "";
  const cpu = text.match(/\b(?:Intel\s+)?(?:Core\s+)?(i[3579]-[A-Z0-9]+)\b/i)?.[1] || "";
  const ram = text.match(/\b([0-9]{1,3})\s*GB\s*(?:DDR[0-9])?\b/i)?.[1] || "";
  const storage = text.match(/\b([0-9]+(?:\.[0-9]+)?\s*(?:GB|TB))\s*(SSD|HDD|eMMC|NVMe)?\b/i);
  const os = /\b(?:WIN|Windows)\s*11\s*PRO\b/i.test(text) ? "Windows 11 Pro" : "";

  const parts = [
    family,
    formFactor,
    cpu ? `Intel ${cpu.toUpperCase()}` : "",
    ram ? `${ram}GB RAM` : "",
    storage ? `${storage[1].toUpperCase()} ${stripHtml(storage[2] || "SSD").toUpperCase()}`.trim() : "",
    os,
  ].filter(Boolean);

  return parts.length >= 3 ? parts.join(" - ") : "";
};

const shortenLongBaseTitle = (base: string) =>
  base
    .replace(/\b(?:Operating system|Standard memory note|Transfer rates|Memory Slots|Internal Storage|Storage type|Additional storage|Processor family|Chipset|Display Type|Dimensions|Graphics|Power|Form factor|Camera|Keyboard|Pointing device|Audio|Expansion slots|I\/O Port location|Rear Ports|Wireless|Certifications and compliances)\b.*$/i, "")
    .replace(/\b\d+\s*Year\s+OS\s+Warranty\b/gi, "")
    .replace(/\b(?:KB\+Mouse|wty|WLAN Webcam|1xDP|1xHDMI|RJ45)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

export const buildProductDisplayTitle = (product: ProductTitleSource) => {
  const brand = stripHtml(product.manufacturer);
  const rawBase = removeLeadingBrandFromTitle(
    removeSupplierReferences(product.description || product.name || product.code),
    brand,
  ).replace(/^\s*\d{8,14}\s+/, "");
  const mpn = getProductMpnForTitle(product);
  const normalizedBase = normalizeBaseTitleForProduct(rawBase, product, mpn);
  const computerBase = getComputerDisplayTitle(normalizedBase, product);
  const base = computerBase || shortenLongBaseTitle(normalizedBase);
  const productType = getDisplayProductType(product);
  const normalizedBaseToken = normalizeToken(base);
  const normalizedType = normalizeToken(productType);
  const normalizedMpn = normalizeToken(mpn);
  const skipProductType =
    normalizeToken(brand) === "akuvox" &&
    normalizedMpn.startsWith("it88") &&
    /indoor monitor/i.test(base);
  const parts = [
    brand && !normalizedBaseToken.startsWith(normalizeToken(brand)) ? brand : "",
    mpn && normalizedMpn && !normalizedBaseToken.includes(normalizedMpn) ? mpn : "",
    productType && !skipProductType && normalizedType && !normalizedBaseToken.includes(normalizedType) ? productType : "",
    base,
  ].filter(Boolean);

  return parts.join(" ").replace(/\s+/g, " ").trim() || "Product";
};
