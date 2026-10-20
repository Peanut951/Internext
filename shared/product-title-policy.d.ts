export type ProductTitleSource = {
  code?: string | null;
  supplierCode?: string | null;
  manufacturer?: string | null;
  name?: string | null;
  description?: string | null;
  longDescription?: string | null;
};

export declare const stripProductTitleHtml: (value: unknown) => string;
export declare const normalizeProductTitleToken: (value: unknown) => string;
export declare const getProductTitleMpn: (product: ProductTitleSource) => string;
export declare const getProductTitleType: (product: ProductTitleSource) => string;
export declare const buildOptimizedProductTitle: (
  product: ProductTitleSource,
  options?: { maxLength?: number },
) => string;
