export const formatAud = (value: number | null | undefined) => {
  if (value === null || value === undefined) {
    return null;
  }

  return value.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
};

export const formatCustomerPrice = (value: number | null | undefined, fallback?: string) => {
  const formatted = formatAud(value);
  if (formatted) {
    return `${formatted} Inc GST`;
  }

  return fallback || null;
};

export const formatResellerPrice = (value: number | null | undefined, fallback?: string) => {
  const formatted = formatAud(value);
  if (formatted) {
    return `${formatted} Ex GST`;
  }

  return fallback || null;
};

export const formatStoredPrice = (value: number | null | undefined, fallback?: string) => {
  if (fallback && /\bex\s*gst\b/i.test(fallback)) {
    return formatResellerPrice(value, fallback);
  }

  return formatCustomerPrice(value, fallback);
};

export const formatStoredTotal = (
  value: number | null | undefined,
  items: Array<{ priceText?: string }>,
) => {
  if (items.some((item) => item.priceText && /\bex\s*gst\b/i.test(item.priceText))) {
    return formatResellerPrice(value);
  }

  return formatCustomerPrice(value);
};

export type PriceRole = "customer" | "reseller";

export type PricedProduct = {
  price: number | null;
  priceText?: string;
  resellerPrice?: number | null;
  resellerPriceText?: string;
};

export const getPriceRole = (role?: string | null): PriceRole =>
  role === "reseller" || role === "admin" ? "reseller" : "customer";

export const getDisplayPrice = (product: PricedProduct, role?: string | null) => {
  if (getPriceRole(role) === "reseller") {
    return formatResellerPrice(product.resellerPrice, product.resellerPriceText) ?? "POA";
  }

  return formatCustomerPrice(product.price, product.priceText) ?? "POA";
};

export const getCartPricedProduct = <T extends PricedProduct>(product: T, role?: string | null): T => {
  if (getPriceRole(role) !== "reseller") {
    return product;
  }

  return {
    ...product,
    price: product.resellerPrice ?? null,
    priceText: formatResellerPrice(product.resellerPrice, product.resellerPriceText) ?? product.resellerPriceText,
  };
};
