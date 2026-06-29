import { type SyntheticEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Headphones, Minus, Plus, ShieldCheck, Truck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getProductImageCandidates,
  handleProductImageError,
  PRODUCT_IMAGE_PLACEHOLDER,
} from "@/lib/productImages";
import { loadCatalogProductsFast } from "@/lib/liveCatalog";
import { extractProductSpecHighlights } from "@/lib/productSpecs";
import { useAuthSession } from "@/hooks/use-auth-session";
import { formatAud, getCartPricedProduct, getDisplayPrice } from "@/lib/pricing";
import { trackAddToCart } from "@/lib/analytics";
import { getCartItems, saveCartItems, toCartProduct, type CartItem } from "@/lib/orderManagement";
import { useToast } from "@/hooks/use-toast";

type CatalogProduct = {
  code: string;
  manufacturer: string;
  description: string;
  longDescription?: string;
  price: number | null;
  priceText?: string;
  resellerPrice?: number | null;
  resellerPriceText?: string;
  rrp: number | null;
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
  };
  stockRecordUpdated?: string;
  weightKg?: number | null;
  heightCm?: number | null;
  widthCm?: number | null;
  depthCm?: number | null;
  liveUpdatedAt?: string;
};

const SITE_URL = "https://www.internext.com.au";
const DEFAULT_PUBLIC_SHIPPING_PRICE = 35;

const isProductInStoredCart = (productCode: string) =>
  getCartItems().some((item) => item.code === productCode);

const safeText = (value: unknown) => {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
};

const splitSupplierDescriptionParagraphs = (value: unknown) =>
  safeText(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/\u00a0/g, " ")
    .split(/\n{2,}|\r?\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter((paragraph) => paragraph.length > 0);

const getPlainProductName = (product: CatalogProduct) => {
  const description = safeText(product.description) || safeText(product.code) || "Product";
  const manufacturer = safeText(product.manufacturer);

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
  const source = `${safeText(product.description)} ${safeText(product.longDescription)}`;
  const plainName = getPlainProductName(product);
  const leadHighlights = joinHighlights(highlights, 3);
  const withHighlights = leadHighlights ? ` Notable details include ${leadHighlights}.` : "";

  if (/(intercom|monitor|door station|access control|rfid|sip)/i.test(source)) {
    return `${plainName} is suited to intercom, access, and controlled-entry environments where clear communication and dependable day-to-day use matter.${withHighlights}`;
  }
  if (/(printer|scanner|mfp|document)/i.test(source)) {
    return `${plainName} is a practical fit for document-heavy environments where reliability, workflow fit, and throughput are important.${withHighlights}`;
  }
  if (/(router|switch|access point|network|vpn|storage|nas)/i.test(source)) {
    return `${plainName} is aimed at business networking and infrastructure rollouts where stable performance and straightforward deployment matter.${withHighlights}`;
  }
  if (/(display|panel|projector|signage|interactive)/i.test(source)) {
    return `${plainName} is well suited to commercial AV and visual communication spaces where screen performance and deployment context both matter.${withHighlights}`;
  }

  return `${plainName} is positioned as a practical option for professional and commercial deployment.${withHighlights}`;
};

const buildFullDescriptionParagraphs = (product: CatalogProduct, highlights: string[]) => {
  const supplierParagraphs = splitSupplierDescriptionParagraphs(product.longDescription);
  if (supplierParagraphs.length > 0) {
    return supplierParagraphs;
  }

  const source = `${safeText(product.description)} ${safeText(product.longDescription)}`;
  const plainName = getPlainProductName(product);
  const paragraphs = [buildProductIntro(product, highlights)];
  const detailLead = joinHighlights(highlights, 4) || "the listed product specification";

  if (/(intercom|monitor|door station|access control|rfid|sip)/i.test(source)) {
    paragraphs.push(`It suits sites that need a practical balance between visitor communication, internal response, and dependable day-to-day operation. It is easiest to position when the customer is comparing indoor monitoring, door interaction, and rollout simplicity around ${detailLead}.`);
  } else if (/(printer|scanner|mfp|document)/i.test(source)) {
    paragraphs.push(`It is best suited to workplaces comparing output speed, workflow fit, and serviceability. It works well where teams want a dependable option built around ${detailLead}.`);
  } else if (/(router|switch|access point|network|vpn|storage|nas)/i.test(source)) {
    paragraphs.push(`It fits network and infrastructure projects where capability, rollout clarity, and ongoing reliability are being weighed together. It is easiest to compare when the shortlist is being narrowed by ${detailLead}.`);
  } else if (/(display|panel|projector|signage|interactive)/i.test(source)) {
    paragraphs.push(`It suits visual communication and presentation projects where screen format, deployment setting, and user experience all matter. It is easiest to position when customers are comparing options around ${detailLead}.`);
  } else {
    paragraphs.push(`It is best positioned as a practical commercial option where customers are evaluating reliability, deployment fit, and value around ${detailLead}.`);
  }

  return paragraphs;
};

const formatMeasurement = (value: number | null | undefined, unit: string) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  return `${value.toLocaleString("en-AU", { maximumFractionDigits: 2 })}${unit}`;
};

const getMeasurementRows = (product: CatalogProduct) => [
  { label: "Weight", value: formatMeasurement(product.weightKg, "kg") },
  { label: "Height", value: formatMeasurement(product.heightCm, "cm") },
  { label: "Width", value: formatMeasurement(product.widthCm, "cm") },
  { label: "Depth", value: formatMeasurement(product.depthCm, "cm") },
].filter((row): row is { label: string; value: string } => Boolean(row.value));

const getAvailabilityRows = (product: CatalogProduct) => {
  const availabilityText = safeText(product.availabilityText);
  const etaDate = safeText(product.etaDate);
  const etaStatus = safeText(product.etaStatus);
  const rows = [
    availabilityText
      ? { label: "Status", value: availabilityText }
      : null,
    typeof product.stockQuantity === "number"
      ? { label: "Total Available", value: product.stockQuantity.toLocaleString("en-AU") }
      : null,
    product.stockByWarehouse && product.stockByWarehouse.adl > 0
      ? { label: "Adelaide Warehouse", value: product.stockByWarehouse.adl.toLocaleString("en-AU") }
      : null,
    product.stockByWarehouse && product.stockByWarehouse.bne > 0
      ? { label: "Brisbane Warehouse", value: product.stockByWarehouse.bne.toLocaleString("en-AU") }
      : null,
    product.stockByWarehouse && product.stockByWarehouse.mel > 0
      ? { label: "Melbourne Warehouse", value: product.stockByWarehouse.mel.toLocaleString("en-AU") }
      : null,
    product.stockByWarehouse && product.stockByWarehouse.syd > 0
      ? { label: "Sydney Warehouse", value: product.stockByWarehouse.syd.toLocaleString("en-AU") }
      : null,
    etaDate
      ? { label: "Next ETA", value: etaDate }
      : null,
    etaStatus && etaStatus !== availabilityText && etaStatus !== etaDate
      ? { label: "ETA Status", value: etaStatus }
      : null,
  ];

  return rows.filter((row): row is { label: string; value: string } => Boolean(row));
};

const getStockSummary = (product: CatalogProduct) => {
  const etaDate = safeText(product.etaDate);
  const etaStatus = safeText(product.etaStatus);
  if (typeof product.stockQuantity === "number") {
    if (product.stockQuantity > 0) {
      return `${product.stockQuantity.toLocaleString("en-AU")} available across warehouse stock`;
    }

    if (etaDate) {
      return `Currently out of stock. Next ETA ${etaDate}`;
    }

    if (etaStatus && !/^(check availability|in stock)$/i.test(etaStatus)) {
      return `Currently out of stock. ${etaStatus}`;
    }

    return "Currently out of stock. Call 1300 U R NEXT (1300 87 6398) for ETA";
  }

  return safeText(product.availabilityText) || "Live availability checked before checkout";
};

const getDeliverySummary = (product: CatalogProduct) => {
  if (typeof product.stockQuantity === "number" && product.stockQuantity <= 0) {
    const etaDate = safeText(product.etaDate);
    return etaDate ? `Backorder available from ${etaDate}` : "Delivery timing confirmed once ETA is available";
  }

  return "Shipping calculated at checkout from product dimensions and delivery postcode";
};

const getSchemaAvailability = (product: CatalogProduct) => {
  if (/available to order|in stock/i.test(safeText(product.availabilityText))) {
    return "https://schema.org/InStock";
  }

  return typeof product.stockQuantity === "number" && product.stockQuantity > 0
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";
};

const toAbsoluteUrl = (value: string) => {
  try {
    return new URL(value, SITE_URL).href;
  } catch {
    return "";
  }
};

const truncateText = (value: unknown, maxLength: number) => {
  const text = safeText(value);
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}...` : text;
};

const normalizeToken = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const normalizeGtin = (value: unknown) => {
  const digits = String(value || "").replace(/\D/g, "");
  return /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(digits) ? digits : "";
};

const getProductGtin = (product: CatalogProduct) =>
  normalizeGtin(product.gtin) || normalizeGtin(product.ean) || normalizeGtin(product.upc) || normalizeGtin(product.barcode);

const getProductMpn = (product: CatalogProduct) => {
  const supplierCode = safeText(product.supplierCode);
  const code = safeText(product.code);

  if (supplierCode.length >= 3 && normalizeToken(supplierCode) !== normalizeToken(code)) {
    return supplierCode;
  }

  return code;
};

const getSeoProductType = (product: CatalogProduct) => {
  const text = `${safeText(product.manufacturer)} ${safeText(product.description)} ${safeText(product.longDescription)}`.toLowerCase();

  if (/\btoner\b/.test(text)) return "Toner Cartridge";
  if (/\bink\b/.test(text)) return "Ink Cartridge";
  if (/\bdrum\b/.test(text)) return "Drum Unit";
  if (/\bribbon\b/.test(text)) return "Printer Ribbon";
  if (/\bprinthead\b/.test(text)) return "Printhead";
  if (/\b(toner|cartridge|drum|ink|ribbon|printhead)\b/.test(text)) return "Printer consumable";
  if (/\b(paper|roll|media|film|vinyl|label)\b/.test(text)) return "Print media";
  if (/\b(printer|multifunction|mfp|copier|plotter|large format)\b/.test(text)) return "Printer";
  if (/\b(scanner|document scanner)\b/.test(text)) return "Scanner";
  if (/\b(laptop|notebook|chromebook)\b/.test(text)) return "Laptop";
  if (/\b(tablet)\b/.test(text)) return "Tablet";
  if (/\b(desktop|workstation|pc\b|server)\b/.test(text)) return "Computer system";
  if (/\b(monitor|display|screen|signage|panel)\b/.test(text)) return "Commercial display";
  if (/\b(projector)\b/.test(text)) return "Projector";
  if (/\b(camera|cctv|nvr|dvr|surveillance)\b/.test(text)) return "Security camera";
  if (/\b(intercom|access control|rfid|door station)\b/.test(text)) return "Access control device";
  if (/\b(router|switch|access point|network|nas|storage|firewall|wifi|wi-fi)\b/.test(text)) return "Network hardware";
  if (/\b(phone|handset|headset|speakerphone|conference|voip|sip)\b/.test(text)) return "Business communication device";
  if (/\b(ups|battery|power supply|powerboard|pdu)\b/.test(text)) return "Power accessory";
  if (/\b(relay|controller|control module|interface)\b/.test(text)) return "Control module";
  if (/\b(adapter|adaptor|converter|interface)\b/.test(text)) return "Adapter";
  if (/\b(cable|cord|lead)\b/.test(text)) return "Cable";
  if (/\b(mount|bracket|stand)\b/.test(text)) return "Mount";

  return "";
};

const removeLeadingBrandFromTitle = (title: string, brand: string) => {
  const cleanBrand = safeText(brand);
  const cleanTitle = safeText(title);
  if (!cleanBrand) return cleanTitle;

  const escapedBrand = cleanBrand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return cleanTitle.replace(new RegExp(`^${escapedBrand}\\s+`, "i"), "").trim();
};

const buildSearchTitleText = (product: CatalogProduct) => {
  const brand = safeText(product.manufacturer);
  const base = removeLeadingBrandFromTitle(safeText(product.description) || safeText(product.code) || "Product", brand);
  const mpn = getProductMpn(product);
  const productType = getSeoProductType(product);
  const normalizedBase = normalizeToken(base);
  const normalizedType = normalizeToken(productType);
  const parts = [
    brand && !normalizedBase.startsWith(normalizeToken(brand)) ? brand : "",
    productType && normalizedType && !normalizedBase.includes(normalizedType) ? productType : "",
    base,
    mpn && !normalizedBase.includes(normalizeToken(mpn)) ? mpn : "",
  ].filter(Boolean);

  return parts.join(" ");
};

const setNamedMeta = (selector: string, attribute: "name" | "property", key: string, content: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
};

const setCanonicalLink = (href: string) => {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }

  element.setAttribute("href", href);
};

const getPublicProductUrl = (productCode: string) =>
  `${SITE_URL}/products/item/${encodeURIComponent(safeText(productCode))}`;

const getProductMetaDescription = (
  product: CatalogProduct,
  description: string,
  availability: string,
) => {
  const price = product.price ? formatAud(product.price) : null;
  const productType = getSeoProductType(product);
  const mpn = getProductMpn(product);
  const gtin = getProductGtin(product);
  const title = buildSearchTitleText(product);
  const parts = [
    `Shop ${title} at Internext Australia.`,
    productType ? `${productType} for Australian business and home customers.` : null,
    mpn ? `MPN ${mpn}.` : null,
    gtin ? `GTIN ${gtin}.` : null,
    price ? `${price} Inc GST.` : null,
    availability ? `${availability}.` : null,
    description,
  ].filter(Boolean);

  return truncateText(parts.join(" "), 155);
};

const getProductStructuredDescription = (product: CatalogProduct, paragraphs: string[]) => {
  const productType = getSeoProductType(product);
  const mpn = getProductMpn(product);
  const gtin = getProductGtin(product);
  const searchTitle = buildSearchTitleText(product);
  const parts = [
    `${searchTitle} from Internext Australia.`,
    productType ? `Product type: ${productType}.` : "",
    mpn ? `MPN: ${mpn}.` : "",
    gtin ? `GTIN: ${gtin}.` : "",
    paragraphs.join(" "),
    "Includes secure checkout, Australian delivery options, and Internext customer support.",
  ].filter(Boolean);

  return parts.join(" ");
};

const ProductDetail = () => {
  const { code } = useParams();
  const productCode = code || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [isLivePriceReady, setIsLivePriceReady] = useState(false);
  const [qty, setQty] = useState(1);
  const [isInCart, setIsInCart] = useState(false);
  const [activeImage, setActiveImage] = useState<string>("");
  const { session } = useAuthSession();
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    setIsInCart(isProductInStoredCart(productCode));
    setIsLivePriceReady(false);
    const loadProduct = async () => {
      try {
        const data = (await loadCatalogProductsFast((liveProducts) => {
          const liveProduct = (liveProducts as CatalogProduct[]).find((item) => item.code === productCode) || null;
          if (isMounted && liveProduct) {
            setProduct(liveProduct);
            setIsLivePriceReady(true);
          }
        })) as CatalogProduct[];
        const found = data.find((item) => item.code === productCode) || null;
        if (isMounted) {
          setProduct(found);
          setIsLivePriceReady(Boolean(found?.liveUpdatedAt));
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
    return isLivePriceReady ? getDisplayPrice(product, session?.role) : "Checking live price...";
  }, [isLivePriceReady, product, session?.role]);

  const availability = useMemo(() => {
    if (!product) {
      return "";
    }

    return (
      safeText(product.availabilityText) ||
      (typeof product.stockQuantity === "number" ? `${product.stockQuantity} available` : "")
    );
  }, [product]);

  const galleryImages = useMemo(() => {
    if (!product) {
      return [];
    }
    const candidates = getProductImageCandidates(product);
    if (candidates.length > 0) {
      return candidates;
    }
    return [];
  }, [product]);

  const specHighlights = useMemo(() => {
    if (!product) {
      return [];
    }
    return extractProductSpecHighlights(product);
  }, [product]);
  const keyHighlights = useMemo(() => specHighlights.slice(0, 6), [specHighlights]);

  const fullDescriptionParagraphs = useMemo(() => {
    if (!product) {
      return [];
    }
    const paragraphs = buildFullDescriptionParagraphs(product, specHighlights);

    const adminSupplierCode = safeText(product.supplierCode);
    if (session?.role === "admin" && adminSupplierCode) {
      return [
        ...paragraphs,
        `Admin reference: ${adminSupplierCode}`,
      ];
    }

    return paragraphs;
  }, [product, session?.role, specHighlights]);

  const productName = product
    ? safeText(product.description) || safeText(product.code) || "Product"
    : "";
  const productBrand = product ? safeText(product.manufacturer) || "Unbranded" : "Unbranded";
  const productCodeLabel = product ? safeText(product.code) : "";
  const supplierCodeLabel = product ? safeText(product.supplierCode) : "";
  const liveCatalogError = product ? safeText(product.liveCatalogError) : "";

  useEffect(() => {
    setActiveImage(galleryImages[0] || "");
  }, [galleryImages]);

  useEffect(() => {
    const scriptId = "internext-product-json-ld";
    document.getElementById(scriptId)?.remove();

    if (!product) {
      return;
    }

    const canonicalUrl = getPublicProductUrl(productCodeLabel);
    const searchTitle = buildSearchTitleText(product);
    const pageTitle = truncateText(`${searchTitle} | Internext Australia`, 90);
    const metaDescription = getProductMetaDescription(
      product,
      fullDescriptionParagraphs.join(" "),
      availability,
    );
    const schemaPrice =
      typeof product.price === "number" && Number.isFinite(product.price) ? product.price : null;
    const schemaImages = galleryImages
      .filter((image) => image !== PRODUCT_IMAGE_PLACEHOLDER)
      .map(toAbsoluteUrl)
      .filter(Boolean);

    document.title = pageTitle;
    setNamedMeta('meta[name="description"]', "name", "description", metaDescription);
    setNamedMeta('meta[name="robots"]', "name", "robots", "index, follow");
    setNamedMeta('meta[property="og:title"]', "property", "og:title", pageTitle);
    setNamedMeta('meta[property="og:description"]', "property", "og:description", metaDescription);
    setNamedMeta('meta[property="og:type"]', "property", "og:type", "product");
    setNamedMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    setNamedMeta('meta[name="twitter:title"]', "name", "twitter:title", pageTitle);
    setNamedMeta('meta[name="twitter:description"]', "name", "twitter:description", metaDescription);
    setCanonicalLink(canonicalUrl);

    if (schemaImages[0]) {
      setNamedMeta('meta[property="og:image"]', "property", "og:image", schemaImages[0]);
      setNamedMeta('meta[name="twitter:image"]', "name", "twitter:image", schemaImages[0]);
    }

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Product",
      sku: productCodeLabel,
      mpn: getProductMpn(product),
      ...(getProductGtin(product) ? { gtin: getProductGtin(product) } : {}),
      name: searchTitle,
      description: getProductStructuredDescription(product, fullDescriptionParagraphs),
      brand: {
        "@type": "Brand",
        name: productBrand || "Internext",
      },
      image: schemaImages,
      offers: schemaPrice !== null
        ? {
            "@type": "Offer",
            url: canonicalUrl,
            priceCurrency: "AUD",
            price: schemaPrice.toFixed(2),
            availability: getSchemaAvailability(product),
            itemCondition: "https://schema.org/NewCondition",
            shippingDetails: {
              "@type": "OfferShippingDetails",
              shippingRate: {
                "@type": "MonetaryAmount",
                value: DEFAULT_PUBLIC_SHIPPING_PRICE.toFixed(2),
                currency: "AUD",
              },
              shippingDestination: {
                "@type": "DefinedRegion",
                addressCountry: "AU",
              },
              deliveryTime: {
                "@type": "ShippingDeliveryTime",
                handlingTime: {
                  "@type": "QuantitativeValue",
                  minValue: 1,
                  maxValue: 2,
                  unitCode: "DAY",
                },
                transitTime: {
                  "@type": "QuantitativeValue",
                  minValue: 2,
                  maxValue: 7,
                  unitCode: "DAY",
                },
              },
            },
            hasMerchantReturnPolicy: {
              "@type": "MerchantReturnPolicy",
              applicableCountry: "AU",
              returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
              merchantReturnDays: 30,
              returnMethod: "https://schema.org/ReturnByMail",
              returnFees: "https://schema.org/ReturnShippingFees",
            },
          }
        : undefined,
    };
    const breadcrumbData = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Products",
          item: `${SITE_URL}/products`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: productName,
          item: canonicalUrl,
        },
      ],
    };

    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify([structuredData, breadcrumbData]);
    document.head.appendChild(script);

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [availability, fullDescriptionParagraphs, galleryImages, product, productBrand, productCodeLabel, productName]);

  const addToCart = () => {
    if (!product) {
      return;
    }

    try {
      const existing = getCartItems().map((item) => ({ ...toCartProduct(item), qty: item.qty }));
      const match = existing.find((item) => item.code === product.code);
      const pricedProduct = toCartProduct(getCartPricedProduct(product, session?.role));
      const nextQuantity = (match?.qty || 0) + qty;
      const toastProductName = truncateText(productName, 90);
      const updated: CartItem[] = match
        ? existing.map((item) =>
            item.code === product.code ? { ...pricedProduct, qty: item.qty + qty } : item,
          )
        : [...existing, { ...pricedProduct, qty }];

      if (!saveCartItems(updated)) {
        toast({
          title: "Cart could not be saved",
          description: "Please refresh the page and try again.",
          variant: "destructive",
        });
        return;
      }

      trackAddToCart({
        item_id: product.code,
        item_name: productName,
        item_brand: productBrand,
        price: pricedProduct.price || 0,
        quantity: qty,
      });
      setIsInCart(true);
      toast({
        title: match ? "Cart updated" : "Added to cart",
        description: match
          ? `${toastProductName} is now ${nextQuantity} in your cart.`
          : `${qty} x ${toastProductName} added to your cart.`,
      });
    } catch {
      toast({
        title: "Cart could not be updated",
        description: "Please refresh the page and try again.",
        variant: "destructive",
      });
    }
  };

  const handleActiveImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    const currentIndex = galleryImages.indexOf(activeImage);
    const nextImage = currentIndex >= 0 ? galleryImages[currentIndex + 1] : galleryImages[0];

    if (nextImage && nextImage !== activeImage) {
      setActiveImage(nextImage);
      return;
    }

    handleProductImageError(event);
  };

  return (
    <Layout>
      <section className="section-padding bg-background">
        <div className="container-catalog">
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
                <div className="bg-card rounded-2xl border border-border/50 p-4 shadow-card sm:p-5 md:p-6">
                  <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
                    <div>
                      {galleryImages.length > 0 ? (
                        <div className="mb-4 flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-secondary/60">
                          {activeImage ? (
                          <img
                            src={activeImage}
                            alt={productName}
                            className="h-full w-full object-contain"
                            loading="eager"
                            onError={handleActiveImageError}
                          />
                          ) : null}
                        </div>
                      ) : null}
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
                                alt={productName}
                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                                loading="lazy"
                                onError={handleProductImageError}
                              />
                            </button>
                          ))}
                          </div>
                        </div>
                      ) : null}

                      <Tabs defaultValue="overview" className="mt-6">
                        <div className="overflow-hidden rounded-[1.75rem] border border-border/50 bg-gradient-to-br from-background via-secondary/15 to-background shadow-card">
                          <div className="border-b border-border/50 bg-background/80 px-5 py-4 backdrop-blur md:px-6">
                            <TabsList className="grid h-auto w-full max-w-lg grid-cols-3 rounded-xl bg-secondary/50 p-1">
                              <TabsTrigger value="overview" className="rounded-lg px-2 text-xs sm:text-sm">
                                Overview
                              </TabsTrigger>
                              <TabsTrigger value="size" className="rounded-lg px-2 text-xs sm:text-sm">
                                Size
                              </TabsTrigger>
                              <TabsTrigger value="availability" className="rounded-lg px-2 text-xs sm:text-sm">
                                Availability
                              </TabsTrigger>
                            </TabsList>
                          </div>

                          <TabsContent value="overview" className="m-0">
                            <div className="border-b border-border/50 bg-background/55 px-5 py-4 md:px-6">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
                                Product Overview
                              </p>
                              <h2 className="mt-2 text-lg font-semibold text-foreground">
                                Full Description
                              </h2>
                            </div>
                            <div className="space-y-5 px-5 py-5 md:px-6 md:py-6">
                              {fullDescriptionParagraphs.map((paragraph, index) => (
                                <p
                                  key={`${product.code}-desc-${index}`}
                                  className={`max-w-none text-base leading-8 ${
                                    index === 0 ? "text-foreground" : "text-muted-foreground"
                                  }`}
                                >
                                  {paragraph}
                                </p>
                              ))}
                            </div>
                          </TabsContent>

                          <TabsContent value="size" className="m-0">
                            <div className="border-b border-border/50 bg-background/55 px-5 py-4 md:px-6">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
                                Product Size
                              </p>
                              <h2 className="mt-2 text-lg font-semibold text-foreground">
                                Measurements
                              </h2>
                            </div>
                            {getMeasurementRows(product).length > 0 ? (
                              <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 md:px-6 md:py-6">
                                {getMeasurementRows(product).map((row) => (
                                  <div
                                    key={row.label}
                                    className="rounded-xl border border-border/60 bg-background px-4 py-3"
                                  >
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                      {row.label}
                                    </p>
                                    <p className="mt-2 text-lg font-semibold text-foreground">
                                      {row.value}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="px-5 py-5 text-sm text-muted-foreground md:px-6 md:py-6">
                                Product measurements are not available.
                              </p>
                            )}
                          </TabsContent>

                          <TabsContent value="availability" className="m-0">
                            <div className="border-b border-border/50 bg-background/55 px-5 py-4 md:px-6">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
                                Live Availability
                              </p>
                              <h2 className="mt-2 text-lg font-semibold text-foreground">
                                Stock by Location
                              </h2>
                            </div>
                            {getAvailabilityRows(product).length > 0 ? (
                              <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 md:px-6 md:py-6">
                                {getAvailabilityRows(product).map((row) => (
                                  <div
                                    key={row.label}
                                    className="rounded-xl border border-border/60 bg-background px-4 py-3"
                                  >
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                      {row.label}
                                    </p>
                                    <p className="mt-2 text-lg font-semibold text-foreground">
                                      {row.value}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="px-5 py-5 text-sm text-muted-foreground md:px-6 md:py-6">
                                Live availability is not available for this product.
                              </p>
                            )}
                          </TabsContent>
                        </div>
                      </Tabs>
                    </div>

                    <div className="flex h-full flex-col rounded-2xl border border-border/50 bg-secondary/20 p-5 md:p-6">
                      <div className="mb-5 flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-semibold tracking-[0.18em] text-accent uppercase">
                          {productBrand}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                          Code: {productCodeLabel}
                        </span>
                        {session?.role === "admin" && supplierCodeLabel ? (
                          <span className="inline-flex items-center rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                            Ref: {supplierCodeLabel}
                          </span>
                        ) : null}
                      </div>

                      <h1 className="mb-6 break-words text-2xl font-bold leading-tight text-foreground sm:text-3xl md:text-4xl xl:text-[2.5rem] xl:leading-tight">
                        {productName}
                      </h1>

                      {keyHighlights.length > 0 ? (
                        <div className="mb-5 rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                            Key Details
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {keyHighlights.map((highlight) => (
                              <div key={highlight} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                                <span>{highlight}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {liveCatalogError ? (
                        <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                          {liveCatalogError} Live product information is temporarily unavailable.
                        </div>
                      ) : null}

                      <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-card">
                        <p className="mb-2 text-sm text-muted-foreground">Price</p>
                        <p className="mb-2 text-3xl font-bold text-foreground">{displayPrice}</p>
                        {availability ? (
                          <p className="mb-2 text-sm font-semibold text-accent">{availability}</p>
                        ) : null}
                        {product.rrp ? (
                          <p className="mb-6 text-sm text-muted-foreground">
                            RRP {formatAud(product.rrp)}
                          </p>
                        ) : (
                          <p className="mb-6 text-sm text-muted-foreground">RRP not listed</p>
                        )}

                        <div className="mb-5 grid gap-3 text-sm">
                          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-secondary/30 p-3">
                            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                            <div>
                              <p className="font-medium text-foreground">Delivery</p>
                              <p className="mt-1 text-muted-foreground">{getDeliverySummary(product)}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-secondary/30 p-3">
                            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                            <div>
                              <p className="font-medium text-foreground">Stock check</p>
                              <p className="mt-1 text-muted-foreground">{getStockSummary(product)}</p>
                            </div>
                          </div>
                        </div>

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

                        {isInCart ? (
                          <Button className="w-full" asChild>
                            <Link to="/cart">View Cart</Link>
                          </Button>
                        ) : (
                          <Button className="w-full" onClick={addToCart} disabled={!isLivePriceReady}>
                            {isLivePriceReady ? "Add to Cart" : "Checking live price"}
                          </Button>
                        )}

                        {!isInCart ? (
                          <Button variant="outline" className="mt-3 w-full" asChild>
                            <Link to="/cart">View Cart</Link>
                          </Button>
                        ) : null}

                        <Button variant="outline" className="mt-3 w-full" asChild>
                          <Link to="/products">Browse More Products</Link>
                        </Button>

                        <div className="mt-5 rounded-xl border border-border/60 bg-secondary/35 p-4">
                          <div className="flex items-center gap-2">
                            <Headphones className="h-4 w-4 text-accent" />
                            <p className="text-sm font-semibold text-foreground">Need help choosing?</p>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Use the product code <span className="font-medium text-foreground">{productCodeLabel}</span> when discussing this item with sales or comparing options across your shortlist.
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
