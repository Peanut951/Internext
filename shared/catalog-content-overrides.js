const normalizeKey = (value) => String(value || "").trim().toLowerCase();

const CONTENT_OVERRIDES = [];

const findContentOverride = (product) => {
  const keys = [product?.code, product?.supplierCode].map(normalizeKey).filter(Boolean);
  return CONTENT_OVERRIDES.find((override) => keys.some((key) => override.keys.has(key)));
};

export const applyCatalogContentOverride = (product) => {
  const override = findContentOverride(product);
  if (!override) {
    return product;
  }

  const currentDescription = String(product.longDescription || "").trim();
  const note = override.appendLongDescription;
  if (currentDescription.toLowerCase().includes(note.toLowerCase())) {
    return product;
  }

  return {
    ...product,
    longDescription: [currentDescription, note].filter(Boolean).join("\n\n"),
  };
};

export const applyCatalogContentOverrides = (products) =>
  products.map((product) => applyCatalogContentOverride(product));
