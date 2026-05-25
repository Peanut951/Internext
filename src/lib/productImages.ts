import type { SyntheticEvent } from "react";

export const PRODUCT_IMAGE_PLACEHOLDER = "/product-placeholder.svg";

const INVALID_IMAGE_PATTERNS = [/\/controls\/bit\.gif(?:\?.*)?$/i, /\/bit\.gif(?:\?.*)?$/i];

type ProductImageSource = {
  code?: string;
  supplierCode?: string;
  imageUrl?: string;
  imageUrls?: string[];
};

const sanitizeProductImageUrl = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (INVALID_IMAGE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return null;
  }

  try {
    return encodeURI(trimmed);
  } catch {
    return trimmed;
  }
};

const normalizeImageToken = (value?: string | null) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getImageComparableText = (value: string) => {
  try {
    const url = new URL(value);
    return normalizeImageToken(decodeURIComponent(url.pathname));
  } catch {
    return normalizeImageToken(value);
  }
};

const isExactProductImage = (url: string, product: ProductImageSource) => {
  const tokens = [product.code, product.supplierCode]
    .map((value) => normalizeImageToken(value))
    .filter((value) => value.length >= 3);

  if (tokens.length === 0) {
    return false;
  }

  const comparable = getImageComparableText(url);
  return tokens.some((token) => comparable.includes(token));
};

export const getProductImageCandidates = (product: ProductImageSource) => {
  const primary = sanitizeProductImageUrl(product.imageUrl);
  const alternates = (product.imageUrls ?? [])
    .map((value) => sanitizeProductImageUrl(value))
    .filter((value): value is string => Boolean(value))
    .filter((value) => value === primary || isExactProductImage(value, product));

  const candidates = [primary, ...alternates].filter((value): value is string => Boolean(value));

  return Array.from(new Set(candidates));
};

export const getPrimaryProductImage = (product: ProductImageSource) => {
  return getProductImageCandidates(product)[0] ?? PRODUCT_IMAGE_PLACEHOLDER;
};

export const handleProductImageError = (event: SyntheticEvent<HTMLImageElement>) => {
  const image = event.currentTarget;
  if (image.src.endsWith(PRODUCT_IMAGE_PLACEHOLDER)) {
    return;
  }
  image.src = PRODUCT_IMAGE_PLACEHOLDER;
};
