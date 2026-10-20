export const CANON_CST_28_COMPATIBILITY_NOTE: string;

export function applyCatalogContentOverride<T extends {
  code?: string;
  supplierCode?: string;
  longDescription?: string;
}>(product: T): T;

export function applyCatalogContentOverrides<T extends {
  code?: string;
  supplierCode?: string;
  longDescription?: string;
}>(products: T[]): T[];
