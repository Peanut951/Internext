import { normalizeCatalogProducts } from "@/lib/catalogQuality";

export type CatalogProductWithLive = {
  code: string;
  manufacturer: string;
  description: string;
  longDescription?: string;
  price: number | null;
  priceText?: string;
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
  liveUpdatedAt?: string;
};

type LiveCatalogItem = {
  code: string;
  supplierCode: string;
  longDescription?: string;
  price: number | null;
  priceText: string;
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

const CATALOG_CACHE_KEY = "internext-live-catalog-products-v3";
const CATALOG_CACHE_MS = 15 * 60 * 1000;

let catalogProductsPromise: Promise<CatalogProductWithLive[]> | null = null;
let catalogProductsRefreshPromise: Promise<CatalogProductWithLive[]> | null = null;
let staticCatalogProductsPromise: Promise<CatalogProductWithLive[]> | null = null;

const stripVolatileProductData = (product: CatalogProductWithLive): CatalogProductWithLive => {
  const {
    availabilityText: _availabilityText,
    etaDate: _etaDate,
    etaStatus: _etaStatus,
    liveCatalogError: _liveCatalogError,
    stockQuantity: _stockQuantity,
    stockByWarehouse: _stockByWarehouse,
    stockRecordUpdated: _stockRecordUpdated,
    liveUpdatedAt: _liveUpdatedAt,
    ...stableProduct
  } = product;

  return stableProduct;
};

const stripVolatileProductsData = (products: CatalogProductWithLive[]) =>
  products.map(stripVolatileProductData);

const getProductKeys = (product: Pick<CatalogProductWithLive, "code" | "supplierCode">) =>
  [product.code, product.supplierCode]
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value));

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
        products: stripVolatileProductsData(products),
      } satisfies CachedCatalogProducts),
    );
  } catch {
    // Storage quota/private mode should not stop the live catalogue from loading.
  }
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
  return [...mergedProducts, ...newProducts];
};

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
          const liveOverridesResponse = await fetch("/data/catalog-live-overrides.json");
          if (!liveOverridesResponse.ok) {
            return products;
          }

          const liveOverrides = (await liveOverridesResponse.json()) as MergedCatalogResponse;
          if (!Array.isArray(liveOverrides.items) || liveOverrides.items.length === 0) {
            return products;
          }

          const updatedAt = liveOverrides.updatedAt || new Date().toISOString();
          return mergeCatalogProductUpdates(
            products,
            stripVolatileProductsData(
              liveOverrides.items.map((item) => ({
                ...item,
                liveUpdatedAt: item.liveUpdatedAt || updatedAt,
              })),
            ),
          );
        } catch {
          return products;
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

const loadCatalogProductsInternal = async (skipCache = false) => {
  const cachedProducts = skipCache ? null : readCachedProducts();
  if (cachedProducts) {
    return cachedProducts;
  }

  try {
    const mergedResponse = await fetch("/api/catalog/live?view=products");
    if (mergedResponse.ok) {
      const mergedData = (await mergedResponse.json()) as MergedCatalogResponse;
      if (Array.isArray(mergedData.items) && mergedData.items.length > 0) {
        const products = normalizeCatalogProducts(mergedData.items);
        writeCachedProducts(products);
        return products;
      }
    }
  } catch {
    // Fall back to the original client-side merge path below.
  }

  const staticProducts = await loadStaticCatalogProducts();

  const liveResponse = await fetch("/api/catalog/live");
  if (!liveResponse.ok) {
    throw new Error("Live Alloys feed is unavailable.");
  }

  const liveData = (await liveResponse.json()) as LiveCatalogResponse;
  if (!Array.isArray(liveData.items) || liveData.items.length === 0) {
    throw new Error("Live Alloys feed returned no products.");
  }

  const liveByKey = new Map<string, LiveCatalogItem>();

  for (const item of liveData.items) {
    for (const key of [item.code, item.supplierCode]) {
      const normalizedKey = key?.trim().toLowerCase();
      if (normalizedKey) {
        liveByKey.set(normalizedKey, item);
      }
    }
  }

  const products = staticProducts
    .map((product) => {
      const live = getProductKeys(product)
        .map((key) => liveByKey.get(key))
        .find(Boolean);

      if (!live) {
        return null;
      }

      return {
        ...product,
        price: live.price,
        priceText: live.priceText,
        resellerPrice: live.resellerPrice,
        resellerPriceText: live.resellerPriceText,
        rrp: live.rrp,
        rrpText: live.rrpText,
        rrpExGst: live.rrpExGst,
        taxRate: live.taxRate,
        supplierCode: product.supplierCode || live.supplierCode,
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
        gtin: product.gtin || live.gtin,
        liveUpdatedAt: liveData.updatedAt,
      };
    })
    .filter((product): product is CatalogProductWithLive => Boolean(product));

  writeCachedProducts(products);
  return products;
};

export const loadCatalogProducts = async (options?: { forceRefresh?: boolean }) => {
  if (options?.forceRefresh) {
    if (!catalogProductsRefreshPromise) {
      catalogProductsRefreshPromise = loadCatalogProductsInternal(true)
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
  onLiveProducts?: (products: CatalogProductWithLive[]) => void,
) => {
  const refreshPromise = loadCatalogProducts({ forceRefresh: true })
    .then((products) => {
      onLiveProducts?.(products);
      return products;
    })
    .catch(() => null);

  const cachedProducts = readCachedProducts();
  if (cachedProducts) {
    return cachedProducts;
  }

  try {
    const staticProducts = await loadStaticCatalogProducts();
    return staticProducts;
  } catch {
    const refreshedProducts = await refreshPromise;
    if (refreshedProducts) {
      return refreshedProducts;
    }

    return loadCatalogProducts();
  }
};
