export const FOUR_C_CATALOG_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const isCurrentFourCProduct = (product, now = Date.now()) => {
  if (product?.supplierSource !== "4cabling") return true;
  const updatedAt = Date.parse(String(product.supplierCatalogUpdatedAt || ""));
  return Number.isFinite(updatedAt) && updatedAt <= now && now - updatedAt <= FOUR_C_CATALOG_MAX_AGE_MS;
};
