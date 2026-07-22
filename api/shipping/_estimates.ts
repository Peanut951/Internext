type ShippingEstimateProduct = {
  code?: string | null;
  supplierCode?: string | null;
  manufacturer?: string | null;
  name?: string | null;
  description?: string | null;
  longDescription?: string | null;
  weightKg?: number | null;
  heightCm?: number | null;
  widthCm?: number | null;
  depthCm?: number | null;
};

export type ShippingEstimate = {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  estimated: boolean;
};

const MAX_GOOGLE_SHIPPING_DIMENSION_CM = 100;

const getText = (product: ShippingEstimateProduct) =>
  `${product.code || ""} ${product.supplierCode || ""} ${product.manufacturer || ""} ${product.name || ""} ${product.description || ""} ${product.longDescription || ""}`.toLowerCase();

const toPositiveNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const round = (value: number, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const parseWeightKg = (text: string) => {
  const kgMatch = text.match(/(\d+(?:\.\d+)?)\s*kg\b/i);
  if (kgMatch) {
    return toPositiveNumber(kgMatch[1]);
  }

  const gramMatch = text.match(/(\d+(?:\.\d+)?)\s*g(?:ram|rams)?\b/i);
  if (gramMatch) {
    const grams = toPositiveNumber(gramMatch[1]);
    return grams ? round(grams / 1000) : null;
  }

  return null;
};

const parseDimensionsCm = (text: string) => {
  const match = text.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(mm|cm)\b/i);
  if (!match) {
    return null;
  }

  const unit = match[4].toLowerCase();
  const values = [match[1], match[2], match[3]]
    .map((value) => toPositiveNumber(value))
    .filter((value): value is number => Boolean(value))
    .map((value) => (unit === "mm" ? value / 10 : value));

  if (values.length !== 3) {
    return null;
  }

  const sorted = values.sort((a, b) => b - a);
  return {
    lengthCm: round(sorted[0], 1),
    widthCm: round(sorted[1], 1),
    heightCm: round(sorted[2], 1),
  };
};

const isSmallWallControlText = (text: string) =>
  /\b(control\s*panel|indoor\s*monitor|intercom\s*monitor|touch\s*screen\s+android|android\s+based\s+control|sip\s+indoor\s+unit|hypanel|pg71n?|pg71)\b/.test(
    text,
  );

const normalizeProvidedWeightKg = (value: unknown, text: string) => {
  const parsed = toPositiveNumber(value);
  if (parsed === null) {
    return null;
  }

  if (isSmallWallControlText(text) && parsed > 10) {
    return null;
  }

  return parsed;
};

const normalizeProvidedDimensionCm = (value: unknown, text: string) => {
  const parsed = toPositiveNumber(value);
  if (parsed === null) {
    return null;
  }

  if (isSmallWallControlText(text) && parsed > 80) {
    return null;
  }

  return parsed;
};

const estimateByCategory = (product: ShippingEstimateProduct) => {
  const text = getText(product);

  if (/\b(warranty|licen[cs]e|subscription|support|onsite|software|service|renewal)\b/.test(text)) {
    return { weightKg: 0.1, lengthCm: 1, widthCm: 1, heightCm: 1 };
  }

  if (/\b(ink|toner|cartridge|drum|ribbon|printhead)\b/.test(text)) {
    return { weightKg: 0.8, lengthCm: 35, widthCm: 15, heightCm: 15 };
  }

  if (/\b(cable|cord|lead|adapter|remote|mouse|keyboard|bracket|mount|wall\s*mount|stand|desk\s*stand|deskstand|base\s*station\s*stand)\b/.test(text)) {
    return { weightKg: 0.5, lengthCm: 25, widthCm: 18, heightCm: 8 };
  }

  if (/\b(paper|roll|media|film|vinyl|label)\b/.test(text)) {
    return { weightKg: 5, lengthCm: 65, widthCm: 25, heightCm: 25 };
  }

  if (/\b(laptop|notebook|chromebook)\b/.test(text)) {
    return { weightKg: 3, lengthCm: 45, widthCm: 35, heightCm: 12 };
  }

  if (/\b(tablet)\b/.test(text)) {
    return { weightKg: 1.2, lengthCm: 32, widthCm: 24, heightCm: 8 };
  }

  if (isSmallWallControlText(text)) {
    return { weightKg: 1.5, lengthCm: 32, widthCm: 24, heightCm: 8 };
  }

  if (/\b(monitor|display|tv|signage|interactive\s+panel)\b/.test(text)) {
    return { weightKg: 8, lengthCm: 80, widthCm: 55, heightCm: 20 };
  }

  if (/\b(projector|speaker|soundbar|conference)\b/.test(text)) {
    return { weightKg: 5, lengthCm: 45, widthCm: 35, heightCm: 20 };
  }

  if (/\b(printer|multifunction|mfp|copier|scanner|plotter|large format)\b/.test(text)) {
    return { weightKg: 25, lengthCm: 80, widthCm: 60, heightCm: 50 };
  }

  if (/\b(server|workstation|desktop|pc\b|ups|battery)\b/.test(text)) {
    return { weightKg: 12, lengthCm: 60, widthCm: 50, heightCm: 30 };
  }

  if (/\b(camera|nvr|dvr|switch|router|phone|handset|headset|access point|ap\b|intercom)\b/.test(text)) {
    return { weightKg: 2, lengthCm: 30, widthCm: 20, heightCm: 15 };
  }

  return { weightKg: 1, lengthCm: 30, widthCm: 20, heightCm: 10 };
};

export const estimateShippingProfile = (product: ShippingEstimateProduct): ShippingEstimate => {
  const text = getText(product);
  const categoryEstimate = estimateByCategory(product);
  const parsedDimensions = parseDimensionsCm(text);
  const parsedWeight = parseWeightKg(text);
  const providedWeight = normalizeProvidedWeightKg(product.weightKg, text);
  const providedLength = normalizeProvidedDimensionCm(product.depthCm, text);
  const providedWidth = normalizeProvidedDimensionCm(product.widthCm, text);
  const providedHeight = normalizeProvidedDimensionCm(product.heightCm, text);

  const weightKg = providedWeight ?? parsedWeight ?? categoryEstimate.weightKg;
  const lengthCm = providedLength ?? parsedDimensions?.lengthCm ?? categoryEstimate.lengthCm;
  const widthCm = providedWidth ?? parsedDimensions?.widthCm ?? categoryEstimate.widthCm;
  const heightCm = providedHeight ?? parsedDimensions?.heightCm ?? categoryEstimate.heightCm;
  const hasActualWeight = Boolean(providedWeight ?? parsedWeight);
  const hasActualDimensions = Boolean(
    (providedLength && providedWidth && providedHeight) ||
      parsedDimensions,
  );

  return {
    weightKg: Math.max(0.1, round(weightKg)),
    lengthCm: Math.max(1, round(lengthCm, 1)),
    widthCm: Math.max(1, round(widthCm, 1)),
    heightCm: Math.max(1, round(heightCm, 1)),
    estimated: !hasActualWeight || !hasActualDimensions,
  };
};

export const getGoogleShippingWeight = (product: ShippingEstimateProduct) =>
  `${estimateShippingProfile(product).weightKg.toFixed(2)} kg`;

export const getGoogleShippingDimension = (
  product: ShippingEstimateProduct,
  dimension: "lengthCm" | "widthCm" | "heightCm",
) => `${Math.min(estimateShippingProfile(product)[dimension], MAX_GOOGLE_SHIPPING_DIMENSION_CM).toFixed(1)} cm`;
