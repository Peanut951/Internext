import fs from "node:fs";
import path from "node:path";

const formatAud = (value) =>
  `$${Number(value).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const loadPublicPriceFloorMap = (root = process.cwd()) => {
  const filePath = path.join(root, "public", "data", "catalog-public-price-floors.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const floorByKey = new Map();

  for (const entry of Array.isArray(data.prices) ? data.prices : []) {
    const floor = Number(entry.floorIncGst);
    if (!Number.isFinite(floor) || floor <= 0) continue;

    for (const value of [entry.alloysSku, entry.vendorCode]) {
      const key = String(value || "").trim().toUpperCase();
      if (key) floorByKey.set(key, floor);
    }
  }

  return floorByKey;
};

export const getPublicPriceFloor = (product, floorByKey) => {
  for (const value of [product?.code, product?.supplierCode]) {
    const floor = floorByKey.get(String(value || "").trim().toUpperCase());
    if (typeof floor === "number") return floor;
  }

  return null;
};

export const applyPublicPriceFloor = (product, floorByKey) => {
  const floor = getPublicPriceFloor(product, floorByKey);
  const currentPrice = Number(product?.price);
  if (
    floor === null ||
    !Number.isFinite(currentPrice) ||
    currentPrice <= 0 ||
    currentPrice >= floor
  ) {
    return product;
  }

  const currentRrp = Number(product?.rrp);
  const minimumRrp = Math.round(floor * 1.1 * 100) / 100;
  const rrp = Number.isFinite(currentRrp) && currentRrp >= minimumRrp ? currentRrp : minimumRrp;

  return {
    ...product,
    price: floor,
    priceText: `${formatAud(floor)} Inc GST`,
    rrp,
    rrpText: formatAud(rrp),
    publicPriceFloorIncGst: floor,
  };
};
