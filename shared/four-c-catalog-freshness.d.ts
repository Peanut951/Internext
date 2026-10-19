export declare const FOUR_C_CATALOG_MAX_AGE_MS: number;
export declare const isCurrentFourCProduct: (
  product: { supplierSource?: string; supplierCatalogUpdatedAt?: string } | null | undefined,
  now?: number,
) => boolean;
export declare const isVisibleCatalogProduct: (
  product: {
    supplierSource?: string;
    supplierCatalogUpdatedAt?: string;
    quoteRequired?: boolean;
  } | null | undefined,
  now?: number,
) => boolean;
