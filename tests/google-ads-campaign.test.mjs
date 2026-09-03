import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readCsvRows = (relativePath) => {
  const text = readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8").trim();
  const lines = text.split(/\r?\n/);

  return lines.slice(1).map((line) => {
    const values = [];
    let value = "";
    let quoted = false;

    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"' && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = !quoted;
      } else if (character === "," && !quoted) {
        values.push(value);
        value = "";
      } else {
        value += character;
      }
    }

    values.push(value);
    return values;
  });
};

test("Performance Max text assets fit Google Ads limits", () => {
  const rows = readCsvRows("docs/google-ads/text-assets.csv");
  const limits = { headline: 30, long_headline: 90, description: 90 };
  const counts = { headline: 0, long_headline: 0, description: 0 };

  for (const [type, text] of rows) {
    assert.ok(type in limits, `Unknown asset type: ${type}`);
    assert.ok(text.length > 0, `${type} must not be empty`);
    assert.ok(text.length <= limits[type], `${type} exceeds ${limits[type]} characters: ${text}`);
    counts[type] += 1;
  }

  assert.deepEqual(counts, { headline: 15, long_headline: 5, description: 5 });
  assert.ok(rows.some(([type, text]) => type === "headline" && text.length <= 15));
});

test("search themes are unique and remain within the campaign limit", () => {
  const themes = readCsvRows("docs/google-ads/search-themes.csv").map(([theme]) => theme);
  assert.ok(themes.length > 0 && themes.length <= 50);
  assert.equal(new Set(themes.map((theme) => theme.toLowerCase())).size, themes.length);
  assert.ok(themes.every((theme) => theme.length <= 80));
});

test("campaign starts paused and limits products to the launch-ready feed label", () => {
  const settings = Object.fromEntries(readCsvRows("docs/google-ads/campaign-settings.csv"));
  assert.equal(settings.status, "Paused");
  assert.equal(settings.daily_budget_aud, "40.00");
  assert.equal(settings.included_listing_group, "custom_label_3=launch_ready");
  assert.equal(settings.excluded_listing_group, "Everything else");
});

test("sitelinks and callouts fit Google Ads limits and use Internext URLs", () => {
  const sitelinks = readCsvRows("docs/google-ads/sitelinks.csv");
  assert.ok(sitelinks.length >= 4);

  for (const [linkText, descriptionOne, descriptionTwo, finalUrl] of sitelinks) {
    assert.ok(linkText.length > 0 && linkText.length <= 25, `Invalid sitelink text: ${linkText}`);
    assert.ok(descriptionOne.length > 0 && descriptionOne.length <= 35, `Invalid sitelink description: ${descriptionOne}`);
    assert.ok(descriptionTwo.length > 0 && descriptionTwo.length <= 35, `Invalid sitelink description: ${descriptionTwo}`);
    assert.ok(finalUrl.startsWith("https://www.internext.com.au/products"), `Invalid sitelink URL: ${finalUrl}`);
  }

  const callouts = readCsvRows("docs/google-ads/callouts.csv").map(([callout]) => callout);
  assert.ok(callouts.length >= 4);
  assert.ok(callouts.every((callout) => callout.length > 0 && callout.length <= 25));
});

test("campaign images meet Google format, dimension, and file-size requirements", () => {
  const assets = readCsvRows("docs/google-ads/image-assets.csv");
  assert.equal(assets.length, 10);

  for (const [filename, assetType, listedWidth, listedHeight, aiGenerated] of assets) {
    const image = readFileSync(new URL(`../public/google-ads/internext-launch/${filename}`, import.meta.url));
    assert.equal(image.toString("ascii", 1, 4), "PNG", `${filename} must be a PNG`);
    assert.ok(image.length <= 5 * 1024 * 1024, `${filename} exceeds 5 MB`);

    const width = image.readUInt32BE(16);
    const height = image.readUInt32BE(20);
    assert.equal(width, Number(listedWidth), `${filename} width differs from the manifest`);
    assert.equal(height, Number(listedHeight), `${filename} height differs from the manifest`);
    assert.equal(aiGenerated, "Yes", `${filename} must retain its AI disclosure`);

    if (assetType === "Landscape marketing image") {
      assert.ok(width >= 600 && height >= 314);
      assert.ok(Math.abs(width / height - 1.91) <= 0.01, `${filename} is not approximately 1.91:1`);
    } else if (assetType === "Square marketing image") {
      assert.ok(width >= 300 && height >= 300);
      assert.equal(width, height, `${filename} is not square`);
    } else if (assetType === "Portrait marketing image") {
      assert.ok(width >= 480 && height >= 600);
      assert.ok(Math.abs(width / height - 0.8) <= 0.01, `${filename} is not approximately 4:5`);
    } else {
      assert.fail(`Unknown image asset type: ${assetType}`);
    }
  }
});
