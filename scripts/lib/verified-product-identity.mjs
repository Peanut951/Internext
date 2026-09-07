const normalizeKey = (value) => String(value || "").trim().toLowerCase();

export const getVerifiedProductKeys = (product) =>
  [product?.code, product?.supplierCode]
    .map(normalizeKey)
    .filter(Boolean);

const getComparablePrice = (product) =>
  Number(product?.resellerPrice ?? product?.price ?? product?.leaderDealerBuyEx ?? 0);

export const dedupeVerifiedProducts = (products) => {
  const merged = [];
  const indexByKey = new Map();

  for (const product of products || []) {
    const keys = getVerifiedProductKeys(product);
    if (keys.length === 0) continue;

    const existingIndex = keys
      .map((key) => indexByKey.get(key))
      .find((index) => typeof index === "number");
    if (typeof existingIndex !== "number") {
      const nextIndex = merged.length;
      merged.push(product);
      for (const key of keys) indexByKey.set(key, nextIndex);
      continue;
    }

    const current = merged[existingIndex];
    const selected = getComparablePrice(product) > getComparablePrice(current) ? product : current;
    merged[existingIndex] = selected;
    for (const key of [...getVerifiedProductKeys(current), ...keys, ...getVerifiedProductKeys(selected)]) {
      indexByKey.set(key, existingIndex);
    }
  }

  return merged;
};

export const createVerifiedProductIdentityResolver = (verifiedProducts) => {
  const byCode = new Map();
  const byKey = new Map();

  for (const product of verifiedProducts || []) {
    const code = normalizeKey(product?.code);
    if (!code) continue;

    if (!byCode.has(code)) byCode.set(code, product);
    for (const key of getVerifiedProductKeys(product)) {
      if (!byKey.has(key)) byKey.set(key, product);
    }
  }

  return (product) => {
    const code = normalizeKey(product?.code);
    const supplierCode = normalizeKey(product?.supplierCode);
    const verified = byCode.get(code) || byKey.get(supplierCode) || byKey.get(code);
    if (!verified) return null;

    return {
      ...product,
      code: String(verified.code || "").trim(),
      supplierCode: String(verified.supplierCode || verified.code || "").trim(),
      supplierSource: verified.supplierSource || product.supplierSource,
    };
  };
};

export const applyVerifiedProductIdentities = (products, verifiedProducts) => {
  const resolveIdentity = createVerifiedProductIdentityResolver(verifiedProducts);
  return (products || []).map(resolveIdentity).filter(Boolean);
};
