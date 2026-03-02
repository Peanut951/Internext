import fs from 'node:fs';
import path from 'node:path';

const catalogPath = path.resolve('public/data/catalog-products.json');
const statePath = path.resolve('reports/alloys-image-sweep-state.json');
const baseUrl = 'https://www.alloys.com.au';
const sizeRank = { Original: 0, Large: 1, Medium: 2, Small: 3, ThumbNail: 4, Thumbnail: 4 };
const saveEvery = 25;

const args = process.argv.slice(2);
const options = {
  limit: Number.POSITIVE_INFINITY,
  concurrency: 4,
  reset: false,
};

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--limit') {
    options.limit = Number.parseInt(args[index + 1] || '', 10);
    index += 1;
  } else if (arg === '--concurrency') {
    options.concurrency = Number.parseInt(args[index + 1] || '', 10);
    index += 1;
  } else if (arg === '--reset') {
    options.reset = true;
  }
}

if (!Number.isFinite(options.limit) || options.limit <= 0) {
  options.limit = Number.POSITIVE_INFINITY;
}
if (!Number.isFinite(options.concurrency) || options.concurrency <= 0) {
  options.concurrency = 4;
}

const readJson = (filePath, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
};

const writeJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value));
};

const normalizeImageUrl = (value) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `${baseUrl}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractImages = (html) => {
  const matches = [...html.matchAll(/\/Images\/ProductImages\/(Original|Large|Medium|Small|ThumbNail|Thumbnail)\/([^"'<>\s]+)/gi)];
  const bestByFile = new Map();

  for (const match of matches) {
    const size = match[1];
    const file = match[2].replace(/&amp;/g, '&');
    const key = file.toLowerCase();
    const imageUrl = `${baseUrl}/Images/ProductImages/${size}/${file}`;
    const existing = bestByFile.get(key);
    if (!existing || sizeRank[size] < sizeRank[existing.size]) {
      bestByFile.set(key, { size, imageUrl });
    }
  }

  return [...bestByFile.values()].map((entry) => entry.imageUrl);
};

const getSearchPath = (html, manufacturer, code) => {
  const escapedCode = escapeRegex(code);
  const escapedManufacturer = escapeRegex(manufacturer || '');
  if (escapedManufacturer) {
    const direct = new RegExp(
      `href="(?<path>/[^\"]+?SearchID=[^\"]+)"[^>]*>\\s*${escapedManufacturer}\\s*-\\s*${escapedCode}`,
      'i',
    );
    const directMatch = html.match(direct);
    if (directMatch?.groups?.path) {
      return directMatch.groups.path;
    }
  }

  const fallback = new RegExp(
    `href="(?<path>/[^\"]+?SearchID=[^\"]+)"[^>]*>[\\s\\S]{0,320}?${escapedCode}[\\s\\S]{0,320}?</a>`,
    'i',
  );
  const fallbackMatch = html.match(fallback);
  return fallbackMatch?.groups?.path || null;
};

const fetchText = async (url, attempt = 1) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    },
  });

  if (!response.ok) {
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      return fetchText(url, attempt + 1);
    }
    throw new Error(`Fetch failed: ${response.status} ${url}`);
  }

  return response.text();
};

const products = readJson(catalogPath, []);
const existingState = options.reset
  ? { processedCodes: [], updatedCodes: [], lastRunAt: null }
  : readJson(statePath, { processedCodes: [], updatedCodes: [], lastRunAt: null });

const processedSet = new Set(existingState.processedCodes || []);
const updatedSet = new Set(existingState.updatedCodes || []);
const pending = products.filter(
  (product) => !(Array.isArray(product.imageUrls) && product.imageUrls.length > 1) && !processedSet.has(product.code),
);
const targets = pending.slice(0, Math.min(pending.length, options.limit));

let processedThisRun = 0;
let updatedThisRun = 0;
const updatedDetails = [];
const failures = [];

const persist = () => {
  writeJson(catalogPath, products);
  writeJson(statePath, {
    processedCodes: [...processedSet],
    updatedCodes: [...updatedSet],
    lastRunAt: new Date().toISOString(),
    lastRunSummary: {
      processedThisRun,
      updatedThisRun,
      pendingRemaining: products.filter(
        (product) => !(Array.isArray(product.imageUrls) && product.imageUrls.length > 1) && !processedSet.has(product.code),
      ).length,
    },
  });
};

const processProduct = async (product) => {
  try {
    const searchHtml = await fetchText(`${baseUrl}/search?ProductSearch=${encodeURIComponent(product.code)}`);
    const pathMatch = getSearchPath(searchHtml, product.manufacturer || '', product.code);

    if (pathMatch) {
      const productHtml = await fetchText(`${baseUrl}${pathMatch}`);
      const discovered = extractImages(productHtml);
      if (discovered.length > 1) {
        const existing = [product.imageUrl, ...(Array.isArray(product.imageUrls) ? product.imageUrls : [])]
          .map(normalizeImageUrl)
          .filter(Boolean);
        const merged = [...new Set([...discovered, ...existing])];
        const existingCount = new Set(existing).size;

        if (merged.length > existingCount) {
          product.imageUrl = merged[0];
          product.imageUrls = merged;
          updatedThisRun += 1;
          updatedSet.add(product.code);
          updatedDetails.push({ code: product.code, brand: product.manufacturer, count: merged.length });
        }
      }
    }
  } catch (error) {
    failures.push({ code: product.code, brand: product.manufacturer, error: String(error?.message || error) });
  } finally {
    processedThisRun += 1;
    processedSet.add(product.code);
    if (processedThisRun % saveEvery === 0) {
      persist();
      console.log(`checkpoint processed=${processedThisRun} updated=${updatedThisRun}`);
    }
  }
};

let cursor = 0;
const worker = async () => {
  while (cursor < targets.length) {
    const currentIndex = cursor;
    cursor += 1;
    await processProduct(targets[currentIndex]);
  }
};

const workers = Array.from({ length: Math.min(options.concurrency, targets.length || 1) }, () => worker());
await Promise.all(workers);
persist();

const remainingWithoutGallery = products.filter(
  (product) => !(Array.isArray(product.imageUrls) && product.imageUrls.length > 1),
).length;

console.log(
  JSON.stringify(
    {
      targetCount: targets.length,
      processedThisRun,
      updatedThisRun,
      remainingWithoutGallery,
      updatedSample: updatedDetails.slice(0, 120),
      failures: failures.slice(0, 20),
    },
    null,
    2,
  ),
);
