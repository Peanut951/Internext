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
  };
  stockRecordUpdated: string;
  weightKg: number | null;
  heightCm: number | null;
  widthCm: number | null;
  depthCm: number | null;
};

type LiveCatalogResponse = {
  updatedAt?: string;
  items?: LiveCatalogItem[];
};

let catalogProductsPromise: Promise<CatalogProductWithLive[]> | null = null;

const getProductKeys = (product: Pick<CatalogProductWithLive, "code" | "supplierCode">) =>
  [product.code, product.supplierCode]
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value));

const loadCatalogProductsInternal = async () => {
  const staticResponse = await fetch("/data/catalog-products.json");
  if (!staticResponse.ok) {
    throw new Error("Unable to load product catalog.");
  }

  const staticProducts = normalizeCatalogProducts(
    (await staticResponse.json()) as CatalogProductWithLive[],
  );

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

  return staticProducts
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
        liveUpdatedAt: liveData.updatedAt,
      };
    })
    .filter((product): product is CatalogProductWithLive => Boolean(product));
};

export const loadCatalogProducts = async () => {
  if (!catalogProductsPromise) {
    catalogProductsPromise = loadCatalogProductsInternal().catch((error) => {
      catalogProductsPromise = null;
      throw error;
    });
  }

  return catalogProductsPromise;
};
