import fs from "node:fs";
import path from "node:path";

const catalogPath = path.resolve("public", "data", "catalog-products.json");

const ACRONYMS = new Set([
  "IP",
  "POE",
  "UPS",
  "VOIP",
  "CCTV",
  "A4",
  "A3",
  "3D",
  "USB",
  "WIFI",
  "WI-FI",
  "NVR",
  "DVR",
  "HD",
  "UHD",
  "LED",
  "LCD",
  "RGB",
  "OEM",
  "RFID",
  "HID",
  "LTE",
  "AI",
  "PTZ",
  "SIP",
  "NAS",
  "SSD",
  "HDD",
  "MFP",
  "RJ45",
  "CAT6",
  "CAT5E",
]);

const SMALL_WORDS = new Set(["and", "or", "for", "with", "to", "of", "in", "on", "at", "by"]);

const normalizeWhitespace = (value) =>
  String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const cleanEncoding = (value) =>
  normalizeWhitespace(value)
    .replace(/[\uFFFD]+/g, "")
    .replace(/\s([,.;:!?])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();

const uppercaseRatio = (value) => {
  const letters = (value.match(/[A-Za-z]/g) || []).length;
  const upper = (value.match(/[A-Z]/g) || []).length;
  return letters === 0 ? 0 : upper / letters;
};

const formatToken = (token, isFirstToken) => {
  const clean = token.trim();
  if (!clean) return clean;

  const core = clean.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");
  if (!core) return clean;

  const upperCore = core.toUpperCase();
  if (ACRONYMS.has(upperCore)) {
    return clean.replace(core, upperCore === "WIFI" ? "Wi-Fi" : upperCore);
  }

  if ((/^[A-Z0-9-]{3,}$/.test(core) && /[0-9-]/.test(core)) || /[A-Z]+\d|\d+[A-Z]+/.test(core)) {
    return clean;
  }

  const lowerCore = core.toLowerCase();
  if (!isFirstToken && SMALL_WORDS.has(lowerCore)) {
    return clean.replace(core, lowerCore);
  }

  return clean.replace(core, `${lowerCore.charAt(0).toUpperCase()}${lowerCore.slice(1)}`);
};

const polishTitle = (raw) => {
  const text = cleanEncoding(raw);
  if (!text) return text;

  if (uppercaseRatio(text) < 0.58) {
    return text;
  }

  return text
    .split(" ")
    .map((token, index) => formatToken(token, index === 0))
    .join(" ")
    .replace(/\bAccesscontrol\b/gi, "Access Control")
    .replace(/\bOnwall\b/gi, "On-Wall");
};

const normalizeManufacturer = (value) => {
  const cleaned = cleanEncoding(value || "");
  if (!cleaned) return "Unbranded";

  return cleaned
    .split(" ")
    .map((part) => {
      if (part.toUpperCase() === part && part.length <= 4) {
        return part;
      }
      return `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}`;
    })
    .join(" ");
};

const inferType = (text) => {
  if (/(toner|cartridge|drum|ink|ribbon|filament|printhead|waste ink|collector unit)/i.test(text)) return "print consumable";
  if (/(scanner|archiving|document capture)/i.test(text)) return "document scanning product";
  if (/(printer|mfp|multifunction|plotter|designjet|imageprograf)/i.test(text)) return "printing product";
  if (/(intercom|doorbell|door phone|access control|biometric|rfid)/i.test(text)) return "security and access control product";
  if (/(ups|power supply|battery backup|pdu)/i.test(text)) return "power management product";
  if (/(router|switch|access point|network|nas|storage|hdd|ssd)/i.test(text)) return "network and storage product";
  if (/(camera|cctv|nvr|dvr|surveillance|ptz)/i.test(text)) return "video surveillance product";
  if (/(display|projector|panel|signage|interactive)/i.test(text)) return "audio visual product";
  if (/(headset|voip|conference|speakerphone|sip)/i.test(text)) return "communications product";
  return "technology product";
};

const inferUseCase = (text) => {
  if (/(toner|cartridge|drum|ink|ribbon|filament|printhead|waste ink|collector unit)/i.test(text)) return "maintaining print output quality and device uptime";
  if (/(scanner|archiving|document capture)/i.test(text)) return "document capture, archiving, and digitisation workflows";
  if (/(printer|mfp|multifunction|plotter|designjet|imageprograf)/i.test(text)) return "business printing and day-to-day document workflows";
  if (/(intercom|doorbell|door phone|access control|biometric|rfid)/i.test(text)) return "secure site access and visitor management";
  if (/(ups|power supply|battery backup|pdu)/i.test(text)) return "power continuity for critical systems";
  if (/(router|switch|access point|network|nas|storage|hdd|ssd)/i.test(text)) return "network connectivity, storage, and infrastructure reliability";
  if (/(camera|cctv|nvr|dvr|surveillance|ptz)/i.test(text)) return "continuous monitoring and incident visibility";
  if (/(display|projector|panel|signage|interactive)/i.test(text)) return "presentation, collaboration, and digital signage environments";
  if (/(headset|voip|conference|speakerphone|sip)/i.test(text)) return "business communication and unified communications deployments";
  return "general business technology deployments";
};

const extractDetailFragments = (text) => {
  const details = [];

  const specs = text.match(/\b\d+(?:[.,]\d+)?\s?(?:"|inch|in|mm|cm|w|kw|va|v|a|mah|gb|tb|mp|fps|hz|dpi|ppm|pages?|ml|m|gsm|um)\b/gi);
  if (specs) {
    details.push(...specs.slice(0, 4));
  }

  const pageYield = text.match(/\b\d[\d,\s]*page yield\b/gi);
  if (pageYield) {
    details.push(...pageYield.slice(0, 2));
  }

  const keywords = [
    "PoE",
    "Wi-Fi",
    "Bluetooth",
    "Duplex",
    "RFID",
    "Biometric",
    "SIP",
    "NVR",
    "DVR",
    "A4",
    "A3",
    "4K",
    "UHD",
    "Laser",
    "Inkjet",
    "Interactive",
    "Android",
    "Linux",
  ];

  for (const keyword of keywords) {
    const re = new RegExp(`\\b${keyword.replace("-", "[- ]?")}\\b`, "i");
    if (re.test(text)) {
      details.push(keyword);
    }
  }

  const unique = Array.from(new Set(details.map((value) => normalizeWhitespace(value))));
  const filtered = unique.filter((item) => {
    const itemLower = item.toLowerCase();
    return !unique.some((other) => other !== item && other.toLowerCase().includes(itemLower));
  });
  return filtered.slice(0, 5);
};

const buildLongDescription = (product) => {
  const manufacturer = normalizeManufacturer(product.manufacturer);
  const title = polishTitle(product.description);
  const type = inferType(title);
  const useCase = inferUseCase(title);
  const details = extractDetailFragments(title);

  const namedTitle = title.toLowerCase().startsWith(manufacturer.toLowerCase())
    ? title
    : `${manufacturer} ${title}`;
  const intro = `${namedTitle} is a ${type} designed for professional and business use.`;
  const context = `It is best suited to ${useCase}, with focus on dependable operation and straightforward integration.`;
  const detailsLine =
    details.length > 0
      ? `Key details identified from the product listing include ${details.join(", ")}.`
      : "The product listing indicates practical deployment for day-to-day business requirements.";

  const codeLine = `Product code: ${cleanEncoding(product.code)}${product.supplierCode ? `; supplier reference: ${cleanEncoding(product.supplierCode)}.` : "."}`;

  return [intro, context, detailsLine, codeLine].join(" ");
};

const raw = fs.readFileSync(catalogPath, "utf8");
const catalog = JSON.parse(raw);

for (const item of catalog) {
  item.description = polishTitle(item.description);
  item.manufacturer = normalizeManufacturer(item.manufacturer);
  item.longDescription = buildLongDescription(item);
}

fs.writeFileSync(catalogPath, JSON.stringify(catalog));
console.log(`Enhanced descriptions for ${catalog.length} products.`);
