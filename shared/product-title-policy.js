const DEFAULT_MAX_TITLE_LENGTH = 150;

const TITLE_ACRONYMS = new Set([
  "AI", "AMD", "CPU", "DDR", "DECT", "DPI", "DVR", "GB", "HD", "HDD", "HDMI",
  "IP", "LCD", "LED", "MFP", "NAS", "NVR", "PC", "POE", "RAM", "RFID", "SIP",
  "SSD", "TB", "UHD", "UPS", "USB", "VA", "VESA", "VPN", "WIFI",
]);

export const stripProductTitleHtml = (value) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

export const normalizeProductTitleToken = (value) =>
  stripProductTitleHtml(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const removeSupplierReferences = (value) =>
  stripProductTitleHtml(value)
    .replace(/^\s*\d{8,14}\s+/, "")
    .replace(/\s*Product code:\s*[^.;]+[.;]?/gi, "")
    .replace(/\s*supplier reference:\s*[^.;]+[.;]?/gi, "")
    .replace(/\s*;?\s*supplier reference\s+[^.;]+[.;]?/gi, "")
    .replace(/\s+/g, " ")
    .trim();

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const removeLeadingBrand = (title, brand) => {
  if (!brand) return title;
  return title.replace(new RegExp(`^${escapeRegExp(brand)}(?:\\s+|\\s*[-:|]\\s*)`, "i"), "").trim();
};

const removeMpn = (title, mpn) => {
  if (!mpn) return title;
  const expression = escapeRegExp(mpn).replace(/\s+/g, "\\s+");
  return title
    .replace(new RegExp(expression, "i"), " ")
    .replace(/\(\s*\)|\[\s*\]/g, " ")
    .replace(/^[\s,:;|/-]+|[\s,:;|/-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const isBarcodeLikeCode = (value) => /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value.trim());

const stripInternalCodePrefix = (code, brand) => {
  const cleanCode = stripProductTitleHtml(code);
  const cleanBrand = normalizeProductTitleToken(brand);
  const prefix =
    cleanBrand === "akuvox" ? /^AK[-_]+/i
    : cleanBrand === "grandstream" ? /^GR[-_]+/i
    : cleanBrand === "yealink" ? /^IPY[-_]+/i
    : null;

  if (!prefix || !prefix.test(cleanCode)) return cleanCode;
  const stripped = cleanCode.replace(prefix, "").trim();
  return /[a-z]/i.test(stripped) && /\d/.test(stripped) ? stripped : cleanCode;
};

const getDisplayModelCode = (code, brand) => {
  const normalizedCode = normalizeProductTitleToken(code);
  if (normalizeProductTitleToken(brand) === "akuvox" && normalizedCode.startsWith("it88")) {
    return "IT88";
  }
  return code;
};

export const getProductTitleMpn = (product) => {
  const brand = stripProductTitleHtml(product?.manufacturer);
  const code = getDisplayModelCode(
    stripInternalCodePrefix(stripProductTitleHtml(product?.code), brand),
    brand,
  );
  const supplierCode = getDisplayModelCode(
    stripInternalCodePrefix(stripProductTitleHtml(product?.supplierCode), brand),
    brand,
  );

  if (
    supplierCode.length >= 3 &&
    !isBarcodeLikeCode(supplierCode) &&
    normalizeProductTitleToken(supplierCode) !== normalizeProductTitleToken(code)
  ) {
    return supplierCode;
  }

  return code;
};

const getProductText = (product) =>
  `${product?.code || ""} ${product?.supplierCode || ""} ${product?.manufacturer || ""} ${product?.name || ""} ${product?.description || ""} ${product?.longDescription || ""}`.toLowerCase();

const isSmallWallControlText = (text) =>
  /\b(control\s*panel|indoor\s*monitor|intercom\s*monitor|touch\s*screen\s+android|android\s+based\s+control|sip\s+indoor\s+unit|hypanel|pg71n?)\b/.test(text);

export const getProductTitleType = (product) => {
  const text = getProductText(product);
  const primaryText = `${product?.name || ""} ${product?.description || ""}`.toLowerCase();
  if (/\b(adapter|adaptor|converter|interface)\b/.test(primaryText)) return "Adapter";
  if (/\b(cable|cord|lead)\b/.test(primaryText)) return "Cable";
  if (/\b(mount|bracket|stand)\b/.test(primaryText)) return "Mount";
  if (/\b(battery|power supply|powerboard|pdu)\b/.test(primaryText)) return "Power Accessory";
  if (/\btoner\b/.test(text)) return "Toner Cartridge";
  if (/\bink\b/.test(text)) return "Ink Cartridge";
  if (/\bdrum\b/.test(text)) return "Drum Unit";
  if (/\bribbon\b/.test(text)) return "Printer Ribbon";
  if (/\bprinthead\b/.test(text)) return "Printhead";
  if (/\b(paper|roll|media|film|vinyl|label)\b/.test(text)) return "Print Media";
  if (/\b(printer|multifunction|mfp|copier|plotter|large format)\b/.test(text)) return "Printer";
  if (/\b(scanner|document scanner)\b/.test(text)) return "Scanner";
  if (/\b(laptop|notebook|chromebook)\b/.test(text)) return "Laptop";
  if (/\btablet\b/.test(text)) return "Tablet";
  if (/\bserver\b/.test(text)) return "Server";
  if (/\b(desktop|workstation|pc\b)\b/.test(text)) return "Computer";
  if (/\bheadset\b/.test(text)) return "Headset";
  if (/\b(phone|handset|speakerphone|conference|voip|sip)\b/.test(text)) return "Business Phone";
  if (isSmallWallControlText(text)) return "Control Panel";
  if (/\b(monitor|display|screen|signage|panel)\b/.test(text)) return "Display";
  if (/\bprojector\b/.test(text)) return "Projector";
  if (/\b(nvr|dvr)\b/.test(text)) return "Video Recorder";
  if (/\b(camera|cctv|surveillance)\b/.test(text)) return "Security Camera";
  if (/\b(intercom|access control|rfid|door station)\b/.test(text)) return "Access Control";
  if (/\b(access point|wireless ap|wi-fi ap|wifi ap)\b/.test(text)) return "Wireless Access Point";
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

const normalizeSpecialProductTitle = (base, product, mpn) => {
  const brand = normalizeProductTitleToken(product?.manufacturer);
  if (brand === "akuvox" && normalizeProductTitleToken(mpn).startsWith("it88") && /\bindoor unit\b/i.test(base)) {
    const size = /\b10\s*(?:"|inch|in\b)?/i.test(base) ? `10" ` : "";
    const code = stripProductTitleHtml(product?.code);
    const mounting = /inwall|in-wall/i.test(code) ? "In-Wall" : /onwall|on-wall/i.test(code) ? "On-Wall" : "";
    const version = /\(([^)]+)\)/.exec(base)?.[0] || (/android/i.test(base) ? "(Android Version)" : "");
    return `${size}Smart Indoor Monitor ${mounting} ${version}`.replace(/\s+/g, " ").trim();
  }
  return base;
};

const shortenSpecificationDump = (value) =>
  value
    .replace(/\b(?:Operating system|Standard memory note|Transfer rates|Memory Slots|Internal Storage|Storage type|Additional storage|Processor family|Chipset|Display Type|Dimensions|Graphics|Power|Form factor|Camera|Keyboard|Pointing device|Audio|Expansion slots|I\/O Port location|Rear Ports|Wireless|Certifications and compliances)\b.*$/i, "")
    .replace(/\b\d+\s*Year\s+OS\s+Warranty\b/gi, "")
    .replace(/\b(?:KB\+Mouse|wty|WLAN Webcam|1xDP|1xHDMI|RJ45)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeKnownTerms = (value) =>
  value
    .replace(/\bwi[\s-]?fi\b/gi, "Wi-Fi")
    .replace(/\bpoe\b/gi, "PoE")
    .replace(/\bvoip\b/gi, "VoIP")
    .replace(/\busb\b/gi, "USB")
    .replace(/\bhdmi\b/gi, "HDMI")
    .replace(/\buhd\b/gi, "UHD")
    .replace(/\bssd\b/gi, "SSD")
    .replace(/\bhdd\b/gi, "HDD")
    .replace(/\bnvme\b/gi, "NVMe")
    .replace(/\b(?:gige|gigabit ethernet)\b/gi, "Gigabit Ethernet")
    .replace(/\s*\+\s*/g, " + ")
    .replace(/\s+/g, " ")
    .trim();

const hasExcessiveCapitalization = (title) => {
  const letters = title.replace(/[^a-z]/gi, "");
  return letters.length > 12 && (letters.match(/[A-Z]/g) || []).length / letters.length >= 0.72;
};

const toTitleWord = (word) => {
  const clean = word.replace(/[^a-z0-9]/gi, "").toUpperCase();
  if (TITLE_ACRONYMS.has(clean) || /\d/.test(word)) return word;
  return word
    .split(/([-/])/)
    .map((part) => /^[-/]$/.test(part) || !part ? part : `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join("");
};

const normalizeCapitalization = (title) =>
  hasExcessiveCapitalization(title) ? title.split(/\s+/).map(toTitleWord).join(" ") : title;

const truncateAtWord = (value, maxLength) => {
  if (value.length <= maxLength) return value;
  const shortened = value.slice(0, Math.max(1, maxLength - 1));
  const boundary = shortened.lastIndexOf(" ");
  return `${(boundary >= Math.floor(maxLength * 0.7) ? shortened.slice(0, boundary) : shortened).trim()}…`;
};

export const buildOptimizedProductTitle = (product, options = {}) => {
  const maxLength = Number.isFinite(options.maxLength) && options.maxLength > 20
    ? Math.floor(options.maxLength)
    : DEFAULT_MAX_TITLE_LENGTH;
  const brand = stripProductTitleHtml(product?.manufacturer) || "Internext";
  const mpn = getProductTitleMpn(product);
  const sourceName = product?.description || product?.name || product?.code || mpn || "Product";
  const rawBase = removeMpn(
    removeLeadingBrand(removeSupplierReferences(sourceName), brand),
    mpn,
  );
  const base = normalizeKnownTerms(shortenSpecificationDump(normalizeSpecialProductTitle(rawBase, product, mpn)));
  const productType = getProductTitleType(product);
  const baseToken = normalizeProductTitleToken(base);
  const typeToken = normalizeProductTitleToken(productType);
  const descriptor = [
    productType && typeToken && !baseToken.includes(typeToken) ? productType : "",
    base || (!productType ? "Technology Product" : ""),
  ].filter(Boolean).join(" - ");
  const identity = [brand, mpn].filter(Boolean).join(" ");
  const title = normalizeCapitalization(`${identity}${descriptor ? ` - ${descriptor}` : ""}`)
    .replace(/\s+/g, " ")
    .replace(/\s+-\s+-\s+/g, " - ")
    .trim();

  return truncateAtWord(title || "Internext Product", maxLength);
};
