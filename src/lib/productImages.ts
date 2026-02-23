import type { SyntheticEvent } from "react";

export const PRODUCT_IMAGE_PLACEHOLDER = "/product-placeholder.svg";

const INVALID_IMAGE_PATTERNS = [/\/controls\/bit\.gif(?:\?.*)?$/i, /\/bit\.gif(?:\?.*)?$/i];

type ProductImageSource = {
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

export const getProductImageCandidates = (product: ProductImageSource) => {
  const candidates = [...(product.imageUrls ?? []), product.imageUrl ?? ""]
    .map((value) => sanitizeProductImageUrl(value))
    .filter((value): value is string => Boolean(value));

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
