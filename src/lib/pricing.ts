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
