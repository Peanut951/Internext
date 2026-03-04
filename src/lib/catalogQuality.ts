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
]);

const SMALL_WORDS = new Set(["and", "or", "for", "with", "to", "of", "in", "on", "at", "by"]);

type CatalogQualityInput = {
  code?: string;
  manufacturer?: string;
  description?: string;
  longDescription?: string;
  supplierCode?: string;
};

const normalizeWhitespace = (value: string) =>
  String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const cleanEncodingNoise = (value: string) =>
  normalizeWhitespace(value)
    .replace(/[\uFFFD]+/g, "")
    .replace(/\s([,.;:!?])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();

const uppercaseRatio = (value: string) => {
  const letters = (value.match(/[A-Za-z]/g) || []).length;
  const upper = (value.match(/[A-Z]/g) || []).length;
  return letters === 0 ? 0 : upper / letters;
};

const formatToken = (token: string, isFirst: boolean) => {
  const clean = token.trim();
  if (!clean) {
    return clean;
  }

  const core = clean.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");
  if (!core) {
    return clean;
  }

  const upperCore = core.toUpperCase();
  if (ACRONYMS.has(upperCore)) {
    return clean.replace(core, upperCore === "WIFI" ? "Wi-Fi" : upperCore);
  }

  if (/^[A-Z0-9-]{3,}$/.test(core) || /[A-Z]+\d|\d+[A-Z]+/.test(core)) {
    return clean;
  }

  const lowerCore = core.toLowerCase();
  if (!isFirst && SMALL_WORDS.has(lowerCore)) {
    return clean.replace(core, lowerCore);
  }

  return clean.replace(core, `${lowerCore.charAt(0).toUpperCase()}${lowerCore.slice(1)}`);
};

const polishTitle = (raw: string) => {
  const text = cleanEncodingNoise(raw);
  if (!text) {
    return text;
  }

  if (uppercaseRatio(text) < 0.62) {
    return text;
  }

  return text
    .split(" ")
    .map((token, index) => formatToken(token, index === 0))
    .join(" ");
};

const inferCategory = (text: string) => {
  if (/(toner|cartridge|drum|ink|ribbon|filament|printhead|consumable)/i.test(text)) {
    return "print consumable";
  }
  if (/(scanner|archiving|document capture)/i.test(text)) {
    return "document scanning device";
  }
  if (/(printer|mfp|multifunction|plotter|designjet|imageprograf)/i.test(text)) {
    return "printing solution";
  }
  if (/(intercom|doorbell|door phone|access control|biometric|rfid)/i.test(text)) {
    return "security and access control device";
  }
  if (/(ups|power supply|battery backup)/i.test(text)) {
    return "power protection solution";
  }
  if (/(router|switch|access point|network|nas|storage)/i.test(text)) {
    return "network infrastructure product";
  }
  if (/(camera|cctv|nvr|dvr|surveillance|ptz)/i.test(text)) {
    return "video surveillance product";
  }
  if (/(display|projector|panel|signage|interactive)/i.test(text)) {
    return "audio visual product";
  }
  if (/(headset|voip|conference|speakerphone|sip)/i.test(text)) {
    return "communications product";
  }
  return "technology product";
};

const inferUseCase = (text: string) => {
  if (/(toner|cartridge|drum|ink|ribbon|filament|printhead|consumable)/i.test(text)) {
    return "maintaining print quality and keeping business print fleets operational";
  }
  if (/(scanner|archiving|document capture)/i.test(text)) {
    return "high-volume document capture and workflow digitisation";
  }
  if (/(printer|mfp|multifunction|plotter|designjet|imageprograf)/i.test(text)) {
    return "office printing and daily document workflows";
  }
  if (/(intercom|doorbell|door phone|access control|biometric|rfid)/i.test(text)) {
    return "building access control and visitor management";
  }
  if (/(ups|power supply|battery backup)/i.test(text)) {
    return "power continuity for critical business systems";
  }
  if (/(router|switch|access point|network|nas|storage)/i.test(text)) {
    return "network reliability and infrastructure performance";
  }
  if (/(camera|cctv|nvr|dvr|surveillance|ptz)/i.test(text)) {
    return "continuous monitoring and security visibility";
  }
  if (/(display|projector|panel|signage|interactive)/i.test(text)) {
    return "presentations and visual communication in commercial spaces";
  }
  if (/(headset|voip|conference|speakerphone|sip)/i.test(text)) {
    return "clear business communication and UC deployments";
  }
  return "general professional technology deployments";
};

const extractHighlights = (text: string) => {
  const patterns = [
    /\b\d+(?:\.\d+)?\s?(?:"|inch|ppm|dpi|nits?|gb|tb|mp|fps|hz|w|va)\b/gi,
    /\b(?:A3|A4|4K|UHD|FHD|Wi[- ]?Fi|PoE|RFID|Bluetooth|Android|Linux|Duplex|Touchscreen|SIP|LTE|5G|PTZ|DECT|USB|HDMI)\b/gi,
    /\b\d+\s?(?:port|ports|user|users|channel|channels)\b/gi,
  ];

  const hits = patterns.flatMap((pattern) => text.match(pattern) || []);
  const normalized = hits
    .map((item) => normalizeWhitespace(item))
    .map((item) => {
      const lower = item.toLowerCase();
      if (lower === "wifi" || lower === "wi fi" || lower === "wi-fi") return "Wi-Fi";
      if (lower === "poe") return "PoE";
      if (lower === "rfid") return "RFID";
      if (lower === "sip") return "SIP";
      if (lower === "lte") return "LTE";
      if (lower === "dect") return "DECT";
      if (lower === "ptz") return "PTZ";
      if (lower === "uhd") return "UHD";
      if (lower === "fhd") return "FHD";
      if (lower === "a3") return "A3";
      if (lower === "a4") return "A4";
      if (lower === "4k") return "4K";
      if (lower === "5g") return "5G";
      if (lower === "usb") return "USB";
      if (lower === "hdmi") return "HDMI";
      return item;
    })
    .filter(Boolean);

  return Array.from(new Set(normalized)).slice(0, 4);
};

const inferAudience = (text: string) => {
  if (/(education|classroom|interactive|presentation|signage)/i.test(text)) {
    return "education and commercial presentation spaces";
  }
  if (/(camera|surveillance|nvr|intercom|access control|rfid|biometric)/i.test(text)) {
    return "security, monitoring, and controlled-access environments";
  }
  if (/(printer|scanner|mfp|document)/i.test(text)) {
    return "busy office and document-workflow environments";
  }
  if (/(router|switch|access point|network|nas|storage|wifi)/i.test(text)) {
    return "managed network and infrastructure deployments";
  }
  if (/(conference|voip|sip|headset|speakerphone|webcam)/i.test(text)) {
    return "business communications and collaboration setups";
  }
  return "professional business deployments";
};

const shouldReplaceLongDescription = (value: string) => {
  const cleaned = cleanEncodingNoise(value);
  if (!cleaned) {
    return true;
  }

  if (cleaned.length < 140) {
    return true;
  }

  if (/technology product designed for professional and commercial use/i.test(cleaned)) {
    return true;
  }

  return false;
};

const buildLongDescription = (manufacturer: string, description: string, code: string) => {
  const category = inferCategory(description);
  const useCase = inferUseCase(description);
  const audience = inferAudience(description);
  const highlights = extractHighlights(description).join(", ");
  const brandPrefix = manufacturer ? `${manufacturer} ` : "";
  const codeText = code ? ` Product code: ${code}.` : "";
  const featureText = highlights
    ? ` Key details include ${highlights}, which help position it for the right deployment.`
    : "";

  return `${brandPrefix}${description} is a ${category} intended for ${audience}. ` +
    `It suits teams looking for a practical option for ${useCase}, with emphasis on dependable day-to-day operation and straightforward rollout.${featureText}${codeText}`;
};

const normalizeManufacturer = (value?: string) => {
  const cleaned = cleanEncodingNoise(value || "");
  if (!cleaned) {
    return "Unbranded";
  }
  return cleaned
    .split(" ")
    .map((part) => (part.toUpperCase() === part && part.length <= 4 ? part : `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}`))
    .join(" ");
};

export const getCatalogSummaryText = <T extends CatalogQualityInput>(product: T) => {
  const longDescription = cleanEncodingNoise(product.longDescription || "");
  if (longDescription) {
    const sentences = longDescription.split(/(?<=[.!?])\s+/).filter(Boolean);
    const summary = sentences[1] || sentences[0] || longDescription;
    return summary.length > 120 ? `${summary.slice(0, 117).trimEnd()}...` : summary;
  }

  const cleaned = cleanEncodingNoise(product.description || "");
  return cleaned.length > 120 ? `${cleaned.slice(0, 117).trimEnd()}...` : cleaned;
};

export const normalizeCatalogProduct = <T extends CatalogQualityInput>(product: T): T => {
  const description = polishTitle(product.description || "");
  const manufacturer = normalizeManufacturer(product.manufacturer);
  const existingLong = cleanEncodingNoise(product.longDescription || "");

  const longDescription = shouldReplaceLongDescription(existingLong)
    ? buildLongDescription(manufacturer, description, cleanEncodingNoise(product.code || ""))
    : existingLong;

  return {
    ...product,
    description,
    manufacturer,
    longDescription,
  };
};

export const normalizeCatalogProducts = <T extends CatalogQualityInput>(products: T[]) => {
  return products.map((product) => normalizeCatalogProduct(product));
};
