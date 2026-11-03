export type CatalogIdentityProduct = {
  code?: string;
  supplierCode?: string;
  supplierSource?: string;
  manufacturer?: string;
  name?: string;
  description?: string;
  longDescription?: string;
  gtin?: string;
  ean?: string;
  upc?: string;
  barcode?: string;
  catalogAliases?: string[];
  [key: string]: unknown;
};

export function getCatalogProductIdentityKeys(product: CatalogIdentityProduct): string[];
export function areCatalogProductsSameIdentity(
  left: CatalogIdentityProduct,
  right: CatalogIdentityProduct,
): boolean;
export function dedupeCatalogProductsByIdentity<T extends CatalogIdentityProduct>(
  products: T[],
  options?: { selectPreferred?: (current: T, next: T) => T },
): T[];
