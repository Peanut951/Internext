import fs from "node:fs";
import path from "node:path";

export const sourcedShippingMeasurementsPath = path.resolve(
  "public/data/catalog-sourced-measurements.json",
);

const normalizeKey = (value) => String(value || "").trim().toLowerCase();
const toPositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const loadSourcedShippingMeasurements = () => {
  try {
    const parsed = JSON.parse(fs.readFileSync(sourcedShippingMeasurementsPath, "utf8"));
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch {
    return [];
  }
};

export const buildSourcedShippingMeasurementMap = (measurements) => {
  const map = new Map();
  for (const measurement of measurements || []) {
    for (const key of [measurement.code, measurement.supplierCode]) {
      const normalized = normalizeKey(key);
      if (normalized) map.set(normalized, measurement);
    }
  }
  return map;
};

export const applySourcedShippingMeasurement = (product, measurementsByKey) => {
  const measurement = [product.code, product.supplierCode]
    .map(normalizeKey)
    .filter(Boolean)
    .map((key) => measurementsByKey.get(key))
    .find(Boolean);

  if (!measurement) return product;

  const current = {
    weightKg: toPositiveNumber(product.weightKg),
    heightCm: toPositiveNumber(product.heightCm),
    widthCm: toPositiveNumber(product.widthCm),
    depthCm: toPositiveNumber(product.depthCm),
  };
  const sourced = {
    weightKg: toPositiveNumber(measurement.weightKg),
    heightCm: toPositiveNumber(measurement.heightCm),
    widthCm: toPositiveNumber(measurement.widthCm),
    depthCm: toPositiveNumber(measurement.depthCm),
  };
  const currentIsComplete = Object.values(current).every((value) => value !== null);
  const sourcedIsComplete = Object.values(sourced).every((value) => value !== null);
  const usedSourcedMeasurement = !currentIsComplete && sourcedIsComplete;

  if (!usedSourcedMeasurement) return product;

  return {
    ...product,
    weightKg: sourced.weightKg,
    heightCm: sourced.heightCm,
    widthCm: sourced.widthCm,
    depthCm: sourced.depthCm,
    measurementSource: measurement.source,
    measurementSourceReference: measurement.sourceReference,
    measurementConfidence: measurement.confidence || "verified",
    measurementUpdatedAt: measurement.updatedAt,
    measurementOverride: false,
  };
};
