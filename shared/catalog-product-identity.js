const normalizeText = (value) =>
  String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const GENERIC_SUPPLIER_BRANDS = new Set(["", "4cabling", "alloys", "leader", "lxseries"]);

const getMeaningfulBrand = (product) => {
  const brand = normalizeText(product?.manufacturer);
  return GENERIC_SUPPLIER_BRANDS.has(brand) ? "" : brand;
};

const getProductSearchText = (product) =>
  normalizeText([
    product?.manufacturer,
    product?.name,
    product?.description,
    product?.longDescription,
  ].filter(Boolean).join(" "));

const haveCompatibleBrands = (left, right) => {
  const leftBrand = getMeaningfulBrand(left);
  const rightBrand = getMeaningfulBrand(right);

  if (leftBrand && rightBrand) {
    return leftBrand === rightBrand ||
      leftBrand.startsWith(rightBrand) ||
      rightBrand.startsWith(leftBrand);
  }
  if (leftBrand) return getProductSearchText(right).includes(leftBrand);
  if (rightBrand) return getProductSearchText(left).includes(rightBrand);
  return false;
};

const getModelKeys = (product) => {
  const supplierCode = String(product?.supplierCode || product?.code || "").trim();
  if (!supplierCode) return [];

  const isFourC = String(product?.supplierSource || "").toLowerCase() === "4cabling" ||
    String(product?.code || "").toLowerCase().startsWith("4c-");
  const withoutSupplierPrefix = isFourC
    ? supplierCode.replace(/^[a-z0-9]{1,8}[._-]/i, "")
    : supplierCode;
  const direct = normalizeText(supplierCode);
  const unprefixed = normalizeText(withoutSupplierPrefix);
  const knownSupplierAliases = [
    unprefixed === "uswultra42w" ? "uswultra" : "",
    /^usw(?:pro)?max\d+n$/.test(unprefixed) ? unprefixed.replace(/n$/, "") : "",
    /^iv(?:nc|nr)\w+$/.test(unprefixed) ? unprefixed.slice(2) : "",
  ];

  return Array.from(new Set([direct, unprefixed, ...knownSupplierAliases]))
    .filter((key) => key.length >= 5)
    .map((key) => `model:${key}`);
};

const getGtinKeys = (product) =>
  [product?.gtin, product?.ean, product?.upc, product?.barcode]
    .map((value) => String(value || "").replace(/\D/g, ""))
    .filter((value) => value.length >= 8 && value.length <= 14)
    .map((value) => `gtin:${value}`);

export const getCatalogProductIdentityKeys = (product) =>
  Array.from(new Set([...getGtinKeys(product), ...getModelKeys(product)]));

export const areCatalogProductsSameIdentity = (left, right) => {
  const leftSource = normalizeText(left?.supplierSource);
  const rightSource = normalizeText(right?.supplierSource);
  if (!leftSource || !rightSource || leftSource === rightSource) return false;

  const leftKeys = new Set(getCatalogProductIdentityKeys(left));
  const sharedKeys = getCatalogProductIdentityKeys(right).filter((key) => leftKeys.has(key));
  if (sharedKeys.some((key) => key.startsWith("gtin:"))) return true;
  return sharedKeys.some((key) => key.startsWith("model:")) && haveCompatibleBrands(left, right);
};

const getAliases = (product) =>
  [product?.code, product?.supplierCode, ...(Array.isArray(product?.catalogAliases) ? product.catalogAliases : [])]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

export const dedupeCatalogProductsByIdentity = (products, options = {}) => {
  const merged = [];
  const indexesByKey = new Map();
  const selectPreferred = typeof options.selectPreferred === "function"
    ? options.selectPreferred
    : (current) => current;

  for (const product of products || []) {
    const keys = getCatalogProductIdentityKeys(product);
    const candidateIndexes = Array.from(new Set(
      keys.flatMap((key) => Array.from(indexesByKey.get(key) || [])),
    ));
    const existingIndex = candidateIndexes.find((index) =>
      areCatalogProductsSameIdentity(merged[index], product),
    );

    if (typeof existingIndex !== "number") {
      const nextIndex = merged.length;
      merged.push(product);
      for (const key of keys) {
        if (!indexesByKey.has(key)) indexesByKey.set(key, new Set());
        indexesByKey.get(key).add(nextIndex);
      }
      continue;
    }

    const current = merged[existingIndex];
    const selected = selectPreferred(current, product) || current;
    const aliases = Array.from(new Set([...getAliases(current), ...getAliases(product), ...getAliases(selected)]));
    merged[existingIndex] = {
      ...selected,
      catalogAliases: aliases,
    };

    for (const key of new Set([
      ...getCatalogProductIdentityKeys(current),
      ...keys,
      ...getCatalogProductIdentityKeys(selected),
    ])) {
      if (!indexesByKey.has(key)) indexesByKey.set(key, new Set());
      indexesByKey.get(key).add(existingIndex);
    }
  }

  return merged;
};
