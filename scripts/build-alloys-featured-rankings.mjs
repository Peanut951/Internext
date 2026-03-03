import fs from "node:fs";
import path from "node:path";

const catalogPath = path.resolve("public", "data", "catalog-products.json");
const outputPath = path.resolve("public", "data", "alloys-featured-rankings.json");
const baseUrl = "https://www.alloys.com.au";

const CATEGORY_QUERIES = {
  "audio-visual": ["audio visual", "commercial display", "projector"],
  cameras: ["camera", "mirrorless camera", "ptz camera"],
  "ip-surveillance": ["ip surveillance", "ip camera", "nvr"],
  "office-products": ["office technology", "printer", "scanner"],
  printers: ["printer", "multifunction printer"],
  "print-consumables": ["toner cartridge", "ink cartridge"],
  scanners: ["document scanner", "portable scanner"],
  "security-automation": ["access control", "intercom", "ups"],
  "storage-networking": ["network switch", "router", "access point"],
  "unified-communications": ["headset", "ip phone", "conference camera"],
  projectors: ["projector", "laser projector"],
  "digital-signage": ["digital signage", "signage display"],
  "tvs-panels": ["commercial display", "display panel", "monitor"],
  "interactive-panels": ["interactive display", "touch display", "interactive panel"],
  "mounts-brackets": ["wall mount", "display bracket", "ceiling mount"],
  collaboration: ["conference camera", "wireless presentation", "meeting room"],
  "consumer-cameras": ["mirrorless camera", "compact camera", "dslr camera"],
  "professional-cameras": ["ptz camera", "camcorder", "cinema camera"],
  "imaging-accessories": ["camera accessory", "camera battery", "camera lens"],
  "ip-cameras": ["ip camera", "network camera", "security camera"],
  "nvrs-recorders": ["nvr", "video recorder", "network video recorder"],
  "surveillance-kits": ["cctv kit", "surveillance kit"],
  "surveillance-accessories": ["camera mount", "camera housing", "surveillance accessory"],
  shredders: ["shredder"],
  "office-technology": ["laminator", "binding machine", "presenter"],
  "a4-printers": ["a4 printer"],
  "a3-printers": ["a3 printer"],
  inkjet: ["inkjet printer"],
  laser: ["laser printer"],
  "large-format": ["large format printer", "designjet", "imageprograf"],
  "3d-printers": ["3d printer"],
  "dot-matrix": ["dot matrix printer"],
  "printer-warranties": ["printer warranty", "printer support"],
  "printer-accessories": ["printer accessory", "paper tray", "printer feeder"],
  multifunction: ["multifunction printer", "mfp"],
  "inkjet-consumables": ["ink cartridge", "ink bottle"],
  "laser-consumables": ["toner cartridge", "drum unit"],
  "large-format-consumables": ["designjet ink", "large format ink", "imageprograf ink"],
  "ribbon-tape": ["label tape", "printer ribbon"],
  "3d-filament": ["3d filament"],
  "other-consumables": ["maintenance kit", "staple cartridge"],
  "a4-scanners": ["a4 scanner", "document scanner"],
  "a3-scanners": ["a3 scanner"],
  "portable-scanners": ["portable scanner", "mobile scanner"],
  imaging: ["archiving scanner", "microfilm scanner"],
  "scanner-accessories": ["scanner accessory", "scanner roller kit"],
  "scanner-warranties": ["scanner warranty", "scanner support"],
  "access-control": ["access control", "card reader", "door controller"],
  "intercom-systems": ["intercom", "door station", "video intercom"],
  "ip-communications": ["sip device", "paging speaker", "ip communication"],
  "ups-power": ["ups", "battery backup", "power protection"],
  "automation-lighting": ["smart relay", "dimmer", "lighting automation"],
  "energy-management": ["energy meter", "power meter"],
  nvrs: ["nvr", "network video recorder"],
  storage: ["nas", "storage drive", "backup storage"],
  switches: ["network switch", "poe switch"],
  routers: ["router", "gateway"],
  "access-points": ["access point", "wifi access point"],
  "networking-accessories": ["patch panel", "network cable", "rack accessory"],
  headsets: ["headset"],
  conference: ["speakerphone", "conference phone", "conference camera"],
  voip: ["ip phone", "sip phone", "desk phone"],
  "video-collab": ["video conference", "webcam", "meeting bar"],
  "uc-accessories": ["usb adapter", "conference accessory", "headset accessory"],
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

const extractProductsFromSearch = (html) => {
  const match = html.match(/window\.products\s*=\s*(\[[\s\S]*?\]);/i);
  if (!match) {
    return [];
  }

  try {
    return JSON.parse(match[1]);
  } catch {
    return [];
  }
};

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${url}`);
  }

  return response.text();
};

const catalog = readJson(catalogPath);
const catalogCodes = new Set(catalog.map((product) => product.code));
const rankings = {};

for (const [slug, queries] of Object.entries(CATEGORY_QUERIES)) {
  const scores = {};

  for (const query of queries) {
    const html = await fetchText(`${baseUrl}/search?ProductSearch=${encodeURIComponent(query)}`);
    const results = extractProductsFromSearch(html);

    results.forEach((result) => {
      const code = result.ProductCode;
      if (!catalogCodes.has(code)) {
        return;
      }

      const position = Number(result.Index ?? 999);
      const score = Math.max(0, 120 - position * 4);
      scores[code] = (scores[code] || 0) + score;
    });
  }

  rankings[slug] = scores;
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    methodology:
      "Featured rankings are inferred from public Alloys search-result ordering across category-specific queries. This is a proxy for merchandising prominence, not private sales data.",
    rankings,
  }),
);

console.log(`Built featured rankings for ${Object.keys(rankings).length} category buckets.`);
