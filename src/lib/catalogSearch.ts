type SearchableCatalogProduct = {
  code?: string;
  manufacturer?: string;
  name?: string;
  description?: string;
  longDescription?: string;
  supplierCode?: string;
  category?: string;
  subcategory?: string;
  productType?: string;
};

type IndexedProduct<T extends SearchableCatalogProduct> = {
  product: T;
  code: string;
  compactCode: string;
  description: string;
  manufacturer: string;
  name: string;
  supplierCode: string;
  compactSupplierCode: string;
  category: string;
  context: string;
  haystack: string;
  compactHaystack: string;
  words: string[];
};

type QueryConcept = {
  original: string;
  alternatives: string[];
};

export type CatalogSearchMatch<T extends SearchableCatalogProduct> = {
  product: T;
  score: number;
};

export const MIN_CATALOG_SEARCH_LENGTH = 2;

const searchIndexCache = new WeakMap<
  SearchableCatalogProduct[],
  IndexedProduct<SearchableCatalogProduct>[]
>();

const QUERY_FILLER_WORDS = new Set([
  "a",
  "an",
  "and",
  "australia",
  "australian",
  "best",
  "business",
  "buy",
  "for",
  "in",
  "my",
  "of",
  "office",
  "on",
  "professional",
  "the",
  "to",
  "with",
]);

const SYNONYM_GROUPS = [
  ["adapter", "adaptor", "converter"],
  ["battery", "backup", "ups", "uninterruptible"],
  ["cable", "cord", "lead"],
  ["camera", "cctv", "surveillance"],
  ["computer", "desktop", "pc", "workstation"],
  ["conference", "conferencing", "webcam"],
  ["display", "monitor", "screen"],
  ["earbuds", "earphones", "headphones", "headset"],
  ["ethernet", "network", "networking"],
  ["flash", "memory", "ram"],
  ["ink", "inkjet", "cartridge"],
  ["laptop", "notebook"],
  ["mfp", "multifunction", "printer", "printing"],
  ["mount", "bracket", "stand"],
  ["nas", "san", "storage"],
  ["phone", "handset", "telephone", "voip"],
  ["router", "gateway", "modem"],
  ["scanner", "scanning", "digitiser", "digitizer"],
  ["ssd", "solidstate"],
  ["switch", "switches", "switching"],
  ["toner", "cartridge"],
  ["wifi", "wireless", "wlan"],
] as const;

const synonymMap = new Map<string, string[]>();
for (const group of SYNONYM_GROUPS) {
  for (const term of group) {
    synonymMap.set(term, group.filter((candidate) => candidate !== term));
  }
}

export const normalizeCatalogSearchText = (value: string) =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const compactSearchText = (value: string) => normalizeCatalogSearchText(value).replace(/\s+/g, "");

const getSingularVariant = (term: string) => {
  if (term.length > 4 && term.endsWith("ies")) return `${term.slice(0, -3)}y`;
  if (term.length > 4 && /(ches|shes|xes|zes|ses)$/.test(term)) return term.slice(0, -2);
  if (term.length > 3 && term.endsWith("s") && !term.endsWith("ss")) return term.slice(0, -1);
  return "";
};

const getQueryConcepts = (query: string): QueryConcept[] => {
  const rawTokens = query.split(" ").filter(Boolean);
  const meaningfulTokens = rawTokens.filter((token) => !QUERY_FILLER_WORDS.has(token));
  const tokens = meaningfulTokens.length > 0 ? meaningfulTokens : rawTokens;

  return tokens.map((original) => {
    const singular = getSingularVariant(original);
    const fuzzySynonyms = Array.from(synonymMap.keys()).flatMap((knownTerm) => {
      const maximum = getAllowedEditDistance(original);
      if (maximum === 0 || getEditDistance(original, knownTerm, maximum) > maximum) return [];
      return [knownTerm, ...(synonymMap.get(knownTerm) || [])];
    });
    const synonyms = [
      ...(synonymMap.get(original) || []),
      ...(singular ? synonymMap.get(singular) || [] : []),
      ...fuzzySynonyms,
    ];

    return {
      original,
      alternatives: Array.from(new Set([original, singular, ...synonyms].filter(Boolean))),
    };
  });
};

const getEditDistance = (left: string, right: string, maximum: number) => {
  if (left === right) return 0;
  if (Math.abs(left.length - right.length) > maximum) return maximum + 1;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    let rowMinimum = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      const distance = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
      current.push(distance);
      rowMinimum = Math.min(rowMinimum, distance);
    }

    if (rowMinimum > maximum) return maximum + 1;
    previous = current;
  }

  return previous[right.length];
};

const getAllowedEditDistance = (term: string) => {
  if (term.length < 4) return 0;
  if (/\d/.test(term)) return 1;
  return term.length >= 8 ? 2 : 1;
};

const getFuzzyWordScore = <T extends SearchableCatalogProduct>(
  item: IndexedProduct<T>,
  term: string,
) => {
  const maximum = getAllowedEditDistance(term);
  if (maximum === 0) return 0;

  let closest = maximum + 1;
  for (const word of item.words) {
    if (Math.abs(word.length - term.length) > maximum) continue;
    closest = Math.min(closest, getEditDistance(term, word, maximum));
    if (closest === 1) break;
  }

  if (closest > maximum) return 0;
  return closest === 1 ? 18 : 10;
};

const includesTerm = (text: string, term: string) =>
  term.length >= 4
    ? text.includes(term)
    : ` ${text} `.includes(` ${term} `);

const startsWithTerm = (text: string, term: string) =>
  text === term || text.startsWith(`${term} `) || (term.length >= 4 && text.startsWith(term));

const getTermScore = <T extends SearchableCatalogProduct>(
  item: IndexedProduct<T>,
  term: string,
  allowFuzzy = false,
) => {
  let score = 0;
  const compactTerm = term.replace(/\s+/g, "");

  if (item.code === term || item.compactCode === compactTerm) score += 140;
  else if (item.code.startsWith(term) || item.compactCode.startsWith(compactTerm)) score += 104;
  else if (item.code.includes(term) || item.compactCode.includes(compactTerm)) score += 72;

  if (item.supplierCode === term || item.compactSupplierCode === compactTerm) score += 120;
  else if (item.supplierCode.startsWith(term) || item.compactSupplierCode.startsWith(compactTerm)) score += 88;
  else if (item.supplierCode.includes(term) || item.compactSupplierCode.includes(compactTerm)) score += 60;

  if (item.manufacturer === term) score += 78;
  else if (startsWithTerm(item.manufacturer, term)) score += 44;
  else if (includesTerm(item.manufacturer, term)) score += 28;

  if (startsWithTerm(item.name, term)) score += 62;
  else if (includesTerm(item.name, term)) score += 42;

  if (startsWithTerm(item.description, term)) score += 58;
  else if (includesTerm(item.description, term)) score += 38;

  if (includesTerm(item.category, term)) score += 28;
  if (includesTerm(item.context, term)) score += 10;

  if (score === 0 && includesTerm(item.haystack, term)) score = 14;
  if (score === 0 && compactTerm.length >= 4 && item.compactHaystack.includes(compactTerm)) score = 12;
  if (score === 0 && allowFuzzy) score = getFuzzyWordScore(item, term);

  return score;
};

const getConceptScore = <T extends SearchableCatalogProduct>(
  item: IndexedProduct<T>,
  concept: QueryConcept,
  allowFuzzy: boolean,
) => {
  const originalScore = getTermScore(item, concept.original, allowFuzzy);
  const synonymScore = concept.alternatives
    .filter((alternative) => alternative !== concept.original)
    .reduce(
      (best, alternative) => Math.max(best, Math.round(getTermScore(item, alternative) * 0.35)),
      0,
    );

  return Math.max(originalScore > 0 ? originalScore + 16 : 0, synonymScore);
};

export const buildCatalogSearchIndex = <T extends SearchableCatalogProduct>(products: T[]) => {
  const cached = searchIndexCache.get(products as SearchableCatalogProduct[]);
  if (cached) return cached as IndexedProduct<T>[];

  const index = products.map((product) => {
    const code = normalizeCatalogSearchText(product.code || "");
    const description = normalizeCatalogSearchText(product.description || "");
    const manufacturer = normalizeCatalogSearchText(product.manufacturer || "");
    const name = normalizeCatalogSearchText(product.name || "");
    const supplierCode = normalizeCatalogSearchText(product.supplierCode || "");
    const category = normalizeCatalogSearchText(
      [product.category, product.subcategory, product.productType].filter(Boolean).join(" "),
    );
    const context = normalizeCatalogSearchText(String(product.longDescription || "").slice(0, 320));
    const haystack = [description, name, code, manufacturer, supplierCode, category, context].join(" ").trim();
    const words = Array.from(new Set(
      haystack
        .split(" ")
        .flatMap((word) => [word, getSingularVariant(word)])
        .filter((word) => word.length >= 2),
    ));

    return {
      product,
      code,
      compactCode: compactSearchText(product.code || ""),
      description,
      manufacturer,
      name,
      supplierCode,
      compactSupplierCode: compactSearchText(product.supplierCode || ""),
      category,
      context,
      haystack,
      compactHaystack: haystack.replace(/\s+/g, ""),
      words,
    } satisfies IndexedProduct<T>;
  });

  searchIndexCache.set(
    products as SearchableCatalogProduct[],
    index as IndexedProduct<SearchableCatalogProduct>[],
  );
  return index;
};

export const searchCatalogProducts = <T extends SearchableCatalogProduct>(
  products: T[],
  rawQuery: string,
) => {
  const query = normalizeCatalogSearchText(rawQuery);
  if (query.length < MIN_CATALOG_SEARCH_LENGTH) return [] as CatalogSearchMatch<T>[];

  const concepts = getQueryConcepts(query);
  const compactQuery = query.replace(/\s+/g, "");
  const indexedProducts = buildCatalogSearchIndex(products);

  const collectMatches = (allowFuzzy: boolean) => indexedProducts
    .map((item) => {
      const exactCode = item.compactCode === compactQuery || item.compactSupplierCode === compactQuery;
      const codePhraseMatch = compactQuery.length >= 3 && (
        item.compactCode.includes(compactQuery) || item.compactSupplierCode.includes(compactQuery)
      );
      const conceptScores = concepts.map((concept) => getConceptScore(item, concept, allowFuzzy));
      const matchedConcepts = conceptScores.filter((score) => score > 0).length;
      const requiredMatches = concepts.length <= 2
        ? concepts.length
        : Math.ceil(concepts.length * 0.67);

      if (!exactCode && !codePhraseMatch && matchedConcepts < requiredMatches) return null;

      const phraseScore = item.description.includes(query) || item.name.includes(query)
        ? 75
        : item.haystack.includes(query)
          ? 40
          : 0;
      const missingConcepts = concepts.length - matchedConcepts;
      const score = conceptScores.reduce((total, value) => total + value, 0)
        + phraseScore
        + (exactCode ? 300 : codePhraseMatch ? 150 : 0)
        + matchedConcepts * 12
        - missingConcepts * 30;

      return { product: item.product, score } satisfies CatalogSearchMatch<T>;
    })
    .filter((item): item is CatalogSearchMatch<T> => Boolean(item));

  const sortMatches = (matches: CatalogSearchMatch<T>[]) => matches.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return String(a.product.description || "").localeCompare(String(b.product.description || ""));
    });

  const directMatches = sortMatches(collectMatches(false));
  if (directMatches.length >= 8 || (directMatches[0]?.score || 0) >= 400) return directMatches;

  return sortMatches(collectMatches(true));
};
