import { normalizeCatalogProducts } from "@/lib/catalogQuality";

export type CatalogProductWithLive = {
  code: string;
  manufacturer: string;
  description: string;
  longDescription?: string;
  price: number | null;
  priceText?: string;
  publicPriceFloor?: number;
  originalPrice?: number | null;
  originalPriceText?: string;
  competitorAdjusted?: boolean;
  competitorPriceObservedAt?: string;
  resellerPrice?: number | null;
  resellerPriceText?: string;
  rrp?: number | null;
  rrpText?: string;
  imageUrl?: string;
  imageUrls?: string[];
  supplierCode?: string;
  gtin?: string;
  ean?: string;
  upc?: string;
  barcode?: string;
  availabilityText?: string;
  etaDate?: string;
  etaStatus?: string;
  liveCatalogError?: string;
  stockQuantity?: number;
  stockByWarehouse?: {
    adl: number;
    bne: number;
    mel: number;
    syd: number;
    wa: number;
    internext?: number;
    adminAdjustment?: number;
    adminLocation?: string;
  };
  stockRecordUpdated?: string;
  weightKg?: number | null;
  heightCm?: number | null;
  widthCm?: number | null;
  depthCm?: number | null;
  measurementSource?: string;
  measurementSourceReference?: string;
  measurementConfidence?: "verified" | "high" | "medium" | "low";
  measurementUpdatedAt?: string;
  measurementOverride?: boolean;
  liveUpdatedAt?: string;
  quoteRequired?: boolean;
};

type LiveCatalogItem = {
  code: string;
  supplierCode: string;
  longDescription?: string;
  price: number | null;
  priceText: string;
  publicPriceFloor?: number;
  originalPrice?: number | null;
  originalPriceText?: string;
  competitorAdjusted?: boolean;
  competitorPriceObservedAt?: string;
  resellerPrice: number | null;
  resellerPriceText: string;
  rrp: number | null;
  rrpText: string;
  rrpExGst: number | null;
  taxRate: number;
  availabilityText: string;
  etaDate: string;
  etaStatus: string;
  stockQuantity: number;
  stockByWarehouse: {
    adl: number;
    bne: number;
    mel: number;
    syd: number;
    wa: number;
    internext?: number;
    adminAdjustment?: number;
    adminLocation?: string;
  };
  stockRecordUpdated: string;
  weightKg: number | null;
  heightCm: number | null;
  widthCm: number | null;
  depthCm: number | null;
  measurementSource?: string;
  measurementSourceReference?: string;
  measurementConfidence?: "verified" | "high" | "medium" | "low";
  measurementUpdatedAt?: string;
  measurementOverride?: boolean;
  gtin: string;
};

type LiveCatalogResponse = {
  updatedAt?: string;
  items?: LiveCatalogItem[];
};

type MergedCatalogResponse = {
  updatedAt?: string;
  items?: CatalogProductWithLive[];
};

type CachedCatalogProducts = {
  cachedAt: number;
  products: CatalogProductWithLive[];
};

type PublicPriceFloorEntry = {
  alloysSku?: string;
  vendorCode?: string;
  floorIncGst?: number;
};

const CATALOG_CACHE_KEY = "internext-live-catalog-products-v7";
const CATALOG_CACHE_MS = 15 * 60 * 1000;

let catalogProductsPromise: Promise<CatalogProductWithLive[]> | null = null;
let catalogProductsRefreshPromise: Promise<CatalogProductWithLive[]> | null = null;
let staticCatalogProductsPromise: Promise<CatalogProductWithLive[]> | null = null;
let publicPriceFloorMapPromise: Promise<Map<string, number>> | null = null;

const formatCustomerAud = (value: number) =>
  `${new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} Inc GST`;

const loadPublicPriceFloorMap = () => {
  if (!publicPriceFloorMapPromise) {
    publicPriceFloorMapPromise = fetch("/data/catalog-public-price-floors.json")
      .then(async (response) => {
        if (!response.ok) return new Map<string, number>();

        const data = (await response.json()) as { prices?: PublicPriceFloorEntry[] };
        const floorByKey = new Map<string, number>();

        for (const entry of Array.isArray(data.prices) ? data.prices : []) {
          const floor = Number(entry.floorIncGst);
          if (!Number.isFinite(floor) || floor <= 0) continue;

          for (const value of [entry.alloysSku, entry.vendorCode]) {
            const key = String(value || "").trim().toLowerCase();
            if (key) floorByKey.set(key, floor);
          }
        }

        return floorByKey;
      })
      .catch(() => new Map<string, number>());
  }

  return publicPriceFloorMapPromise;
};

const applyPublicPriceFloor = (
  product: CatalogProductWithLive,
  floorByKey: Map<string, number>,
): CatalogProductWithLive => {
  const floor = getProductKeys(product)
    .map((key) => floorByKey.get(key))
    .find((value): value is number => typeof value === "number");
  const currentPrice = Number(product.price);

  if (floor === undefined || !Number.isFinite(currentPrice) || currentPrice <= 0) {
    return product;
  }

  if (currentPrice >= floor) {
    return { ...product, publicPriceFloor: floor };
  }

  const currentRrp = Number(product.rrp);
  const minimumRrp = Math.round(floor * 1.1 * 100) / 100;
  const rrp = Number.isFinite(currentRrp) && currentRrp >= minimumRrp
    ? currentRrp
    : minimumRrp;

  return {
    ...product,
    publicPriceFloor: floor,
    price: floor,
    priceText: formatCustomerAud(floor),
    rrp,
    rrpText: new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(rrp),
  };
};

const applyPublicPriceFloors = async (products: CatalogProductWithLive[]) => {
  const floorByKey = await loadPublicPriceFloorMap();
  return products.map((product) => applyPublicPriceFloor(product, floorByKey));
};

const stripCachedEtaData = (product: CatalogProductWithLive): CatalogProductWithLive => {
  const {
    etaDate: _etaDate,
    etaStatus: _etaStatus,
    ...productWithoutCachedEta
  } = product;

  return productWithoutCachedEta;
};

const stripCachedEtaProductsData = (products: CatalogProductWithLive[]) =>
  products.map(stripCachedEtaData);

const getProductKeys = (product: Pick<CatalogProductWithLive, "code" | "supplierCode">) =>
  [product.code, product.supplierCode]
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value));

const requireCurrentQuote = (product: CatalogProductWithLive): CatalogProductWithLive => ({
  ...product,
  price: null,
  priceText: "Contact for pricing",
  resellerPrice: null,
  resellerPriceText: "Contact for pricing",
  availabilityText: "Contact us for current pricing and availability",
  stockQuantity: 0,
  stockByWarehouse: undefined,
  weightKg: typeof product.weightKg === "number" && product.weightKg > 0 ? product.weightKg : null,
  heightCm: typeof product.heightCm === "number" && product.heightCm > 0 ? product.heightCm : null,
  widthCm: typeof product.widthCm === "number" && product.widthCm > 0 ? product.widthCm : null,
  depthCm: typeof product.depthCm === "number" && product.depthCm > 0 ? product.depthCm : null,
  quoteRequired: true,
});

const isDetailedDescription = (value: unknown) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length >= 350 || (text.match(/[.!?]/g) || []).length >= 4;
};

const chooseLongDescription = (preferred: unknown, fallback: unknown) =>
  isDetailedDescription(preferred)
    ? String(preferred).trim()
    : typeof fallback === "string" && fallback.trim()
      ? fallback.trim()
      : typeof preferred === "string"
        ? preferred.trim()
        : undefined;

const readCachedProducts = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const cached = JSON.parse(raw) as CachedCatalogProducts;
    if (
      !cached ||
      !Array.isArray(cached.products) ||
      !Number.isFinite(cached.cachedAt) ||
      Date.now() - cached.cachedAt > CATALOG_CACHE_MS
    ) {
      window.localStorage.removeItem(CATALOG_CACHE_KEY);
      return null;
    }

    return cached.products;
  } catch {
    window.localStorage.removeItem(CATALOG_CACHE_KEY);
    return null;
  }
};

const writeCachedProducts = (products: CatalogProductWithLive[]) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      CATALOG_CACHE_KEY,
      JSON.stringify({
        cachedAt: Date.now(),
        products: stripCachedEtaProductsData(products),
      } satisfies CachedCatalogProducts),
    );
  } catch {
    // Storage quota/private mode should not stop the live catalogue from loading.
  }
};

export const clearCatalogProductsCache = () => {
  catalogProductsPromise = null;
  catalogProductsRefreshPromise = null;

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(CATALOG_CACHE_KEY);
  } catch {
    // Storage access can fail in private mode; a failed cache clear should not break the page.
  }
};

const dedupeCatalogProductsByCode = (products: CatalogProductWithLive[]) => {
  const productsByCode = new Map<string, CatalogProductWithLive>();
  for (const product of products) {
    const code = String(product.code || "").trim().toLowerCase();
    if (code && !productsByCode.has(code)) {
      productsByCode.set(code, product);
    }
  }
  return Array.from(productsByCode.values());
};

export const mergeCatalogProductUpdates = (
  currentProducts: CatalogProductWithLive[],
  updatedProducts: CatalogProductWithLive[],
) => {
  const updatesByKey = new Map<string, CatalogProductWithLive>();
  for (const product of updatedProducts) {
    for (const key of getProductKeys(product)) {
      updatesByKey.set(key, product);
    }
  }

  const appliedUpdates = new Set<CatalogProductWithLive>();
  const mergedProducts = currentProducts.map((product) => {
    const update = getProductKeys(product)
      .map((key) => updatesByKey.get(key))
      .find(Boolean);

    if (!update) {
      return product;
    }

    appliedUpdates.add(update);
    return {
      ...product,
      ...update,
      imageUrl: product.imageUrl || update.imageUrl,
      imageUrls: product.imageUrls?.length ? product.imageUrls : update.imageUrls,
      longDescription: chooseLongDescription(update.longDescription, product.longDescription),
    };
  });

  const newProducts = updatedProducts.filter((product) => !appliedUpdates.has(product));
  return dedupeCatalogProductsByCode([...mergedProducts, ...newProducts]);
};

const reconcileCachedProductsWithVerifiedSnapshot = (
  cachedProducts: CatalogProductWithLive[],
  verifiedProducts: CatalogProductWithLive[],
) => {
  const verifiedKeys = new Set(verifiedProducts.flatMap(getProductKeys));
  const stillActiveCachedProducts = cachedProducts.filter((product) =>
    getProductKeys(product).some((key) => verifiedKeys.has(key)),
  );

  return mergeCatalogProductUpdates(stillActiveCachedProducts, verifiedProducts);
};

export const reconcileCatalogProductSnapshot = (
  currentProducts: CatalogProductWithLive[],
  updatedProducts: CatalogProductWithLive[],
) =>
  mergeCatalogProductUpdates(
    currentProducts.filter((product) => product.quoteRequired),
    updatedProducts,
  );

const loadStaticCatalogProducts = async () => {
  if (!staticCatalogProductsPromise) {
    staticCatalogProductsPromise = (async () => {
      const staticResponse = await fetch("/data/catalog-products.json");
      if (!staticResponse.ok) {
        throw new Error("Unable to load product catalog.");
      }

      const staticProducts = normalizeCatalogProducts(
        (await staticResponse.json()) as CatalogProductWithLive[],
      );

      const applyStaticLiveOverrides = async (products: CatalogProductWithLive[]) => {
        try {
          const [liveOverridesResponse, verifiedQuoteResponse] = await Promise.all([
            fetch("/data/catalog-live-overrides.json"),
            fetch("/data/supplier-quote-products.json"),
          ]);
          if (!liveOverridesResponse.ok) {
            throw new Error("The verified supplier catalogue snapshot is unavailable.");
          }

          const liveOverrides = (await liveOverridesResponse.json()) as MergedCatalogResponse;
          if (!Array.isArray(liveOverrides.items) || liveOverrides.items.length === 0) {
            throw new Error("The verified supplier catalogue snapshot is empty.");
          }

          const updatedAt = liveOverrides.updatedAt || new Date().toISOString();
          const currentLiveKeys = new Set(liveOverrides.items.flatMap(getProductKeys));
          const verifiedQuoteData = verifiedQuoteResponse.ok
            ? ((await verifiedQuoteResponse.json()) as { products?: CatalogProductWithLive[] })
            : { products: [] };
          const verifiedQuoteKeys = new Set(
            (verifiedQuoteData.products || []).flatMap(getProductKeys),
          );
          const currentProducts = products.filter((product) => {
            const keys = getProductKeys(product);
            return keys.some(
              (key) => currentLiveKeys.has(key) || verifiedQuoteKeys.has(key),
            );
          });
          const quoteSafeProducts = currentProducts.map((product) => {
            const keys = getProductKeys(product);
            const hasCurrentSupplierRecord = keys.some((key) => currentLiveKeys.has(key));
            return hasCurrentSupplierRecord ? product : requireCurrentQuote(product);
          });

          return applyPublicPriceFloors(mergeCatalogProductUpdates(
            quoteSafeProducts,
            stripCachedEtaProductsData(
              liveOverrides.items.map((item) => ({
                ...item,
                liveUpdatedAt: item.liveUpdatedAt || updatedAt,
                quoteRequired: false,
              })),
            ),
          ));
        } catch (error) {
          throw error instanceof Error
            ? error
            : new Error("Unable to verify the static product catalogue.");
        }
      };

      try {
        const leaderResponse = await fetch("/data/leader-products.json");
        if (!leaderResponse.ok) {
          return applyStaticLiveOverrides(staticProducts);
        }

        const leaderProducts = normalizeCatalogProducts(
          (await leaderResponse.json()) as CatalogProductWithLive[],
        );
        const existingKeys = new Set(staticProducts.flatMap(getProductKeys));
        const leaderOnlyProducts = leaderProducts.filter((product) =>
          getProductKeys(product).every((key) => !existingKeys.has(key)),
        );
        return applyStaticLiveOverrides([...staticProducts, ...leaderOnlyProducts]);
      } catch {
        return applyStaticLiveOverrides(staticProducts);
      }
    })().catch((error) => {
      staticCatalogProductsPromise = null;
      throw error;
    });
  }

  return staticCatalogProductsPromise;
};

const loadCatalogProductsInternal = async (
  skipCache = false,
  refreshStockOverrides = false,
) => {
  try {
    const refreshSuffix = skipCache
      ? `&refresh=${Date.now()}`
      : refreshStockOverrides
        ? `&stockRefresh=${Date.now()}`
        : "";
    const mergedResponse = await fetch(`/api/catalog/live?view=products${refreshSuffix}`, {
      cache: skipCache || refreshStockOverrides ? "no-store" : "default",
    });
    if (mergedResponse.ok) {
      const mergedData = (await mergedResponse.json()) as MergedCatalogResponse;
      if (Array.isArray(mergedData.items) && mergedData.items.length > 0) {
        const products = await applyPublicPriceFloors(normalizeCatalogProducts(
          mergedData.items.map((item) => ({ ...item, quoteRequired: false })),
        ));
        writeCachedProducts(products);
        return products;
      }
    }
    if (refreshStockOverrides) {
      throw new Error("Unable to refresh admin stock overrides.");
    }
  } catch (error) {
    if (refreshStockOverrides) {
      throw error;
    }
    // Fall back to the original client-side merge path below.
  }

  const staticProducts = await loadStaticCatalogProducts();
  const cachedProducts = skipCache || refreshStockOverrides ? null : readCachedProducts();
  if (cachedProducts) {
    return reconcileCachedProductsWithVerifiedSnapshot(cachedProducts, staticProducts);
  }

  const liveResponse = await fetch(skipCache ? `/api/catalog/live?refresh=${Date.now()}` : "/api/catalog/live", {
    cache: skipCache ? "no-store" : "default",
  });
  if (!liveResponse.ok) {
    throw new Error("Live Alloys feed is unavailable.");
  }

  const liveData = (await liveResponse.json()) as LiveCatalogResponse;
  if (!Array.isArray(liveData.items) || liveData.items.length === 0) {
    throw new Error("Live Alloys feed returned no products.");
  }

  const liveByKey = new Map<string, LiveCatalogItem>();
  const liveByCode = new Map<string, LiveCatalogItem>();

  for (const item of liveData.items) {
    const normalizedCode = item.code?.trim().toLowerCase();
    if (normalizedCode) {
      liveByCode.set(normalizedCode, item);
    }
    for (const key of [item.code, item.supplierCode]) {
      const normalizedKey = key?.trim().toLowerCase();
      if (normalizedKey) {
        liveByKey.set(normalizedKey, item);
      }
    }
  }

  const products = await applyPublicPriceFloors(dedupeCatalogProductsByCode(staticProducts
    .map((product) => {
      const live = liveByCode.get(product.code.trim().toLowerCase()) || getProductKeys(product)
        .map((key) => liveByKey.get(key))
        .find(Boolean);

      if (!live) {
        return product;
      }

      return {
        ...product,
        code: live.code,
        price: live.price,
        priceText: live.priceText,
        resellerPrice: live.resellerPrice,
        resellerPriceText: live.resellerPriceText,
        rrp: live.rrp,
        rrpText: live.rrpText,
        rrpExGst: live.rrpExGst,
        taxRate: live.taxRate,
        supplierCode: live.supplierCode || live.code,
        longDescription: chooseLongDescription(live.longDescription, product.longDescription),
        availabilityText: live.availabilityText,
        etaDate: live.etaDate,
        etaStatus: live.etaStatus,
        stockQuantity: live.stockQuantity,
        stockByWarehouse: live.stockByWarehouse,
        stockRecordUpdated: live.stockRecordUpdated,
        weightKg: live.weightKg,
        heightCm: live.heightCm,
        widthCm: live.widthCm,
        depthCm: live.depthCm,
        measurementSource: live.measurementSource,
        measurementSourceReference: live.measurementSourceReference,
        measurementConfidence: live.measurementConfidence,
        measurementUpdatedAt: live.measurementUpdatedAt,
        measurementOverride: live.measurementOverride,
        gtin: product.gtin || live.gtin,
        liveUpdatedAt: liveData.updatedAt,
        quoteRequired: false,
      };
    })));

  writeCachedProducts(products);
  return products;
};

export const loadCatalogProducts = async (options?: {
  forceRefresh?: boolean;
  refreshStockOverrides?: boolean;
}) => {
  if (options?.forceRefresh || options?.refreshStockOverrides) {
    if (!catalogProductsRefreshPromise) {
      catalogProductsRefreshPromise = loadCatalogProductsInternal(
        Boolean(options.forceRefresh),
        Boolean(options.refreshStockOverrides),
      )
        .then((products) => {
          catalogProductsPromise = Promise.resolve(products);
          return products;
        })
        .catch((error) => {
          catalogProductsPromise = null;
          throw error;
        })
        .finally(() => {
          catalogProductsRefreshPromise = null;
        });
    }

    return catalogProductsRefreshPromise;
  }

  if (!catalogProductsPromise) {
    catalogProductsPromise = loadCatalogProductsInternal().catch((error) => {
      catalogProductsPromise = null;
      throw error;
    });
  }

  return catalogProductsPromise;
};

export const loadCatalogProductsFast = async (
  _onLiveProducts?: (products: CatalogProductWithLive[]) => void,
) => {
  const staticProducts = await loadStaticCatalogProducts();
  const cachedProducts = readCachedProducts();
  if (cachedProducts) {
    return reconcileCachedProductsWithVerifiedSnapshot(cachedProducts, staticProducts);
  }

  return staticProducts;
};
