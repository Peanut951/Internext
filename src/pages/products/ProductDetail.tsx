import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import {
  getProductImageCandidates,
  handleProductImageError,
  PRODUCT_IMAGE_PLACEHOLDER,
} from "@/lib/productImages";
import { normalizeCatalogProducts } from "@/lib/catalogQuality";

type CatalogProduct = {
  code: string;
  manufacturer: string;
  description: string;
  longDescription?: string;
  price: number | null;
  priceText?: string;
  rrp: number | null;
  rrpText?: string;
  imageUrl?: string;
  imageUrls?: string[];
  supplierCode?: string;
};

type CartItem = CatalogProduct & { qty: number };

const formatPrice = (value: number | null | undefined) => {
  if (value === null || value === undefined) {
    return null;
  }
  return value.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
};

const getStoredCart = (): CartItem[] => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem("internext-cart");
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
};

const saveStoredCart = (items: CartItem[]) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem("internext-cart", JSON.stringify(items));
};

const extractSpecHighlights = (product: CatalogProduct) => {
  const source = `${product.description} ${product.longDescription || ""}`;
  const patterns = [
    /\b\d+(?:\.\d+)?\s?(?:"|inch)\b/gi,
    /\b\d+(?:\.\d+)?\s?(?:ppm|dpi|nit|nits|gb|tb|mp|fps|hz|w|va)\b/gi,
    /\b(?:A3|A4|4K|UHD|FHD|Wi-Fi|WiFi|PoE|RFID|Bluetooth|Android|Linux|Duplex|Touchscreen|SIP|LTE|5G)\b/gi,
    /\b\d+\s?(?:port|ports|user|users|channel|channels)\b/gi,
  ];

  const matches = patterns.flatMap((pattern) => source.match(pattern) || []);
  const cleaned = matches
    .map((item) => item.replace(/\s+/g, " ").trim())
    .map((item) => {
      const lower = item.toLowerCase();
      if (lower === "wifi" || lower === "wi-fi") return "Wi-Fi";
      if (lower === "poe") return "PoE";
      if (lower === "rfid") return "RFID";
      if (lower === "sip") return "SIP";
      if (lower === "lte") return "LTE";
      if (lower === "uhd") return "UHD";
      if (lower === "fhd") return "FHD";
      if (lower === "a3") return "A3";
      if (lower === "a4") return "A4";
      if (lower === "4k") return "4K";
      if (lower === "5g") return "5G";
      return item;
    })
    .filter(Boolean);

  return Array.from(new Set(cleaned)).slice(0, 8);
};

const ProductDetail = () => {
  const { code } = useParams();
  const productCode = code || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImage, setActiveImage] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    const loadProduct = async () => {
      try {
        const response = await fetch("/data/catalog-products.json");
        if (!response.ok) {
          throw new Error("Unable to load product data.");
        }
        const data = normalizeCatalogProducts((await response.json()) as CatalogProduct[]);
        const found = data.find((item) => item.code === productCode) || null;
        if (isMounted) {
          setProduct(found);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to load product.");
          setLoading(false);
        }
      }
    };

    loadProduct();
    return () => {
      isMounted = false;
    };
  }, [productCode]);

  const displayPrice = useMemo(() => {
    if (!product) {
      return "";
    }
    return formatPrice(product.price) ?? product.priceText ?? "POA";
  }, [product]);

  const galleryImages = useMemo(() => {
    if (!product) {
      return [];
    }
    const candidates = getProductImageCandidates(product);
    return candidates.length > 0 ? candidates : [PRODUCT_IMAGE_PLACEHOLDER];
  }, [product]);

  const specHighlights = useMemo(() => {
    if (!product) {
      return [];
    }
    return extractSpecHighlights(product);
  }, [product]);

  useEffect(() => {
    setActiveImage(galleryImages[0] || "");
  }, [galleryImages]);

  const addToCart = () => {
    if (!product) {
      return;
    }
    const existing = getStoredCart();
    const match = existing.find((item) => item.code === product.code);
    const updated = match
      ? existing.map((item) =>
          item.code === product.code ? { ...item, qty: item.qty + qty } : item,
        )
      : [...existing, { ...product, qty }];
    saveStoredCart(updated);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  };

  return (
    <Layout>
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="mb-6">
            <Link to="/products" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent">
              <ArrowLeft className="h-4 w-4" />
              Back to Products
            </Link>
          </div>

          {loading && (
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
              Loading product...
            </div>
          )}

          {error && (
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 text-destructive">
              {error}
            </div>
          )}

          {!loading && !error && !product && (
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
              Product not found.
            </div>
          )}

          {!loading && !error && product && (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
              <div className="space-y-6">
                <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50">
                  <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
                    <div>
                      <div className="aspect-square rounded-2xl bg-secondary/60 flex items-center justify-center overflow-hidden mb-4">
                        {activeImage ? (
                          <img
                            src={activeImage}
                            alt={product.description}
                            className="h-full w-full object-contain"
                            loading="eager"
                            onError={handleProductImageError}
                          />
                        ) : (
                          <span className="text-muted-foreground text-sm">No image</span>
                        )}
                      </div>
                      {galleryImages.length > 1 ? (
                        <div className="grid grid-cols-5 gap-2">
                          {galleryImages.map((img) => (
                            <button
                              key={img}
                              type="button"
                              onClick={() => setActiveImage(img)}
                              className={`aspect-square rounded-lg overflow-hidden border bg-card ${
                                activeImage === img ? "border-accent shadow-sm" : "border-border/60"
                              }`}
                            >
                              <img
                                src={img}
                                alt={product.description}
                                className="h-full w-full object-cover"
                                loading="lazy"
                                onError={handleProductImageError}
                              />
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col">
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-semibold tracking-[0.18em] text-accent uppercase">
                          {product.manufacturer || "Unbranded"}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                          Code: {product.code}
                        </span>
                        {product.supplierCode ? (
                          <span className="inline-flex items-center rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                            Ref: {product.supplierCode}
                          </span>
                        ) : null}
                      </div>

                      <h1 className="text-3xl font-bold leading-tight text-foreground mb-4">
                        {product.description}
                      </h1>

                      <p className="text-base leading-7 text-muted-foreground mb-6">
                        {product.longDescription || product.description}
                      </p>

                      {specHighlights.length > 0 ? (
                        <div className="mb-6">
                          <h2 className="text-sm font-semibold tracking-[0.18em] text-accent uppercase mb-3">
                            Spec Highlights
                          </h2>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {specHighlights.map((detail) => (
                              <div
                                key={detail}
                                className="rounded-xl border border-border/60 bg-secondary/55 px-4 py-3 text-sm font-medium text-foreground"
                              >
                                {detail}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <aside className="bg-card rounded-2xl p-6 shadow-card border border-border/50 h-fit lg:sticky lg:top-24">
                <p className="text-sm text-muted-foreground mb-2">Price</p>
                <p className="text-3xl font-bold text-foreground mb-2">{displayPrice}</p>
                {product.rrp ? (
                  <p className="text-sm text-muted-foreground mb-6">
                    RRP {formatPrice(product.rrp)}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mb-6">RRP not listed</p>
                )}

                <div className="mb-5">
                  <p className="text-sm font-medium text-foreground mb-2">Quantity</p>
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQty((value) => Math.max(1, value - 1))}
                      className="h-9 w-9 border border-border rounded-md flex items-center justify-center hover:bg-secondary"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-semibold">{qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty((value) => value + 1)}
                      className="h-9 w-9 border border-border rounded-md flex items-center justify-center hover:bg-secondary"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <Button className="w-full" onClick={addToCart}>
                  {added ? "Added to Cart" : "Add to Cart"}
                </Button>

                <Button variant="outline" className="w-full mt-3" asChild>
                  <Link to="/cart">View Cart</Link>
                </Button>

                <Button variant="outline" className="w-full mt-3" asChild>
                  <Link to="/products">Browse More Products</Link>
                </Button>
              </aside>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default ProductDetail;
