import { FormEvent, useEffect, useMemo, useState } from "react";
import Layout from "@/components/layout/Layout";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { normalizeCatalogProducts } from "@/lib/catalogQuality";
import { getPrimaryProductImage, handleProductImageError } from "@/lib/productImages";
import { MIN_CATALOG_SEARCH_LENGTH, searchCatalogProducts } from "@/lib/catalogSearch";
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
  supplierCode?: string;
  imageUrl?: string;
};

const RECENT_SEARCHES_KEY = "internext-recent-searches";
const QUICK_SEARCHES = [
  "Grandstream router",
  "Akuvox intercom",
  "Ricoh toner",
  "Samsung signage",
  "Axis camera",
  "Hisense display",
];

const SEARCH_PREVIEW_LIMIT = 24;

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
    ],
  },
  {
    icon: Camera,
    title: "Cameras",
    desc:
      "Consumer and professional imaging solutions including still and video cameras and accessories",
    items: [
      { label: "Consumer Cameras", href: "/products/consumer-cameras" },
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
      { label: "Printer Warranties", href: "/products/printer-warranties" },
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
      { label: "Large Format Consumables", href: "/products/large-format-consumables" },
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

const ProductsIndex = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      try {
        const response = await fetch("/data/catalog-products.json");
        if (!response.ok) {
          throw new Error("Unable to load product catalog.");
        }
        const data = normalizeCatalogProducts((await response.json()) as CatalogProduct[]);
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored) as string[]);
      }
    } catch {
      setRecentSearches([]);
    }
  }, []);

  const persistRecentSearch = (value: string) => {
    const cleaned = value.trim();
    if (!cleaned || typeof window === "undefined") {
      return;
    }

    setRecentSearches((prev) => {
      const next = [cleaned, ...prev.filter((item) => item.toLowerCase() !== cleaned.toLowerCase())].slice(0, 6);
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = searchQuery.trim();
    if (nextQuery.length < MIN_CATALOG_SEARCH_LENGTH) {
      return;
    }

    persistRecentSearch(nextQuery);
    navigate(`/products/search?q=${encodeURIComponent(nextQuery)}&page=1`);
  };

  const applySuggestedSearch = (value: string) => {
    setSearchQuery(value);
  };

  const allSearchMatches = useMemo(
    () => searchCatalogProducts(products, searchQuery),
    [products, searchQuery],
  );
  const searchPreviewMatches = useMemo(
    () => allSearchMatches.slice(0, SEARCH_PREVIEW_LIMIT),
    [allSearchMatches],
  );

  const queryTooShort = searchQuery.trim().length > 0 && searchQuery.trim().length < MIN_CATALOG_SEARCH_LENGTH;
  const hasSearchQuery = searchQuery.trim().length > 0;

  const formatPrice = (value: number | null | undefined) => {
    if (value === null || value === undefined) {
      return null;
    }
    return value.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
  };

  return (
    <Layout>
      <section className="bg-gradient-hero py-20 md:py-28">
        <div className="container-catalog">
          <div className="max-w-3xl">
            <h1 className="mb-6 text-4xl font-bold text-primary-foreground md:text-5xl">
              Product Range
            </h1>
            <p className="text-xl leading-relaxed text-primary-foreground/80">
              Explore our comprehensive range of technology products from the world's
              leading brands, available exclusively to our reseller partners.
            </p>
          </div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-catalog">
          <div className="mb-10 rounded-2xl border border-border/50 bg-card p-6 shadow-card">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                  Find Products
                </p>
                <h2 className="text-xl font-semibold text-foreground">Search the Catalog</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {catalogLoading ? "Loading catalogue..." : `${products.length.toLocaleString()} products available`}
              </p>
            </div>

            <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by brand, product name, code, or combine them together"
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
              Combine brand, model, and code in one search, for example "ricoh g31k" or "akuvox ak a02".
            </p>

            {queryTooShort ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Type at least {MIN_CATALOG_SEARCH_LENGTH} characters to search products.
              </p>
            ) : null}

            {hasSearchQuery && !queryTooShort ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-border/60 bg-background">
                {catalogLoading ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">Loading product search...</p>
                ) : catalogError ? (
                  <p className="px-4 py-3 text-sm text-destructive">{catalogError}</p>
                ) : searchPreviewMatches.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">
                    No products matched "{searchQuery}".
                  </p>
                ) : (
                  <>
                    <div className="flex flex-col gap-2 border-b border-border/40 bg-secondary/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Top matches for "{searchQuery}"
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Showing {searchPreviewMatches.length} of {allSearchMatches.length} matches while you type.
                        </p>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/products/search?q=${encodeURIComponent(searchQuery.trim())}&page=1`}>
                          View all results
                        </Link>
                      </Button>
                    </div>

                    <div className="max-h-[520px] overflow-y-auto">
                      {searchPreviewMatches.map(({ product }, index) => {
                        const image = getPrimaryProductImage(product);
                        const price = formatPrice(product.price) ?? product.priceText ?? "POA";

                        return (
                          <Link
                            key={`${product.code}-${index}`}
                            to={`/products/item/${encodeURIComponent(product.code)}`}
                            className={`grid grid-cols-[56px_minmax(0,1fr)] gap-3 px-4 py-3 transition-colors hover:bg-secondary/60 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:items-center sm:gap-4 ${
                              index < searchPreviewMatches.length - 1 ? "border-b border-border/40" : ""
                            }`}
                          >
                            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-border/40 bg-white sm:h-16 sm:w-16">
                              <img
                                src={image}
                                alt={product.description}
                                loading="lazy"
                                onError={handleProductImageError}
                                className="h-full w-full object-contain"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="break-words font-medium leading-snug text-foreground">
                                {product.description}
                              </p>
                              <p className="text-sm break-words text-muted-foreground">
                                {product.manufacturer || "Unbranded"} - Code: {product.code}
                              </p>
                            </div>
                            <p className="col-start-2 whitespace-nowrap text-sm font-semibold text-foreground sm:col-start-auto">
                              {price}
                            </p>
                          </Link>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
              <div className="rounded-xl border border-border/60 bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                  Quick Searches
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {QUICK_SEARCHES.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => applySuggestedSearch(suggestion)}
                      className="rounded-full border border-border/70 bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:border-accent/50 hover:text-accent"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                  Recent Searches
                </p>
                {recentSearches.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recentSearches.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => applySuggestedSearch(item)}
                        className="rounded-full border border-border/70 bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Your recent searches will appear here.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {categories.map((category) => (
              <div
                key={category.title}
                className="rounded-2xl border border-border/50 bg-card p-7 shadow-card transition-all duration-200 hover:shadow-elevated md:p-8"
              >
                <div className="mb-6 flex items-start gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-secondary text-accent">
                    <category.icon className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="mb-2 text-2xl font-bold text-foreground">{category.title}</h2>
                    <p className="max-w-3xl text-muted-foreground">{category.desc}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {category.items.map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="group rounded-lg border border-border/60 bg-secondary p-4 transition-colors duration-200 hover:bg-accent/10"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold leading-snug text-foreground">{item.label}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {!catalogLoading && catalogError ? (
              <div className="rounded-2xl border border-border/50 bg-card p-8 text-destructive shadow-card">
                {catalogError}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="bg-secondary py-16">
        <div className="container-catalog text-center">
          <h2 className="mb-4 text-2xl font-bold text-foreground md:text-3xl">
            Can't Find What You're Looking For?
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-muted-foreground">
            Contact our sales team for special orders or to discuss your specific requirements.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-navy-light"
          >
            Contact Sales <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default ProductsIndex;
