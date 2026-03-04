type SearchableCatalogProduct = {
  code?: string;
  manufacturer?: string;
  description?: string;
  supplierCode?: string;
};

type IndexedProduct<T extends SearchableCatalogProduct> = {
  product: T;
  code: string;
  description: string;
  manufacturer: string;
  supplierCode: string;
  haystack: string;
};

export type CatalogSearchMatch<T extends SearchableCatalogProduct> = {
  product: T;
  score: number;
};

export const MIN_CATALOG_SEARCH_LENGTH = 2;

export const normalizeCatalogSearchText = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const getTokenScore = <T extends SearchableCatalogProduct>(item: IndexedProduct<T>, token: string) => {
  let score = 0;

  if (item.code === token) score += 120;
  else if (item.code.startsWith(token)) score += 92;
  else if (item.code.includes(token)) score += 64;

  if (item.supplierCode === token) score += 100;
  else if (item.supplierCode.startsWith(token)) score += 76;
  else if (item.supplierCode.includes(token)) score += 52;

  if (item.manufacturer === token) score += 72;
  else if (item.manufacturer.startsWith(token)) score += 38;
  else if (item.manufacturer.includes(token)) score += 24;

  if (item.description.startsWith(token)) score += 56;
  else if (item.description.includes(token)) score += 36;

  if (score === 0 && item.haystack.includes(token)) {
    score = 12;
  }

  return score;
};

export const buildCatalogSearchIndex = <T extends SearchableCatalogProduct>(products: T[]) => {
  return products.map((product) => {
    const code = normalizeCatalogSearchText(product.code || "");
    const description = normalizeCatalogSearchText(product.description || "");
    const manufacturer = normalizeCatalogSearchText(product.manufacturer || "");
    const supplierCode = normalizeCatalogSearchText(product.supplierCode || "");

    return {
      product,
      code,
      description,
      manufacturer,
      supplierCode,
      haystack: [description, code, manufacturer, supplierCode].join(" ").trim(),
    } satisfies IndexedProduct<T>;
  });
};

export const searchCatalogProducts = <T extends SearchableCatalogProduct>(
  products: T[],
  rawQuery: string,
) => {
  const query = normalizeCatalogSearchText(rawQuery);
  if (query.length < MIN_CATALOG_SEARCH_LENGTH) {
    return [] as CatalogSearchMatch<T>[];
  }

  const tokens = query.split(" ").filter(Boolean);
  const indexedProducts = buildCatalogSearchIndex(products);

  return indexedProducts
    .map((item) => {
      const allTokensMatch = tokens.every((token) => item.haystack.includes(token));
      if (!allTokensMatch) {
        return null;
      }

      const score = tokens.reduce((total, token) => total + getTokenScore(item, token), 0);
      return {
        product: item.product,
        score: score + (tokens.length > 1 ? tokens.length * 10 : 0),
      } satisfies CatalogSearchMatch<T>;
    })
    .filter((item): item is CatalogSearchMatch<T> => Boolean(item))
    .sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return String(a.product.description || "").localeCompare(String(b.product.description || ""));
    });
};
