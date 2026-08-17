import { readEnv } from "../checkout/_shared.js";

export type ShippingMeasurementConfidence = "verified" | "high" | "medium" | "low";

export type ShippingMeasurementOverride = {
  code: string;
  supplierCode?: string;
  weightKg: number;
  heightCm: number;
  widthCm: number;
  depthCm: number;
  source: string;
  sourceReference?: string;
  confidence: ShippingMeasurementConfidence;
  note?: string;
  updatedAt?: string;
};

type ProductMeasurementTarget = {
  code: string;
  supplierCode?: string;
  weightKg?: number | null;
  heightCm?: number | null;
  widthCm?: number | null;
  depthCm?: number | null;
  [key: string]: unknown;
};

const TABLE = "catalog_shipping_measurements";
const CONFIDENCE_LEVELS = new Set<ShippingMeasurementConfidence>([
  "verified",
  "high",
  "medium",
  "low",
]);

const getSupabaseRestConfig = () => {
  const supabaseUrl = readEnv("SUPABASE_URL") || readEnv("VITE_SUPABASE_URL");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY") || readEnv("SERVICE_ROLE_SECRET_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return { supabaseUrl: supabaseUrl.replace(/\/$/, ""), serviceRoleKey };
};

const toPositiveNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const normalizeConfidence = (value: unknown): ShippingMeasurementConfidence => {
  const confidence = String(value || "").trim().toLowerCase() as ShippingMeasurementConfidence;
  return CONFIDENCE_LEVELS.has(confidence) ? confidence : "medium";
};

const normalizeRow = (row: Record<string, unknown>): ShippingMeasurementOverride | null => {
  const code = String(row.code || "").trim();
  const weightKg = toPositiveNumber(row.weight_kg);
  const heightCm = toPositiveNumber(row.height_cm);
  const widthCm = toPositiveNumber(row.width_cm);
  const depthCm = toPositiveNumber(row.depth_cm);
  const source = String(row.source || "").trim();
  if (!code || !weightKg || !heightCm || !widthCm || !depthCm || !source) {
    return null;
  }

  return {
    code,
    supplierCode: String(row.supplier_code || "").trim() || undefined,
    weightKg,
    heightCm,
    widthCm,
    depthCm,
    source,
    sourceReference: String(row.source_reference || "").trim() || undefined,
    confidence: normalizeConfidence(row.confidence),
    note: String(row.note || "").trim() || undefined,
    updatedAt: String(row.updated_at || "").trim() || undefined,
  };
};

const getProductKeys = (product: Pick<ProductMeasurementTarget, "code" | "supplierCode">) =>
  [product.code, product.supplierCode]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);

export const fetchShippingMeasurementOverrides = async () => {
  const config = getSupabaseRestConfig();
  if (!config) {
    return [];
  }

  try {
    const response = await fetch(
      `${config.supabaseUrl}/rest/v1/${TABLE}?select=code,supplier_code,weight_kg,height_cm,width_cm,depth_cm,source,source_reference,confidence,note,updated_at`,
      {
        headers: {
          apikey: config.serviceRoleKey,
          Authorization: `Bearer ${config.serviceRoleKey}`,
          Accept: "application/json",
        },
      },
    );
    if (!response.ok) {
      return [];
    }

    const rows = (await response.json()) as Record<string, unknown>[];
    return rows.map(normalizeRow).filter((row): row is ShippingMeasurementOverride => Boolean(row));
  } catch {
    return [];
  }
};

export const buildShippingMeasurementOverrideMap = (overrides: ShippingMeasurementOverride[]) => {
  const map = new Map<string, ShippingMeasurementOverride>();
  for (const override of overrides) {
    for (const key of getProductKeys(override)) {
      map.set(key, override);
    }
  }
  return map;
};

export const getShippingMeasurementOverride = (
  product: Pick<ProductMeasurementTarget, "code" | "supplierCode">,
  overridesByKey: Map<string, ShippingMeasurementOverride>,
) => getProductKeys(product).map((key) => overridesByKey.get(key)).find(Boolean);

export const applyShippingMeasurementOverride = <T extends ProductMeasurementTarget>(
  product: T,
  override?: ShippingMeasurementOverride,
): T => {
  if (!override) {
    return product;
  }

  return {
    ...product,
    weightKg: override.weightKg,
    heightCm: override.heightCm,
    widthCm: override.widthCm,
    depthCm: override.depthCm,
    measurementSource: override.source,
    measurementSourceReference: override.sourceReference,
    measurementConfidence: override.confidence,
    measurementUpdatedAt: override.updatedAt,
    measurementOverride: true,
  };
};

const invalidateError = (status: number, message: string) => ({ ok: false, status, message });

export const upsertShippingMeasurementOverride = async (input: Record<string, unknown>) => {
  const config = getSupabaseRestConfig();
  if (!config) {
    return invalidateError(500, "Supabase service role is not configured.");
  }

  const code = String(input.code || "").trim();
  const source = String(input.source || "").trim();
  const values = {
    weightKg: toPositiveNumber(input.weightKg),
    heightCm: toPositiveNumber(input.heightCm),
    widthCm: toPositiveNumber(input.widthCm),
    depthCm: toPositiveNumber(input.depthCm),
  };

  if (!code) {
    return invalidateError(400, "Product code is required.");
  }
  if (Object.values(values).some((value) => value === null)) {
    return invalidateError(400, "Weight, height, width, and depth must all be positive numbers.");
  }
  if (!source) {
    return invalidateError(400, "A measurement source is required.");
  }

  const sourceReference = String(input.sourceReference || "").trim();
  if (sourceReference && /^https?:\/\//i.test(sourceReference) === false) {
    return invalidateError(400, "The source reference must be an HTTP or HTTPS URL.");
  }

  const row = {
    code,
    supplier_code: String(input.supplierCode || "").trim() || null,
    weight_kg: values.weightKg,
    height_cm: values.heightCm,
    width_cm: values.widthCm,
    depth_cm: values.depthCm,
    source,
    source_reference: sourceReference || null,
    confidence: normalizeConfidence(input.confidence),
    note: String(input.note || "").trim() || null,
    updated_by: String(input.adminEmail || "").trim() || null,
    updated_at: new Date().toISOString(),
  };

  const response = await fetch(`${config.supabaseUrl}/rest/v1/${TABLE}?on_conflict=code`, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    if (/catalog_shipping_measurements|schema cache|PGRST205/i.test(message)) {
      return invalidateError(
        response.status,
        "Shipping measurement storage is not installed in Supabase. Run supabase/catalog-shipping-measurements.sql in the Supabase SQL editor, then try again.",
      );
    }
    return invalidateError(response.status, message || `Measurement save failed with status ${response.status}.`);
  }

  const [saved] = (await response.json().catch(() => [])) as Record<string, unknown>[];
  return { ok: true, status: 200, measurement: normalizeRow(saved || row) };
};

export const deleteShippingMeasurementOverride = async (input: Record<string, unknown>) => {
  const config = getSupabaseRestConfig();
  if (!config) {
    return invalidateError(500, "Supabase service role is not configured.");
  }

  const code = String(input.code || "").trim();
  if (!code) {
    return invalidateError(400, "Product code is required.");
  }

  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/${TABLE}?code=eq.${encodeURIComponent(code)}`,
    {
      method: "DELETE",
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        Prefer: "return=minimal",
      },
    },
  );

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    if (/catalog_shipping_measurements|schema cache|PGRST205/i.test(message)) {
      return invalidateError(
        response.status,
        "Shipping measurement storage is not installed in Supabase. Run supabase/catalog-shipping-measurements.sql in the Supabase SQL editor, then try again.",
      );
    }
    return invalidateError(response.status, message || `Measurement reset failed with status ${response.status}.`);
  }

  return { ok: true, status: 200, message: "Package measurements reset to supplier catalogue data." };
};
