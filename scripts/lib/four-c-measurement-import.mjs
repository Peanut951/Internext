import { parseCsvRecords } from "./csv-records.mjs";

const REQUIRED = [
  "SKU", "Package_Weight_Kg", "Package_Height_Cm", "Package_Width_Cm", "Package_Depth_Cm", "Source_Reference",
];
const normalize = (value) => String(value || "").trim();
const positive = (value) => {
  const text = normalize(value);
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) && number > 0 ? number : null;
};

export const mergeFourCMeasurements = (csv, catalog, existingData, now = new Date().toISOString()) => {
  const [headers = [], ...records] = parseCsvRecords(csv.replace(/^\uFEFF/, ""));
  const columns = headers.map(normalize);
  for (const name of REQUIRED) {
    if (!columns.includes(name)) throw new Error(`Missing measurement column ${name}.`);
  }
  if (!records.length) throw new Error("The measurement CSV is empty.");
  const bySku = new Map(catalog.map((product) => [normalize(product.supplierCode).toLowerCase(), product]));
  const updates = new Map();

  for (const [index, record] of records.entries()) {
    const row = Object.fromEntries(columns.map((header, position) => [header, normalize(record[position])]));
    const sku = row.SKU?.toLowerCase();
    const product = bySku.get(sku);
    if (!product || product.supplierSource !== "4cabling") throw new Error(`Row ${index + 2}: unknown 4C SKU ${row.SKU || "(blank)"}.`);
    if (updates.has(product.code.toLowerCase())) throw new Error(`Row ${index + 2}: duplicate SKU ${row.SKU}.`);
    const weightKg = positive(row.Package_Weight_Kg);
    const heightCm = positive(row.Package_Height_Cm);
    const widthCm = positive(row.Package_Width_Cm);
    const depthCm = positive(row.Package_Depth_Cm);
    if (!weightKg || !heightCm || !widthCm || !depthCm) {
      throw new Error(`Row ${index + 2}: complete positive package measurements in the stated units are required.`);
    }
    if (!row.Source_Reference) throw new Error(`Row ${index + 2}: supplier evidence reference is required.`);
    updates.set(product.code.toLowerCase(), {
      code: product.code,
      weightKg,
      heightCm,
      widthCm,
      depthCm,
      source: "4Cabling package measurement export",
      sourceReference: row.Source_Reference,
      confidence: "high",
      updatedAt: now,
    });
  }

  const previous = Array.isArray(existingData?.items) ? existingData.items : [];
  const retained = previous.filter((item) => !updates.has(normalize(item.code).toLowerCase()));
  return { updatedAt: now, items: [...retained, ...updates.values()] };
};
