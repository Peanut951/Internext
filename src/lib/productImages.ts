import type { SyntheticEvent } from "react";

export const PRODUCT_IMAGE_PLACEHOLDER = "/product-placeholder.png";

const INVALID_IMAGE_PATTERNS = [/\/controls\/bit\.gif(?:\?.*)?$/i, /\/bit\.gif(?:\?.*)?$/i];
const SUPPORTED_IMAGE_EXTENSION_PATTERN = /\.(jpe?g|png|gif)$/i;

type ProductImageSource = {
  code?: string;
  supplierCode?: string;
  description?: string;
  longDescription?: string;
  manufacturer?: string;
  imageUrl?: string;
  imageUrls?: string[];
};

export const isDigitalProduct = (product: ProductImageSource) => {
  const text = `${product.manufacturer || ""} ${product.description || ""} ${product.longDescription || ""}`.toLowerCase();

  return /\b(warranty|licen[cs]e|subscription|software|support|onsite|install(?:ation|ations)?|instal|service|renewal|postscript|pdf\s+upgrade)\b/.test(text);
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
  const qualityVariants = [
    url.replace(/\/Images\/ProductImages\/Small\//i, "/Images/ProductImages/Original/"),
    url.replace(/\/Images\/ProductImages\/Small\//i, "/Images/ProductImages/Large/"),
    url.replace(/\/images\/ProductImages\/Small\//i, "/images/ProductImages/Original/"),
    url.replace(/\/images\/ProductImages\/Small\//i, "/images/ProductImages/Large/"),
    url,
  ];

  const variants = qualityVariants.flatMap((variant) => {
    try {
      const parsed = new URL(variant, window.location.origin);
      if (SUPPORTED_IMAGE_EXTENSION_PATTERN.test(parsed.pathname)) {
        return [variant];
      }

      return [".jpg", ".png", ".gif"].map((extension) => {
        const next = new URL(parsed.href);
        next.pathname = /\.[a-z0-9]+$/i.test(next.pathname)
          ? next.pathname.replace(/\.[a-z0-9]+$/i, extension)
          : `${next.pathname.replace(/\/$/, "")}${extension}`;
        return next.href;
      });
    } catch {
      return SUPPORTED_IMAGE_EXTENSION_PATTERN.test(variant.split("?")[0]) ? [variant] : [];
    }
  });

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
  if (isDigitalProduct(product)) {
    return [];
  }

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

export const getOptionalProductImage = (product: ProductImageSource) => {
  return getProductImageCandidates(product)[0] ?? null;
};

export const getPrimaryProductImage = (product: ProductImageSource) => {
  return getOptionalProductImage(product) ?? PRODUCT_IMAGE_PLACEHOLDER;
};

export const handleProductImageError = (event: SyntheticEvent<HTMLImageElement>) => {
  const image = event.currentTarget;
  if (image.src.endsWith(PRODUCT_IMAGE_PLACEHOLDER)) {
    return;
  }
  image.src = PRODUCT_IMAGE_PLACEHOLDER;
};
