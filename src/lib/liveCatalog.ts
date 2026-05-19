import { normalizeCatalogProducts } from "@/lib/catalogQuality";

export type CatalogProductWithLive = {
  code: string;
  manufacturer: string;
  description: string;
  longDescription?: string;
  price: number | null;
  priceText?: string;
  rrp?: number | null;
  rrpText?: string;
  imageUrl?: string;
  imageUrls?: string[];
  supplierCode?: string;
  availabilityText?: string;
  stockQuantity?: number;
  stockByWarehouse?: {
    adl: number;
    bne: number;
    mel: number;
    syd: number;
  };
  stockRecordUpdated?: string;
  liveUpdatedAt?: string;
};

type LiveCatalogItem = {
  code: string;
  supplierCode: string;
  price: number | null;
  priceText: string;
  rrp: number | null;
  rrpText: string;
  costExGst: number | null;
  markupRate: number;
  priceExGst: number | null;
  rrpExGst: number | null;
  taxRate: number;
  availabilityText: string;
  stockQuantity: number;
  stockByWarehouse: {
    adl: number;
    bne: number;
    mel: number;
    syd: number;
  };
  stockRecordUpdated: string;
};

type LiveCatalogResponse = {
  updatedAt?: string;
  items?: LiveCatalogItem[];
};

const getProductKeys = (product: Pick<CatalogProductWithLive, "code" | "supplierCode">) =>
  [product.code, product.supplierCode]
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value));

export const loadCatalogProducts = async () => {
  const staticResponse = await fetch("/data/catalog-products.json");
  if (!staticResponse.ok) {
    throw new Error("Unable to load product catalog.");
  }

  const staticProducts = normalizeCatalogProducts(
    (await staticResponse.json()) as CatalogProductWithLive[],
  );

  try {
    const liveResponse = await fetch("/api/catalog/live");
    if (!liveResponse.ok) {
      return staticProducts;
    }

    const liveData = (await liveResponse.json()) as LiveCatalogResponse;
    const liveByKey = new Map<string, LiveCatalogItem>();

    for (const item of liveData.items || []) {
      for (const key of [item.code, item.supplierCode]) {
        const normalizedKey = key?.trim().toLowerCase();
        if (normalizedKey) {
          liveByKey.set(normalizedKey, item);
        }
      }
    }

    return staticProducts.map((product) => {
      const live = getProductKeys(product)
        .map((key) => liveByKey.get(key))
        .find(Boolean);

      if (!live) {
        return product;
      }

      return {
        ...product,
        price: live.price,
        priceText: live.priceText,
        rrp: live.rrp,
        rrpText: live.rrpText,
        costExGst: live.costExGst,
        markupRate: live.markupRate,
        priceExGst: live.priceExGst,
        rrpExGst: live.rrpExGst,
        taxRate: live.taxRate,
        supplierCode: product.supplierCode || live.supplierCode,
        availabilityText: live.availabilityText,
        stockQuantity: live.stockQuantity,
        stockByWarehouse: live.stockByWarehouse,
        stockRecordUpdated: live.stockRecordUpdated,
        liveUpdatedAt: liveData.updatedAt,
      };
    });
  } catch {
    return staticProducts;
  }
};
