const EXCLUDED_PRODUCT_KEYS = new Set(["cst-28", "st-28"]);

const normalizeProductKey = (value) => String(value || "").trim().toLowerCase();

export const isCatalogProductExcluded = (product) =>
  [product?.code, product?.supplierCode]
    .map(normalizeProductKey)
    .some((key) => key && EXCLUDED_PRODUCT_KEYS.has(key));

