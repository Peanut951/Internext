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
import { extractProductSpecHighlights } from "@/lib/productSpecs";

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

const getPlainProductName = (product: CatalogProduct) => {
  const description = product.description.trim();
  const manufacturer = product.manufacturer.trim();

  if (!manufacturer) {
    return description;
  }

  const escapedManufacturer = manufacturer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return description.replace(new RegExp(`^${escapedManufacturer}\\s+`, "i"), "").trim();
};

const joinHighlights = (highlights: string[], limit = 3) => {
  const items = highlights.slice(0, limit);
  if (items.length === 0) {
    return "";
  }
  if (items.length === 1) {
    return items[0];
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
};

const buildProductIntro = (product: CatalogProduct, highlights: string[]) => {
  const source = `${product.description} ${product.longDescription || ""}`;
  const plainName = getPlainProductName(product);
  const leadHighlights = joinHighlights(highlights, 3);
  const withHighlights = leadHighlights ? ` Key details include ${leadHighlights}.` : "";

  if (/(intercom|monitor|door station|access control|rfid|sip)/i.test(source)) {
    return `${plainName} is designed for intercom, access, and controlled-entry deployments.${withHighlights}`;
  }
  if (/(printer|scanner|mfp|document)/i.test(source)) {
    return `${plainName} is aimed at document-heavy environments where reliability and throughput matter.${withHighlights}`;
  }
  if (/(router|switch|access point|network|vpn|storage|nas)/i.test(source)) {
    return `${plainName} is positioned for business networking and infrastructure rollouts.${withHighlights}`;
  }
  if (/(display|panel|projector|signage|interactive)/i.test(source)) {
    return `${plainName} is intended for commercial AV and visual communication environments.${withHighlights}`;
  }

  return `${plainName} is designed for professional and commercial deployment.${withHighlights}`;
};

const buildFullDescriptionParagraphs = (product: CatalogProduct, highlights: string[]) => {
  const source = `${product.description} ${product.longDescription || ""}`;
  const plainName = getPlainProductName(product);
  const paragraphs = [buildProductIntro(product, highlights)];
  const detailLead = joinHighlights(highlights, 4) || "the listed product specification";

  if (/(intercom|monitor|door station|access control|rfid|sip)/i.test(source)) {
    paragraphs.push(`${plainName} suits sites that need a practical balance between visitor communication, internal response, and dependable day-to-day operation. It is easiest to position when the customer is comparing indoor monitoring, door interaction, and rollout simplicity around ${detailLead}.`);
  } else if (/(printer|scanner|mfp|document)/i.test(source)) {
    paragraphs.push(`${plainName} is best suited to workplaces comparing output speed, workflow fit, and serviceability. It works well where teams want a dependable option built around ${detailLead}.`);
  } else if (/(router|switch|access point|network|vpn|storage|nas)/i.test(source)) {
    paragraphs.push(`${plainName} fits network and infrastructure projects where capability, rollout clarity, and ongoing reliability are being weighed together. It is easiest to compare when the shortlist is being narrowed by ${detailLead}.`);
  } else if (/(display|panel|projector|signage|interactive)/i.test(source)) {
    paragraphs.push(`${plainName} suits visual communication and presentation projects where screen format, deployment setting, and user experience all matter. It is easiest to position when customers are comparing options around ${detailLead}.`);
  } else {
    paragraphs.push(`${plainName} is best positioned as a practical commercial option where customers are evaluating reliability, deployment fit, and value around ${detailLead}.`);
  }

  if (product.supplierCode) {
    paragraphs.push(`Supplier reference ${product.supplierCode} can be used when cross-checking this item with pricing, stock, or replacement discussions.`);
  }

  return paragraphs;
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
    return extractProductSpecHighlights(product);
  }, [product]);

  const fullDescriptionParagraphs = useMemo(() => {
    if (!product) {
      return [];
    }
    return buildFullDescriptionParagraphs(product, specHighlights);
  }, [product, specHighlights]);

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
            <div className="space-y-6">
              <div className="space-y-6">
                <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-card md:p-6">
                  <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
                    <div>
                      <div className="mb-4 flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-secondary/60">
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
                        <div className="rounded-2xl border border-border/50 bg-secondary/20 p-3">
                          <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                          {galleryImages.map((img) => (
                            <button
                              key={img}
                              type="button"
                              onClick={() => setActiveImage(img)}
                              className={`group aspect-square overflow-hidden rounded-xl border bg-card transition-all ${
                                activeImage === img
                                  ? "border-accent shadow-sm ring-2 ring-accent/15"
                                  : "border-border/60 hover:border-accent/40 hover:bg-background"
                              }`}
                            >
                              <img
                                src={img}
                                alt={product.description}
                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                                loading="lazy"
                                onError={handleProductImageError}
                              />
                            </button>
                          ))}
                          </div>
                        </div>
                      ) : null}

                      {fullDescriptionParagraphs.length > 0 ? (
                        <div className="mt-6 rounded-2xl border border-border/50 bg-background p-5">
                          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-accent">
                            Full Description
                          </h2>
                          <div className="space-y-4">
                            {fullDescriptionParagraphs.map((paragraph, index) => (
                              <p key={`${product.code}-desc-${index}`} className="text-base leading-7 text-muted-foreground">
                                {paragraph}
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex h-full flex-col rounded-2xl border border-border/50 bg-secondary/20 p-5 md:p-6">
                      <div className="mb-5 flex flex-wrap gap-2">
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

                      <h1 className="mb-6 text-3xl font-bold leading-[0.98] text-foreground md:text-4xl xl:text-[2.7rem] xl:leading-[0.94]">
                        {product.description}
                      </h1>

                      <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-card">
                        <p className="mb-2 text-sm text-muted-foreground">Price</p>
                        <p className="mb-2 text-3xl font-bold text-foreground">{displayPrice}</p>
                        {product.rrp ? (
                          <p className="mb-6 text-sm text-muted-foreground">
                            RRP {formatPrice(product.rrp)}
                          </p>
                        ) : (
                          <p className="mb-6 text-sm text-muted-foreground">RRP not listed</p>
                        )}

                        <div className="mb-5">
                          <p className="mb-2 text-sm font-medium text-foreground">Quantity</p>
                          <div className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/35 p-1">
                            <button
                              type="button"
                              onClick={() => setQty((value) => Math.max(1, value - 1))}
                              className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background hover:bg-secondary"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-8 text-center font-semibold">{qty}</span>
                            <button
                              type="button"
                              onClick={() => setQty((value) => value + 1)}
                              className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background hover:bg-secondary"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <Button className="w-full" onClick={addToCart}>
                          {added ? "Added to Cart" : "Add to Cart"}
                        </Button>

                        <Button variant="outline" className="mt-3 w-full" asChild>
                          <Link to="/cart">View Cart</Link>
                        </Button>

                        <Button variant="outline" className="mt-3 w-full" asChild>
                          <Link to="/products">Browse More Products</Link>
                        </Button>

                        <div className="mt-5 rounded-xl border border-border/60 bg-secondary/35 p-4">
                          <p className="text-sm font-semibold text-foreground">Need help choosing?</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Use the product code <span className="font-medium text-foreground">{product.code}</span> when discussing this item with sales or comparing options across your shortlist.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default ProductDetail;
