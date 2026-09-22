export declare const FOUR_C_CATALOG_MAX_AGE_MS: number;
export declare const isCurrentFourCProduct: (
  product: { supplierSource?: string; supplierCatalogUpdatedAt?: string } | null | undefined,
  now?: number,
) => boolean;
