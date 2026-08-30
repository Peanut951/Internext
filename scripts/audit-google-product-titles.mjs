import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const FEED_PATH = path.join(ROOT, "public", "google-products.xml");

const decodeXml = (value) =>
  String(value || "")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

const normalizeToken = (value) =>
  decodeXml(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const readTag = (item, tag) => {
  const match = item.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return decodeXml(match?.[1]?.trim() || "");
};

if (!fs.existsSync(FEED_PATH)) {
  console.error(`Google product title audit failed: ${FEED_PATH} does not exist.`);
  process.exit(1);
}

const feed = fs.readFileSync(FEED_PATH, "utf8");
const items = feed.match(/<item>[\s\S]*?<\/item>/gi) || [];
const failures = [];

for (const item of items) {
  const id = readTag(item, "g:id");
  const title = readTag(item, "g:title");
  const brand = readTag(item, "g:brand");
  const mpn = readTag(item, "g:mpn");
  const normalizedTitle = normalizeToken(title);
  const missing = [];

  if (!title) missing.push("title");
  if (brand && !normalizedTitle.includes(normalizeToken(brand))) missing.push("brand");
  if (mpn && !normalizedTitle.includes(normalizeToken(mpn))) missing.push("mpn");

  if (missing.length) {
    failures.push({ id, title, brand, mpn, missing });
  }
}

console.log(
  JSON.stringify(
    {
      feed: path.relative(ROOT, FEED_PATH),
      productsChecked: items.length,
      invalidTitles: failures.length,
    },
    null,
    2,
  ),
);

if (failures.length) {
  console.error("Google product titles missing required identifiers:");
  console.error(JSON.stringify(failures.slice(0, 50), null, 2));
  process.exit(1);
}
