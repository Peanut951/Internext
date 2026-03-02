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
  "FXS",
  "FXO",
  "USB-C",
  "Wi-Fi 6",
  "Wi-Fi 7",
]);

const SMALL_WORDS = new Set(["and", "or", "for", "with", "to", "of", "in", "on", "at", "by"]);
const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "your",
  "into",
  "onto",
  "without",
  "supports",
  "support",
  "includes",
  "include",
  "series",
  "version",
  "kit",
  "pack",
  "black",
  "white",
  "silver",
  "grey",
  "gray",
  "blue",
  "red",
  "green",
  "yellow",
  "orange",
  "android",
  "linux",
  "edla",
  "nits",
  "nit",
  "wireless",
  "touchscreen",
  "compact",
  "smart",
  "large",
  "format",
  "colour",
  "color",
  "dye-sub",
  "point",
]);

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

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

const toSentenceCase = (value) => {
  const cleaned = cleanEncoding(value);
  if (!cleaned) return cleaned;
  return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}`;
};

const articleFor = (phrase) => (/^[aeiou]/i.test(cleanEncoding(phrase)) ? "an" : "a");

const inferType = (text) => {
  if (/(toner|cartridge|drum|ink|ribbon|filament|printhead|waste ink|collector unit|developer)/i.test(text)) return "print consumable";
  if (/(scanner|archiving|document capture)/i.test(text)) return "document scanning product";
  if (/(printer|mfp|multifunction|plotter|designjet|imageprograf|officejet|laserjet|ecotank)/i.test(text)) return "printing product";
  if (/(intercom|doorbell|door phone|access control|biometric|rfid)/i.test(text)) return "security and access control product";
  if (/(ups|power supply|battery backup|pdu)/i.test(text)) return "power management product";
  if (/(router|switch|access point|network|nas|storage|hdd|ssd|gateway)/i.test(text)) return "network and infrastructure product";
  if (/(camera|cctv|nvr|dvr|surveillance|ptz)/i.test(text)) return "video surveillance product";
  if (/(display|projector|panel|signage|interactive|screen|whiteboard|videowall|ifp|touch display|touch panel)/i.test(text)) return "audio visual product";
  if (/(headset|voip|conference|speakerphone|sip|video phone|handset|phone|speaker)/i.test(text)) return "communications product";
  if (/(mount|bracket|stand|adapter|module|dock|tray|case)/i.test(text)) return "supporting accessory";
  return "technology product";
};

const inferUseCase = (text) => {
  if (/(toner|cartridge|drum|ink|ribbon|filament|printhead|waste ink|collector unit|developer)/i.test(text)) return "maintaining print output quality and device uptime";
  if (/(scanner|archiving|document capture)/i.test(text)) return "document capture, archiving, and digitisation workflows";
  if (/(printer|mfp|multifunction|plotter|designjet|imageprograf|officejet|laserjet|ecotank)/i.test(text)) return "business printing, scanning, and day-to-day document workflows";
  if (/(intercom|doorbell|door phone|access control|biometric|rfid)/i.test(text)) return "secure site access, entry management, and visitor communication";
  if (/(ups|power supply|battery backup|pdu)/i.test(text)) return "power continuity for critical systems and attached electronics";
  if (/(router|switch|access point|network|nas|storage|hdd|ssd|gateway)/i.test(text)) return "network connectivity, infrastructure stability, and system expansion";
  if (/(camera|cctv|nvr|dvr|surveillance|ptz)/i.test(text)) return "continuous monitoring and incident visibility";
  if (/(display|projector|panel|signage|interactive|screen|whiteboard|videowall|ifp|touch display|touch panel)/i.test(text)) return "presentation, collaboration, signage, and shared visual communication";
  if (/(headset|voip|conference|speakerphone|sip|video phone|handset|phone|speaker)/i.test(text)) return "business communication and unified communications deployments";
  if (/(mount|bracket|stand|adapter|module|dock|tray|case)/i.test(text)) return "installation, expansion, and equipment fit-out work";
  return "general business technology deployments";
};

const inferAudience = (text) => {
  if (/(home|residential|consumer)/i.test(text)) return "home and small office users";
  if (/(enterprise|corporate|commercial|conference|boardroom)/i.test(text)) return "business and enterprise environments";
  if (/(education|classroom|teaching|school)/i.test(text)) return "education and training environments";
  if (/(retail|hospitality|signage)/i.test(text)) return "customer-facing commercial environments";
  if (/(security|access|surveillance|door)/i.test(text)) return "security and controlled-access installations";
  return "professional and business users";
};

const inferBenefit = (text) => {
  if (/(toner|cartridge|drum|ink|ribbon|filament|printhead|waste ink|collector unit|developer)/i.test(text)) {
    return "keeping print equipment supplied and ready for predictable output";
  }
  if (/(scanner|archiving|document capture)/i.test(text)) {
    return "moving paperwork into digital workflows with less manual handling";
  }
  if (/(printer|mfp|multifunction|plotter|designjet|imageprograf|officejet|laserjet|ecotank)/i.test(text)) {
    return "consistent document output and dependable office productivity";
  }
  if (/(intercom|doorbell|door phone|access control|biometric|rfid)/i.test(text)) {
    return "controlled entry and clearer front-of-site communication";
  }
  if (/(ups|power supply|battery backup|pdu)/i.test(text)) {
    return "stable power protection and reduced interruption risk";
  }
  if (/(router|switch|access point|network|nas|storage|hdd|ssd|gateway)/i.test(text)) {
    return "dependable connectivity, routing, and infrastructure performance";
  }
  if (/(camera|cctv|nvr|dvr|surveillance|ptz)/i.test(text)) {
    return "better site visibility, recording coverage, and response readiness";
  }
  if (/(display|projector|panel|signage|interactive|screen|whiteboard|videowall|ifp|touch display|touch panel)/i.test(text)) {
    return "clearer presentations, collaboration, and public-facing visual output";
  }
  if (/(headset|voip|conference|speakerphone|sip|video phone|handset|phone|speaker)/i.test(text)) {
    return "clearer communication between staff, customers, and remote participants";
  }
  if (/(mount|bracket|stand|adapter|module|dock|tray|case)/i.test(text)) {
    return "cleaner installation outcomes and better compatibility with the main system";
  }
  return "straightforward deployment and reliable day-to-day operation";
};

const inferFit = (text) => {
  if (/(wall mount|ceiling mount|bracket|mount|stand)/i.test(text)) return "installation and fit-out projects";
  if (/(indoor|outdoor|weatherproof|rugged)/i.test(text)) return "environment-specific deployments";
  if (/(duplex|high speed|ppm|page yield|a3|a4|large format)/i.test(text)) return "busy operational workflows";
  if (/(wifi|wi-fi|bluetooth|poe|sip|android|linux|lte|5g|rfid|fxs|fxo)/i.test(text)) return "integrated modern system deployments";
  return "general rollout and replacement requirements";
};

const extractDetailFragments = (text) => {
  const details = [];

  const specs = text.match(/\b\d+(?:[.,]\d+)?\s?(?:"|inch|in|mm|cm|w|kw|va|v|a|mah|gb|tb|mp|fps|hz|dpi|ppm|pages?|ml|m|gsm|um|port|ports|user|users|channel|channels)\b/gi);
  if (specs) {
    details.push(...specs.slice(0, 5));
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
    "Touchscreen",
    "5G",
    "LTE",
    "Wide Format",
    "Colour",
    "Mono",
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

const extractPrimaryNoun = (text, manufacturer) => {
  const cleaned = cleanEncoding(text)
    .replace(new RegExp(`\\b${escapeRegExp(manufacturer)}\\b`, "ig"), " ")
    .replace(/["()]/g, " ")
    .replace(/[^A-Za-z0-9+/-]+/g, " ");

  const tokens = cleaned
    .split(/\s+/)
    .map((token) => token.toLowerCase())
    .filter(
      (token) =>
        token &&
        !STOPWORDS.has(token) &&
        !/^\d/.test(token) &&
        !/[0-9]{2,}/.test(token) &&
        token.length > 2,
    );

  const preferred = [
    "printer",
    "scanner",
    "projector",
    "display",
    "monitor",
    "screen",
    "router",
    "switch",
    "gateway",
    "terminal",
    "phone",
    "handset",
    "speaker",
    "camera",
    "controller",
    "reader",
    "intercom",
    "doorbell",
    "monitor",
    "panel",
    "display",
    "touchscreen",
    "ifp",
    "accessory",
    "bracket",
    "mount",
    "supply",
    "cartridge",
    "toner",
    "ink",
    "drum",
    "battery",
    "ups",
    "module",
    "adapter",
    "tablet",
    "laptop",
    "workstation",
    "bar",
  ];

  for (const keyword of preferred) {
    if (tokens.includes(keyword)) {
      if (keyword === "ifp") {
        return "display";
      }
      return keyword;
    }
  }

  return tokens[0] || "product";
};

const formatFeatureList = (details) => {
  if (details.length === 0) return "";
  if (details.length === 1) return details[0];
  if (details.length === 2) return `${details[0]} and ${details[1]}`;
  return `${details.slice(0, -1).join(", ")}, and ${details.at(-1)}`;
};

const buildFeatureSentence = (details) => {
  if (details.length === 0) {
    return "The published specification points to a practical configuration aimed at dependable everyday use.";
  }
  return `Key specification cues in the listing include ${formatFeatureList(details)}.`;
};

const buildApplicationSentence = (text, noun) => {
  const audience = inferAudience(text);
  const benefit = inferBenefit(text);
  const fit = inferFit(text);
  return `It is aimed at ${audience} and suits ${fit}, especially where you need ${benefit} from this ${noun}.`;
};

const buildDifferentiatorSentence = (text, noun) => {
  if (/(kit|bundle|pack)/i.test(text)) {
    return "This bundled format helps buyers source a matched set of parts or devices in one line item.";
  }
  if (/(replacement|spare|mount|bracket|accessory|adapter|module|tray|case)/i.test(text)) {
    return "It is mainly intended as a supporting or replacement item that helps keep an existing setup complete and serviceable.";
  }
  if (/(toner|cartridge|drum|ink|ribbon|filament|printhead|waste ink|collector unit|developer)/i.test(text)) {
    return `As a consumable or service item, it is intended to match supported devices and expected operating requirements rather than act as a standalone ${noun}.`;
  }
  return `This model is positioned as a fit-for-purpose ${noun} for buyers who want a clearly specified option without unnecessary complexity.`;
};

const buildLongDescription = (product) => {
  const manufacturer = normalizeManufacturer(product.manufacturer);
  const title = polishTitle(product.description);
  const type = inferType(title);
  const useCase = inferUseCase(title);
  const details = extractDetailFragments(title);
  const noun = extractPrimaryNoun(title, manufacturer);

  const namedTitle = title.toLowerCase().startsWith(manufacturer.toLowerCase())
    ? title
    : `${manufacturer} ${title}`;

  const intro = `${namedTitle} is ${articleFor(type)} ${type} intended for ${inferAudience(title)}.`;
  const application = buildApplicationSentence(title, noun);
  const features = buildFeatureSentence(details);
  const differentiator = buildDifferentiatorSentence(title, noun);
  const useCaseLine = `Typical use includes ${useCase}.`;
  const codeLine = `Product code: ${cleanEncoding(product.code)}${product.supplierCode ? `; supplier reference: ${cleanEncoding(product.supplierCode)}.` : "."}`;

  return [intro, application, features, differentiator, useCaseLine, codeLine]
    .map(toSentenceCase)
    .join(" ");
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
