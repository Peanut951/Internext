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

const getHigherResolutionVariants = (url: string) => {
  const variants = [
    url.replace(/\/Images\/ProductImages\/Small\//i, "/Images/ProductImages/Original/"),
    url.replace(/\/Images\/ProductImages\/Small\//i, "/Images/ProductImages/Large/"),
    url.replace(/\/images\/ProductImages\/Small\//i, "/images/ProductImages/Original/"),
    url.replace(/\/images\/ProductImages\/Small\//i, "/images/ProductImages/Large/"),
    url,
  ];

  return Array.from(new Set(variants));
};

const getImageQualityScore = (url: string) => {
  if (/\/ProductImages\/Original\//i.test(url)) {
    return 4;
  }
  if (/\/ProductImages\/Large\//i.test(url)) {
    return 3;
  }
  if (/\/ProductImages\/Medium\//i.test(url)) {
    return 2;
  }
  if (/\/ProductImages\/Small\//i.test(url)) {
    return 1;
  }
  return 2.5;
};

const sortByImageQuality = (images: string[]) =>
  [...images].sort((a, b) => getImageQualityScore(b) - getImageQualityScore(a));

export const getProductImageCandidates = (product: ProductImageSource) => {
  const sanitized = [...(product.imageUrls ?? []), product.imageUrl ?? ""]
    .map((value) => sanitizeProductImageUrl(value))
    .filter((value): value is string => Boolean(value));
  const uniqueImages = Array.from(new Set(sanitized.flatMap((value) => getHigherResolutionVariants(value))));
  const exactMatches = uniqueImages.filter((value) => isExactProductImage(value, product));

  if (exactMatches.length > 0) {
    return sortByImageQuality(exactMatches);
  }

  const primary = sanitizeProductImageUrl(product.imageUrl);
  return primary ? sortByImageQuality(getHigherResolutionVariants(primary)) : uniqueImages.slice(0, 1);
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
