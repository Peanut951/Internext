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

export const getProductMpnForTitle = (product: ProductTitleSource) => {
  const supplierCode = stripHtml(product.supplierCode);
  const code = stripHtml(product.code);

  if (supplierCode.length >= 3 && normalizeToken(supplierCode) !== normalizeToken(code)) {
    return supplierCode;
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

export const buildProductDisplayTitle = (product: ProductTitleSource) => {
  const brand = stripHtml(product.manufacturer);
  const base = removeLeadingBrandFromTitle(
    removeSupplierReferences(product.description || product.name || product.code),
    brand,
  );
  const mpn = getProductMpnForTitle(product);
  const productType = getDisplayProductType(product);
  const normalizedBase = normalizeToken(base);
  const normalizedType = normalizeToken(productType);
  const normalizedMpn = normalizeToken(mpn);
  const parts = [
    brand && !normalizedBase.startsWith(normalizeToken(brand)) ? brand : "",
    mpn && normalizedMpn && !normalizedBase.includes(normalizedMpn) ? mpn : "",
    productType && normalizedType && !normalizedBase.includes(normalizedType) ? productType : "",
    base,
  ].filter(Boolean);

  return parts.join(" ").replace(/\s+/g, " ").trim() || "Product";
};
