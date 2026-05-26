import fs from "node:fs";
import path from "node:path";

const auditPath = path.resolve("reports/product-image-audit.json");
const outputPath = path.resolve("reports/product-image-online-sourcing-queue.csv");

const manufacturerSites = {
  Akuvox: "akuvox.com",
  Axis: "axis.com",
  Canon: "canon.com.au",
  Epson: "epson.com.au",
  Fujifilm: "fujifilm.com",
  Fujitsu: "pfu.ricoh.com",
  Grandstream: "grandstream.com",
  HP: "hp.com",
  Kyocera: "kyoceradocumentsolutions.com.au",
  Lexmark: "lexmark.com",
  LG: "lg.com",
  Makerbot: "makerbot.com",
  Panasonic: "panasonic.com",
  Promethean: "prometheanworld.com",
  Ricoh: "ricoh.com.au",
  Shelly: "shelly.com",
  Ultimaker: "ultimaker.com",
};

const severityScore = (issues) => {
  const weights = {
    no_image: 100,
    broken_image: 90,
    unknown_dimensions: 70,
    not_exact_code_match: 50,
    low_resolution: 35,
    low_pixel_count: 25,
    very_small_file: 15,
  };

  return issues.reduce((sum, issue) => sum + (weights[issue] || 0), 0);
};

const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
const rows = audit.results
  .filter((result) => result.issues.length > 0)
  .map((result) => {
    const site = manufacturerSites[result.manufacturer] || "";
    const searchTerms = [
      site ? `site:${site}` : "",
      result.manufacturer,
      result.code,
      result.supplierCode,
      "product image",
    ]
      .filter(Boolean)
      .join(" ");

    return {
      priority: severityScore(result.issues),
      code: result.code,
      supplierCode: result.supplierCode,
      manufacturer: result.manufacturer,
      description: result.description,
      currentUrl: result.selectedUrl,
      width: result.width,
      height: result.height,
      issues: result.issues.join(";"),
      officialSite: site,
      searchQuery: searchTerms,
      searchUrl: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchTerms)}`,
    };
  })
  .sort((a, b) => b.priority - a.priority || a.manufacturer.localeCompare(b.manufacturer));

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  [
    [
      "priority",
      "code",
      "supplierCode",
      "manufacturer",
      "description",
      "currentUrl",
      "width",
      "height",
      "issues",
      "officialSite",
      "searchQuery",
      "searchUrl",
    ],
    ...rows.map((row) => [
      row.priority,
      row.code,
      row.supplierCode,
      row.manufacturer,
      row.description,
      row.currentUrl,
      row.width,
      row.height,
      row.issues,
      row.officialSite,
      row.searchQuery,
      row.searchUrl,
    ]),
  ]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n"),
);

console.log(JSON.stringify({
  queued: rows.length,
  outputPath,
  topManufacturers: Object.entries(
    rows.reduce((counts, row) => {
      counts[row.manufacturer] = (counts[row.manufacturer] || 0) + 1;
      return counts;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20),
}, null, 2));
