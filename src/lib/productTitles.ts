import {
  buildOptimizedProductTitle,
  getProductTitleMpn,
  type ProductTitleSource,
} from "../../shared/product-title-policy.js";

export const getProductMpnForTitle = (product: ProductTitleSource) =>
  getProductTitleMpn(product);

export const buildProductDisplayTitle = (product: ProductTitleSource) =>
  buildOptimizedProductTitle(product);
