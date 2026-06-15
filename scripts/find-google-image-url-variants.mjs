import fs from "node:fs";

const audit = JSON.parse(fs.readFileSync("reports/google-feed-image-audit.json", "utf8"));
const bad = audit.results.filter((result) => result.issues.some((issue) => issue.startsWith("http_404")));

const stripVersion = (value) => String(value || "").replace(/[?&]internext_google_image_v=\d+(?:-\d+)?$/, "");

const candidatesFor = (url) => {
  const clean = stripVersion(url);
  const variants = new Set([clean]);
  for (const folder of ["Original", "Large", "Medium"]) {
    variants.add(clean.replace(/\/Images\/ProductImages\/(?:Original|Large|Medium)\//i, `/Images/ProductImages/${folder}/`));
  }
  variants.add(clean.replace(/%20/g, " "));
  variants.add(clean.replace(/ /g, "%20"));
  variants.add(clean.replace(/\.jpg$/i, ".png"));
  variants.add(clean.replace(/\.png$/i, ".jpg"));
  variants.add(clean.replace(/\.jpg$/i, "_1.jpg"));
  variants.add(clean.replace(/\.jpg$/i, "%201.jpg"));
  variants.add(clean.replace(/\.jpg$/i, "%20(1).jpg"));
  variants.add(clean.replace(/\.jpg$/i, "_2.jpg"));
  variants.add(clean.replace(/\.jpg$/i, "%202.jpg"));
  variants.add(clean.replace(/\.jpg$/i, "%20(2).jpg"));
  variants.add(clean.replace(/\.png$/i, "_1.png"));
  variants.add(clean.replace(/\.png$/i, "%201.png"));
  variants.add(clean.replace(/\.png$/i, "%20(1).png"));
  variants.add(clean.replace(/\.png$/i, "_2.png"));
  variants.add(clean.replace(/\.png$/i, "%202.png"));
  variants.add(clean.replace(/\.png$/i, "%20(2).png"));
  return [...variants];
};

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/gif"]);

const test = async (url) => {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; InternextImageRepair/1.0)",
        accept: "image/jpeg,image/png,image/gif,image/*,*/*;q=0.8",
      },
    });
    const type = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!response.ok || !acceptedTypes.has(type)) return null;
    const bytes = Buffer.from(await response.arrayBuffer()).length;
    if (bytes < 10_000) return null;
    return { url, status: response.status, type, bytes };
  } catch {
    return null;
  }
};

const found = [];
const missing = [];

for (const result of bad) {
  let fixed = null;
  for (const candidate of candidatesFor(result.image)) {
    fixed = await test(candidate);
    if (fixed) break;
  }
  if (fixed) {
    found.push({ id: result.id, title: result.title, image: fixed.url, type: fixed.type, bytes: fixed.bytes });
    console.log(`FOUND ${result.id} ${fixed.url}`);
  } else {
    missing.push({ id: result.id, title: result.title, image: result.image });
    console.log(`MISS ${result.id}`);
  }
}

fs.mkdirSync("reports", { recursive: true });
fs.writeFileSync(
  "reports/google-image-url-variant-fixes.json",
  `${JSON.stringify({ generatedAt: new Date().toISOString(), found, missing }, null, 2)}\n`,
);

console.log(JSON.stringify({ found: found.length, missing: missing.length }, null, 2));
