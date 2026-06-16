import fs from "node:fs";
import path from "node:path";

const feedPathArgIndex = process.argv.indexOf("--feed");
const feedPath = feedPathArgIndex === -1 ? "public/google-products.xml" : process.argv[feedPathArgIndex + 1] || "public/google-products.xml";
const outputPath = "reports/google-feed-image-audit.json";
const concurrency = 24;
const minLikelyProductImageBytes = 10_000;
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/gif"]);
const localSiteOrigin = "https://www.internext.com.au";

const getLocalImageResult = (item, issues) => {
  try {
    const parsed = new URL(item.image);
    if (parsed.origin !== localSiteOrigin) return null;

    const pathname = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
    const filePath = path.join("public", pathname);
    if (!fs.existsSync(filePath)) return null;

    const buffer = fs.readFileSync(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const contentType = extension === ".png" ? "image/png" : extension === ".gif" ? "image/gif" : "image/jpeg";
    if (!acceptedTypes.has(contentType)) issues.push(`unsupported_content_type:${contentType}`);
    if (buffer.length > 0 && buffer.length < minLikelyProductImageBytes) issues.push("likely_too_small_or_generic");

    return {
      ...item,
      status: 200,
      contentType,
      bytes: buffer.length,
      issues,
      localFile: filePath,
    };
  } catch {
    return null;
  }
};

const decodeXml = (value) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

const feed = fs.readFileSync(feedPath, "utf8");
const items = [...feed.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => {
  const item = match[1];
  const read = (tag) => {
    const tagMatch = item.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
    return tagMatch ? decodeXml(tagMatch[1].trim()) : "";
  };

  return {
    id: read("g:id"),
    title: read("g:title"),
    image: read("g:image_link"),
  };
});

const extensionOk = (url) => {
  try {
    return /\.(jpe?g|png|gif)$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
};

const fetchImage = async (item) => {
  const issues = [];

  if (!extensionOk(item.image)) {
    issues.push("unsupported_extension");
  }

  if (/alloys\.jpg|logo|placeholder|coming|brand-logos|icon-|controls\/bit\.gif/i.test(item.image)) {
    issues.push("generic_url");
  }

  const localResult = getLocalImageResult(item, issues);
  if (localResult) return localResult;

  try {
    const response = await fetch(item.image, {
      method: "GET",
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; InternextImageAudit/1.0)",
        accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });

    const type = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const buffer = Buffer.from(await response.arrayBuffer());
    const size = buffer.length;

    if (!response.ok) issues.push(`http_${response.status}`);
    if (!acceptedTypes.has(type)) issues.push(`unsupported_content_type:${type || "missing"}`);
    if (size > 0 && size < minLikelyProductImageBytes) issues.push("likely_too_small_or_generic");

    return {
      ...item,
      status: response.status,
      contentType: type,
      bytes: size,
      issues,
    };
  } catch (error) {
    return {
      ...item,
      status: 0,
      contentType: "",
      bytes: 0,
      issues: [...issues, "fetch_failed"],
      error: error.message,
    };
  }
};

const results = [];
let nextIndex = 0;

const worker = async () => {
  while (nextIndex < items.length) {
    const index = nextIndex;
    nextIndex += 1;
    results[index] = await fetchImage(items[index]);
    if ((index + 1) % 250 === 0) {
      console.log(`Audited ${index + 1}/${items.length}`);
    }
  }
};

await Promise.all(Array.from({ length: concurrency }, worker));

fs.mkdirSync("reports", { recursive: true });
const summary = results.reduce((acc, result) => {
  for (const issue of result.issues) {
    acc[issue] = (acc[issue] || 0) + 1;
  }
  return acc;
}, {});

fs.writeFileSync(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), count: results.length, summary, results }, null, 2)}\n`);

console.log(`Audited ${results.length} feed images.`);
console.log(JSON.stringify(summary, null, 2));
