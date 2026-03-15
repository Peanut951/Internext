import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Minus, Plus, ShieldCheck, ShoppingBag, Sparkles } from "lucide-react";
import {
  getProductImageCandidates,
  handleProductImageError,
  PRODUCT_IMAGE_PLACEHOLDER,
} from "@/lib/productImages";
import { getCatalogSummaryText, normalizeCatalogProducts } from "@/lib/catalogQuality";

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

const normalizeHighlight = (value: string) => {
  const cleaned = value.replace(/\s+/g, " ").trim();
  const lower = cleaned.toLowerCase();

  const replacements: Record<string, string> = {
    wifi: "Wi-Fi",
    "wi-fi": "Wi-Fi",
    "wi fi": "Wi-Fi",
    poe: "PoE",
    "poe+": "PoE+",
    "poe++": "PoE++",
    rfid: "RFID",
    sip: "SIP",
    lte: "LTE",
    dect: "DECT",
    ptz: "PTZ",
    uhd: "UHD",
    fhd: "FHD",
    a3: "A3",
    a4: "A4",
    "4k": "4K",
    "5g": "5G",
    hdmi: "HDMI",
    usb: "USB",
  };

  return replacements[lower] || cleaned;
};

const extractSpecHighlights = (product: CatalogProduct) => {
  const source = `${product.description} ${product.longDescription || ""} ${product.code} ${product.supplierCode || ""}`;
  const patterns = [
    /\b\d+(?:\.\d+)?\s?(?:"|inch)\b/gi,
    /\b(?:hd|full hd|fhd|uhd|4k)\b/gi,
    /\b\d+(?:\.\d+)?\s?(?:ppm|dpi|nit|nits|gb|tb|mp|fps|hz|w|va)\b/gi,
    /\b(?:A3|A4|4K|UHD|FHD|Wi-Fi|WiFi|PoE\+\+|PoE\+|PoE|RFID|Bluetooth|Android(?:\s?\d+)?|Linux(?:\sBased)?|Duplex|Touchscreen|SIP|LTE|5G|DECT|PTZ|HDMI|USB)\b/gi,
    /\b\d+\s?(?:port|ports|user|users|channel|channels)\b/gi,
    /\b(?:indoor|outdoor|on-wall|flush mount|surface mount|wall mount|ceiling mount)\b/gi,
    /\b(?:white|black|silver|grey|gray)\b/gi,
    /\b(?:camera|monitor|intercom|router|switch|gateway|access point|speakerphone|headset|projector|display)\b/gi,
    /\b\d+\s?wire\b/gi,
  ];

  const matches = patterns.flatMap((pattern) => source.match(pattern) || []);
  const titlePhrasePatterns = [
    /\b(?:indoor unit|outdoor station|door station|ip phone|video monitor|touch monitor|access point|wall mount|surface mount|flush mount)\b/gi,
    /\b(?:android version|linux based|wifi 6|wifi 6e|gigabit vpn|line interactive|digital signage)\b/gi,
  ];
  const titlePhrases = titlePhrasePatterns.flatMap((pattern) => product.description.match(pattern) || []);

  const cleaned = [...matches, ...titlePhrases]
    .map(normalizeHighlight)
    .filter(Boolean);

  return Array.from(new Set(cleaned)).slice(0, 8);
};

const getFullDescriptionParagraphs = (product: CatalogProduct) => {
  const text = String(product.longDescription || product.description || "").trim();
  if (!text) {
    return [];
  }

  const normalized = text.replace(/\s+/g, " ").trim();
  const sentences = normalized.split(/(?<=[.!?])\s+/).filter(Boolean);
  const paragraphs: string[] = [];

  for (let index = 0; index < sentences.length; index += 2) {
    paragraphs.push(sentences.slice(index, index + 2).join(" "));
  }

  return paragraphs.length > 0 ? paragraphs : [normalized];
};

const inferBestFor = (product: CatalogProduct, highlights: string[]) => {
  const source = `${product.description} ${product.longDescription || ""}`;
  const highlightText = highlights.length > 0 ? `around ${highlights.slice(0, 2).join(" and ")}` : "around the stated product requirements";

  if (/(intercom|access control|door station|rfid|biometric|camera|surveillance|nvr|dvr)/i.test(source)) {
    return "Security, monitoring, and controlled-access environments";
  }
  if (/(printer|scanner|mfp|document|toner|ink)/i.test(source)) {
    return "Office print, scanning, and document workflow environments";
  }
  if (/(router|switch|access point|network|storage|nas|vpn)/i.test(source)) {
    return "Managed network, infrastructure, and business connectivity deployments";
  }
  if (/(headset|conference|voip|sip|speakerphone|webcam)/i.test(source)) {
    return "Business communications and collaboration setups";
  }
  if (/(display|panel|signage|projector|interactive|mount)/i.test(source)) {
    return "Commercial presentation, signage, and AV installations";
  }

  return `Commercial environments evaluating solutions ${highlightText}`;
};

const inferDeploymentNote = (product: CatalogProduct, highlights: string[]) => {
  const source = `${product.description} ${product.longDescription || ""}`;
  const firstHighlight = highlights[0];

  if (/(poe|wired|ethernet)/i.test(source)) {
    return "Designed for straightforward deployment into structured, wired environments.";
  }
  if (/(wireless|wifi|wi-fi|bluetooth|dect)/i.test(source)) {
    return "Useful where flexibility and reduced cabling matter during rollout.";
  }
  if (/(duplex|ppm|scan|document)/i.test(source)) {
    return "Built for repeatable day-to-day document throughput rather than occasional use.";
  }
  if (/(4k|uhd|display|panel|projector)/i.test(source)) {
    return "Best presented with clear visual messaging and room-fit planning.";
  }
  if (firstHighlight) {
    return `Useful where ${firstHighlight} is part of the specification and the rollout needs a practical, low-friction option.`;
  }

  return "Best positioned as a dependable, practical option inside a broader project solution.";
};

const inferCommercialNote = (product: CatalogProduct, highlights: string[]) => {
  const source = `${product.description} ${product.longDescription || ""}`;
  const specLead = highlights.length > 0 ? `with ${highlights.slice(0, 2).join(" and ")}` : "with the listed product specification";

  if (product.price === null) {
    return "Priced on application. Use this where quoting depends on project scope, supply timing, or final configuration.";
  }
  if (/(toner|ink|drum|fuser|consumable|filament)/i.test(source)) {
    return `Visible pricing makes this easy to position as a repeat-purchase line item ${specLead}.`;
  }
  if (/(printer|scanner|mfp|document)/i.test(source)) {
    return `Visible pricing makes this straightforward to compare during shortlist and quote work ${specLead}.`;
  }
  if (/(router|switch|access point|network|vpn|storage|nas)/i.test(source)) {
    return `Commercially, this works best as an infrastructure option when comparing capability and rollout value ${specLead}.`;
  }
  if (/(display|panel|signage|projector|mount)/i.test(source)) {
    return `Commercially, this is easiest to position when the visual spec and install context are being compared side by side ${specLead}.`;
  }

  return `Visible pricing makes this straightforward to position for quoting and fast comparison ${specLead}.`;
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

  const summaryText = useMemo(() => {
    if (!product) {
      return "";
    }
    return getCatalogSummaryText(product);
  }, [product]);

  const fullDescriptionParagraphs = useMemo(() => {
    if (!product) {
      return [];
    }
    return getFullDescriptionParagraphs(product);
  }, [product]);

  const productNotes = useMemo(() => {
    if (!product) {
      return [];
    }

    return [
      {
        title: "Best Fit",
        text: inferBestFor(product, specHighlights),
        icon: ShieldCheck,
      },
      {
        title: "Deployment Note",
        text: inferDeploymentNote(product, specHighlights),
        icon: Sparkles,
      },
      {
        title: "Commercial View",
        text: inferCommercialNote(product, specHighlights),
        icon: ShoppingBag,
      },
    ];
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
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] xl:gap-8">
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
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
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

                    <div className="flex flex-col">
                      <div className="mb-4 flex flex-wrap gap-2">
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

                      <h1 className="mb-4 text-3xl font-bold leading-tight text-foreground md:text-4xl">
                        {product.description}
                      </h1>

                      <p className="mb-6 text-base leading-7 text-muted-foreground">
                        {summaryText || product.description}
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

                      <div className="grid gap-3 lg:grid-cols-3">
                        {productNotes.map((note) => (
                          <div
                            key={note.title}
                            className="rounded-2xl border border-border/60 bg-secondary/40 p-4"
                          >
                            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                              <note.icon className="h-5 w-5" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">{note.title}</p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">{note.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              <aside className="h-fit rounded-2xl border border-border/50 bg-card p-5 shadow-card lg:sticky lg:top-24 md:p-6">
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

                <Button variant="outline" className="w-full mt-3" asChild>
                  <Link to="/cart">View Cart</Link>
                </Button>

                <Button variant="outline" className="w-full mt-3" asChild>
                  <Link to="/products">Browse More Products</Link>
                </Button>

                <div className="mt-5 rounded-xl border border-border/60 bg-secondary/35 p-4">
                  <p className="text-sm font-semibold text-foreground">Need help choosing?</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Use the product code <span className="font-medium text-foreground">{product.code}</span> when discussing this item with sales or comparing options across your shortlist.
                  </p>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default ProductDetail;
