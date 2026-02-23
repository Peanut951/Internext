import { FormEvent, useEffect, useMemo, useState } from "react";
import Layout from "@/components/layout/Layout";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Monitor,
  Camera,
  Shield,
  Printer,
  Droplet,
  Scan,
  ShieldCheck,
  HardDrive,
  Headphones,
  ArrowRight,
  Search,
  X,
} from "lucide-react";

type CatalogProduct = {
  code: string;
  manufacturer: string;
  description: string;
  price: number | null;
  priceText?: string;
  imageUrl?: string;
  supplierCode?: string;
};

type IndexedProduct = {
  product: CatalogProduct;
  code: string;
  description: string;
  manufacturer: string;
  supplierCode: string;
  haystack: string;
};

const MIN_SEARCH_LENGTH = 2;
const MAX_SEARCH_RESULTS = 8;

const normalizeText = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const formatPrice = (value: number | null | undefined) => {
  if (value === null || value === undefined) {
    return null;
  }
  return value.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
};

const getMatchScore = (item: IndexedProduct, query: string) => {
  let score = 0;

  if (item.code === query) score += 100;
  else if (item.code.startsWith(query)) score += 80;
  else if (item.code.includes(query)) score += 55;

  if (item.description.startsWith(query)) score += 45;
  else if (item.description.includes(query)) score += 30;

  if (item.manufacturer.startsWith(query)) score += 22;
  else if (item.manufacturer.includes(query)) score += 14;

  if (item.supplierCode.startsWith(query)) score += 18;
  else if (item.supplierCode.includes(query)) score += 10;

  if (score === 0 && item.haystack.includes(query)) {
    score = 8;
  }

  return score;
};

const categories = [
  {
    icon: Monitor,
    title: "Audio Visual",
    desc:
      "Professional displays, projectors, digital signage, interactive panels and collaboration solutions",
    items: [
      { label: "Projectors", href: "/products/projectors" },
      { label: "Digital Signage & Displays", href: "/products/digital-signage" },
      { label: "TVs & Commercial Panels", href: "/products/tvs-panels" },
      { label: "Interactive Panels", href: "/products/interactive-panels" },
      { label: "Mounts & Brackets", href: "/products/mounts-brackets" },
      { label: "Collaboration Solutions", href: "/products/collaboration" },
    ],
  },
  {
    icon: Camera,
    title: "Cameras",
    desc:
      "Consumer and professional imaging solutions including still and video cameras and accessories",
    items: [
      { label: "Consumer Cameras", href: "/products/consumer-cameras" },
      { label: "Professional Cameras", href: "/products/professional-cameras" },
      { label: "Imaging Accessories", href: "/products/imaging-accessories" },
    ],
  },
  {
    icon: Shield,
    title: "IP Surveillance",
    desc: "End-to-end IP video solutions including cameras, recorders, kits and accessories",
    items: [
      { label: "IP Cameras", href: "/products/ip-cameras" },
      { label: "NVRs & Recorders", href: "/products/nvrs-recorders" },
      { label: "Surveillance Kits", href: "/products/surveillance-kits" },
      { label: "Surveillance Accessories", href: "/products/surveillance-accessories" },
    ],
  },
  {
    icon: Printer,
    title: "Office Products",
    desc: "Essential office equipment and supplies for productive workplaces",
    items: [
      { label: "Printers", href: "/products/printers" },
      { label: "Multifunction Devices", href: "/products/multifunction" },
      { label: "Scanners", href: "/products/scanners" },
      { label: "Shredders", href: "/products/shredders" },
      { label: "Office Technology", href: "/products/office-technology" },
    ],
  },
  {
    icon: Printer,
    title: "Printers",
    desc:
      "Desktop to production printers including laser, inkjet, large format and speciality machines",
    items: [
      { label: "A4 Printers", href: "/products/a4-printers" },
      { label: "A3 Printers", href: "/products/a3-printers" },
      { label: "Inkjet Printers", href: "/products/inkjet" },
      { label: "Laser Printers", href: "/products/laser" },
      { label: "Large Format Printers", href: "/products/large-format" },
      { label: "3D Printers", href: "/products/3d-printers" },
      { label: "Dot Matrix Printers", href: "/products/dot-matrix" },
      { label: "Printer Warranties", href: "/products/printer-warranties" },
      { label: "Printer Accessories", href: "/products/printer-accessories" },
    ],
  },
  {
    icon: Droplet,
    title: "Print Consumables",
    desc:
      "Ink, toner, large format supplies, tape, filament and other consumables",
    items: [
      { label: "Inkjet Consumables", href: "/products/inkjet-consumables" },
      { label: "Laser Consumables", href: "/products/laser-consumables" },
      {
        label: "Large Format Consumables",
        href: "/products/large-format-consumables",
      },
      { label: "Ribbon & Tape", href: "/products/ribbon-tape" },
      { label: "3D Filament", href: "/products/3d-filament" },
      { label: "Other Consumables", href: "/products/other-consumables" },
    ],
  },
  {
    icon: Scan,
    title: "Scanners",
    desc:
      "From portable scanners to high-speed production units plus imaging accessories",
    items: [
      { label: "A4 Office Scanners", href: "/products/a4-scanners" },
      { label: "A3 Office Scanners", href: "/products/a3-scanners" },
      { label: "Portable Scanners", href: "/products/portable-scanners" },
      { label: "Imaging & Archiving", href: "/products/imaging" },
      { label: "Scanner Accessories", href: "/products/scanner-accessories" },
      { label: "Scanner Warranties", href: "/products/scanner-warranties" },
    ],
  },
  {
    icon: ShieldCheck,
    title: "Security & Automation",
    desc:
      "Access control, intercoms, IP comms, UPS, automation, lighting and energy management",
    items: [
      { label: "Access Control", href: "/products/access-control" },
      { label: "Intercom Systems", href: "/products/intercom-systems" },
      { label: "IP Communications", href: "/products/ip-communications" },
      { label: "UPS & Power", href: "/products/ups-power" },
      { label: "Automation & Lighting", href: "/products/automation-lighting" },
      { label: "Energy Management", href: "/products/energy-management" },
    ],
  },
  {
    icon: HardDrive,
    title: "Storage & Networking",
    desc:
      "Network recorders, storage devices, switches, routers, access points and cabling",
    items: [
      { label: "Network Video Recorders", href: "/products/nvrs" },
      { label: "HDD & Storage", href: "/products/storage" },
      { label: "Switches", href: "/products/switches" },
      { label: "Routers", href: "/products/routers" },
      { label: "Access Points", href: "/products/access-points" },
      { label: "Networking Accessories", href: "/products/networking-accessories" },
    ],
  },
  {
    icon: Headphones,
    title: "Unified Communications",
    desc:
      "Headsets, conferencing hardware, VOIP, video collaboration and UC accessories",
    items: [
      { label: "Headsets", href: "/products/headsets" },
      { label: "Conference Equipment", href: "/products/conference" },
      { label: "VOIP Phones", href: "/products/voip" },
      { label: "Video Collaboration", href: "/products/video-collab" },
      { label: "UC Accessories", href: "/products/uc-accessories" },
    ],
  },
];

const categoryThemes = [
  {
    card: "from-blue-50 via-white to-sky-50/70",
    glow: "bg-[radial-gradient(circle_at_top_right,_rgba(37,99,235,0.16),_transparent_65%)]",
    icon: "bg-blue-100 text-blue-700",
    badge: "bg-blue-100 text-blue-800",
    item: "border-blue-200/70 bg-white/90 hover:border-blue-400 hover:bg-blue-50/90",
  },
  {
    card: "from-indigo-50 via-white to-blue-50/70",
    glow: "bg-[radial-gradient(circle_at_top_right,_rgba(67,56,202,0.15),_transparent_65%)]",
    icon: "bg-indigo-100 text-indigo-700",
    badge: "bg-indigo-100 text-indigo-800",
    item: "border-indigo-200/70 bg-white/90 hover:border-indigo-400 hover:bg-indigo-50/90",
  },
  {
    card: "from-sky-50 via-white to-blue-50/70",
    glow: "bg-[radial-gradient(circle_at_top_right,_rgba(2,132,199,0.15),_transparent_65%)]",
    icon: "bg-sky-100 text-sky-700",
    badge: "bg-sky-100 text-sky-800",
    item: "border-sky-200/70 bg-white/90 hover:border-sky-400 hover:bg-sky-50/90",
  },
  {
    card: "from-slate-100 via-white to-blue-50/70",
    glow: "bg-[radial-gradient(circle_at_top_right,_rgba(30,64,175,0.14),_transparent_65%)]",
    icon: "bg-blue-100 text-blue-800",
    badge: "bg-blue-100 text-blue-900",
    item: "border-blue-200/70 bg-white/90 hover:border-blue-500 hover:bg-blue-50/90",
  },
  {
    card: "from-blue-100/70 via-white to-indigo-50/70",
    glow: "bg-[radial-gradient(circle_at_top_right,_rgba(29,78,216,0.16),_transparent_65%)]",
    icon: "bg-indigo-100 text-indigo-700",
    badge: "bg-indigo-100 text-indigo-800",
    item: "border-indigo-200/70 bg-white/90 hover:border-indigo-500 hover:bg-indigo-50/90",
  },
];

const ProductsIndex = () => {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      try {
        const response = await fetch("/data/catalog-products.json");
        if (!response.ok) {
          throw new Error("Unable to load product catalog.");
        }
        const data = (await response.json()) as CatalogProduct[];
        if (isMounted) {
          setProducts(data);
          setCatalogLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          setCatalogError(
            error instanceof Error ? error.message : "Unable to load product catalog.",
          );
          setCatalogLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const indexedProducts = useMemo<IndexedProduct[]>(() => {
    return products.map((product) => {
      const code = normalizeText(product.code || "");
      const description = normalizeText(product.description || "");
      const manufacturer = normalizeText(product.manufacturer || "");
      const supplierCode = normalizeText(product.supplierCode || "");

      return {
        product,
        code,
        description,
        manufacturer,
        supplierCode,
        haystack: [description, code, manufacturer, supplierCode].join(" ").trim(),
      };
    });
  }, [products]);

  const query = normalizeText(searchQuery);
  const hasQuery = query.length > 0;
  const canSearch = query.length >= MIN_SEARCH_LENGTH;

  const searchState = useMemo(() => {
    if (!canSearch) {
      return {
        total: 0,
        items: [] as CatalogProduct[],
      };
    }

    const matches = indexedProducts
      .map((item) => ({
        product: item.product,
        score: getMatchScore(item, query),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => {
        if (a.score !== b.score) {
          return b.score - a.score;
        }
        return a.product.description.localeCompare(b.product.description);
      });

    return {
      total: matches.length,
      items: matches.slice(0, MAX_SEARCH_RESULTS).map((item) => item.product),
    };
  }, [canSearch, indexedProducts, query]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (searchState.items[0]) {
      navigate(`/products/item/${encodeURIComponent(searchState.items[0].code)}`);
    }
  };

  return (
    <Layout>
      <section className="bg-gradient-hero py-20 md:py-28">
        <div className="container-wide">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
              Product Range
            </h1>
            <p className="text-xl text-primary-foreground/80 leading-relaxed">
              Explore our comprehensive range of technology products from the world's
              leading brands, available exclusively to our reseller partners.
            </p>
          </div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50 mb-10">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent mb-1">
                  Find Products
                </p>
                <h2 className="text-xl font-semibold text-foreground">Search the Catalog</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {products.length.toLocaleString()} products available
              </p>
            </div>

            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search products by name, code, brand, or supplier code"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-14 rounded-xl border-border/70 bg-background pl-12 pr-12 text-base focus-visible:ring-accent"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <Button type="submit" className="h-14 px-7">
                Search
              </Button>
            </form>

            <p className="mt-3 text-sm text-muted-foreground">
              Start typing to search real products. Press Enter to open the best match.
            </p>

            {hasQuery ? (
              <div className="mt-4 rounded-xl border border-border/60 bg-background overflow-hidden">
                {!canSearch ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">
                    Type at least {MIN_SEARCH_LENGTH} characters to search products.
                  </p>
                ) : catalogLoading ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">Loading product search...</p>
                ) : catalogError ? (
                  <p className="px-4 py-3 text-sm text-destructive">{catalogError}</p>
                ) : searchState.total === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">
                    No products matched "{searchQuery}".
                  </p>
                ) : (
                  <>
                    {searchState.items.map((product, index) => {
                      const image = product.imageUrl?.trim();
                      const price = formatPrice(product.price) ?? product.priceText ?? "POA";
                      return (
                        <Link
                          key={product.code}
                          to={`/products/item/${encodeURIComponent(product.code)}`}
                          className={`grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 hover:bg-secondary/60 transition-colors ${
                            index < searchState.items.length - 1 ? "border-b border-border/40" : ""
                          }`}
                        >
                          <div className="h-16 w-16 rounded-lg bg-white border border-border/40 overflow-hidden flex items-center justify-center">
                            {image ? (
                              <img
                                src={image}
                                alt={product.description}
                                loading="lazy"
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <span className="text-[11px] text-muted-foreground">No image</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground leading-snug break-words">
                              {product.description}
                            </p>
                            <p className="text-sm text-muted-foreground break-words">
                              {product.manufacturer || "Unbranded"} - Code: {product.code}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-foreground whitespace-nowrap">
                            {price}
                          </p>
                        </Link>
                      );
                    })}
                    <p className="px-4 py-3 text-xs text-muted-foreground border-t border-border/40 bg-secondary/35">
                      Showing {searchState.items.length} of {searchState.total} matching products.
                    </p>
                  </>
                )}
              </div>
            ) : null}
          </div>

          <div className="space-y-8">
            {categories.map((category, index) => {
              const theme = categoryThemes[index % categoryThemes.length];
              return (
                <div
                  key={category.title}
                  className={`relative overflow-hidden rounded-[1.5rem] border border-border/60 bg-gradient-to-br ${theme.card} p-7 md:p-8 shadow-[0_16px_42px_-30px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_46px_-28px_rgba(15,23,42,0.45)]`}
                >
                  <div className={`pointer-events-none absolute inset-0 ${theme.glow}`} />

                  <div className="relative flex flex-wrap items-start justify-between gap-4 mb-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${theme.icon}`}>
                        <category.icon className="h-7 w-7" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">{category.title}</h2>
                        <p className="text-muted-foreground max-w-3xl">{category.desc}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${theme.badge}`}>
                      {category.items.length} subcategories
                    </span>
                  </div>

                  <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {category.items.map((item) => (
                      <Link
                        key={item.label}
                        to={item.href}
                        className={`group rounded-xl border p-4 transition-all duration-200 ${theme.item}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-foreground leading-snug">{item.label}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-foreground" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}

            {!catalogLoading && catalogError && (
              <div className="bg-card rounded-2xl p-8 shadow-card border border-border/50 text-destructive">
                {catalogError}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-16 bg-secondary">
        <div className="container-wide text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Can't Find What You're Looking For?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Contact our sales team for special orders or to discuss your specific requirements.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-navy-light transition-colors"
          >
            Contact Sales <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default ProductsIndex;
