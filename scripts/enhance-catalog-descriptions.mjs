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
]);

const SMALL_WORDS = new Set(["and", "or", "for", "with", "to", "of", "in", "on", "at", "by"]);

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uppercaseRatio(value) {
  const letters = (value.match(/[A-Za-z]/g) || []).length;
  const upper = (value.match(/[A-Z]/g) || []).length;
  return letters === 0 ? 0 : upper / letters;
}

function formatToken(token, isFirstToken) {
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
  if (!isFirstToken && SMALL_WORDS.has(lowerCore)) {
    return clean.replace(core, lowerCore);
  }

  const titleCased = `${lowerCore.charAt(0).toUpperCase()}${lowerCore.slice(1)}`;
  return clean.replace(core, titleCased);
}

function polishTitle(raw) {
  const text = normalizeWhitespace(raw);
  if (!text) {
    return text;
  }

  if (uppercaseRatio(text) < 0.6) {
    return text;
  }

  const tokens = text.split(" ");
  return tokens.map((token, index) => formatToken(token, index === 0)).join(" ");
}

function inferCategory(text) {
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
    return "network and infrastructure product";
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
}

function inferUseCase(text) {
  if (/(toner|cartridge|drum|ink|ribbon|filament|printhead|consumable)/i.test(text)) {
    return "maintaining print quality and keeping business print fleets operational";
  }
  if (/(scanner|archiving|document capture)/i.test(text)) {
    return "high-volume document capture, archiving, and workflow digitisation";
  }
  if (/(printer|mfp|multifunction|plotter|designjet|imageprograf)/i.test(text)) {
    return "office printing, production output, and day-to-day document workflows";
  }
  if (/(intercom|doorbell|door phone|access control|biometric|rfid)/i.test(text)) {
    return "building security, visitor management, and controlled site access";
  }
  if (/(ups|power supply|battery backup)/i.test(text)) {
    return "power continuity and protection of critical systems";
  }
  if (/(router|switch|access point|network|nas|storage)/i.test(text)) {
    return "network reliability, connectivity, and infrastructure performance";
  }
  if (/(camera|cctv|nvr|dvr|surveillance|ptz)/i.test(text)) {
    return "continuous monitoring, recording, and security incident visibility";
  }
  if (/(display|projector|panel|signage|interactive)/i.test(text)) {
    return "presentations, collaboration, and visual communication in commercial spaces";
  }
  if (/(headset|voip|conference|speakerphone|sip)/i.test(text)) {
    return "clear business communication and modern unified communications deployments";
  }
  return "general professional technology deployments";
}

function extractSpecFragments(text) {
  const fragments = [];
  const specs = text.match(
    /\b\d+(\.\d+)?\s?(?:\"|inch|in|mm|cm|w|kw|va|v|a|mah|gb|tb|mp|fps|hz|dpi|ppm|pages?|ml|m)\b/gi,
  );
  if (specs) {
    fragments.push(...specs.slice(0, 3));
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
  ];
  for (const key of keywords) {
    if (new RegExp(`\\b${key.replace("-", "[- ]?")}\\b`, "i").test(text)) {
      fragments.push(key);
    }
  }

  return Array.from(new Set(fragments)).slice(0, 4);
}

function extractHighlights(text) {
  const highlights = [];

  if (/\bpoe\b/i.test(text)) {
    highlights.push("PoE support helps simplify installation by reducing separate power cabling.");
  }
  if (/(wifi|wireless|bluetooth)/i.test(text)) {
    highlights.push("Wireless connectivity options provide flexible deployment across different environments.");
  }
  if (/\bduplex\b/i.test(text)) {
    highlights.push("Duplex capability improves throughput and reduces manual handling.");
  }
  if (/\ba3\b/i.test(text)) {
    highlights.push("A3 capability supports larger format workflows and specialist output requirements.");
  } else if (/\ba4\b/i.test(text)) {
    highlights.push("A4 support makes it suitable for day-to-day business document workflows.");
  }
  if (/(facial recognition|biometric|rfid)/i.test(text)) {
    highlights.push("Advanced identity features improve security and controlled access management.");
  }
  if (/(laser|high speed|high-speed|production)/i.test(text)) {
    highlights.push("Designed for reliable high-volume operation in demanding environments.");
  }

  return highlights.slice(0, 2);
}

function buildLongDescription(product) {
  const brand = normalizeWhitespace(product.manufacturer);
  const title = polishTitle(product.description);
  const category = inferCategory(title);
  const useCase = inferUseCase(title);
  const specs = extractSpecFragments(title);
  const highlights = extractHighlights(title);

  const intro = brand
    ? `${brand} ${title} is a ${category} designed for professional and commercial use.`
    : `${title} is a ${category} designed for professional and commercial use.`;
  const context = `It is suitable for ${useCase}, with a focus on dependable performance and straightforward integration.`;
  const specsLine =
    specs.length > 0
      ? `Key specifications and technologies include ${specs.join(", ")}.`
      : "It is engineered to meet practical business requirements with consistent output and serviceability.";

  const tail = "It is built for reliable daily operation, straightforward deployment, and long-term serviceability.";
  let description = [intro, context, specsLine, ...highlights, tail].join(" ");
  if (description.split(/\s+/).filter(Boolean).length < 25) {
    description += " This model is intended to deliver stable operation and practical value in business environments.";
  }
  return description;
}

const raw = fs.readFileSync(catalogPath, "utf8");
const catalog = JSON.parse(raw);

for (const item of catalog) {
  item.description = polishTitle(item.description);
  item.longDescription = buildLongDescription(item);
}

fs.writeFileSync(catalogPath, JSON.stringify(catalog));
console.log(`Enhanced descriptions for ${catalog.length} products.`);
