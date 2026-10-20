const normalizeKey = (value) => String(value || "").trim().toLowerCase();

export const CANON_CST_28_COMPATIBILITY_NOTE =
  "If your customer is still using an older Canon imagePROGRAF iPF64xx-series printer, this replacement basket and stand assembly can replace a damaged or broken original unit.";

const CONTENT_OVERRIDES = [
  {
    keys: new Set(["cst-28", "st-28"]),
    appendLongDescription: CANON_CST_28_COMPATIBILITY_NOTE,
  },
];

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
