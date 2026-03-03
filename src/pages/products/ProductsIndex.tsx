import { FormEvent, useEffect, useMemo, useState } from "react";
import Layout from "@/components/layout/Layout";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getPrimaryProductImage, handleProductImageError } from "@/lib/productImages";
import { normalizeCatalogProducts } from "@/lib/catalogQuality";
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

type SearchMatch = {
  product: CatalogProduct;
  score: number;
};

const RECENT_SEARCHES_KEY = "internext-recent-searches";
const MIN_SEARCH_LENGTH = 2;
const SEARCH_RESULTS_PER_PAGE = 8;
const QUICK_SEARCHES = [
  "Grandstream router",
  "Akuvox intercom",
  "Ricoh toner",
  "Samsung signage",
  "Axis camera",
  "Hisense display",
];

const normalizeText = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const formatPrice = (value: number | null | undefined) => {
  if (value === null || value === undefined) {
    return null;
  }
  return value.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
};

const getTokenScore = (item: IndexedProduct, token: string) => {
  let score = 0;

  if (item.code === token) score += 120;
  else if (item.code.startsWith(token)) score += 90;
  else if (item.code.includes(token)) score += 60;

  if (item.supplierCode === token) score += 100;
  else if (item.supplierCode.startsWith(token)) score += 70;
  else if (item.supplierCode.includes(token)) score += 48;

  if (item.manufacturer === token) score += 70;
  else if (item.manufacturer.startsWith(token)) score += 36;
  else if (item.manufacturer.includes(token)) score += 22;

  if (item.description.startsWith(token)) score += 52;
  else if (item.description.includes(token)) score += 34;

  if (score === 0 && item.haystack.includes(token)) {
    score = 12;
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

const ProductsIndex = () => {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchPage, setSearchPage] = useState(1);
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
  const searchTokens = useMemo(() => query.split(" ").filter(Boolean), [query]);
  const hasQuery = query.length > 0;
  const canSearch = query.length >= MIN_SEARCH_LENGTH;

  const searchMatches = useMemo<SearchMatch[]>(() => {
    if (!canSearch) {
      return [];
    }

    return indexedProducts
      .map((item) => {
        const allTokensMatch = searchTokens.every((token) => item.haystack.includes(token));
        if (!allTokensMatch) {
          return null;
        }

        const score = searchTokens.reduce((total, token) => total + getTokenScore(item, token), 0);
        return {
          product: item.product,
          score: score + (searchTokens.length > 1 ? searchTokens.length * 10 : 0),
        };
      })
      .filter((item): item is SearchMatch => Boolean(item))
      .sort((a, b) => {
        if (a.score !== b.score) {
          return b.score - a.score;
        }
        return a.product.description.localeCompare(b.product.description);
      });
  }, [canSearch, indexedProducts, searchTokens]);

  const totalSearchPages = Math.max(1, Math.ceil(searchMatches.length / SEARCH_RESULTS_PER_PAGE));
  const currentSearchPage = Math.min(searchPage, totalSearchPages);
  const pagedSearchItems = useMemo(() => {
    const start = (currentSearchPage - 1) * SEARCH_RESULTS_PER_PAGE;
    return searchMatches.slice(start, start + SEARCH_RESULTS_PER_PAGE).map((item) => item.product);
  }, [currentSearchPage, searchMatches]);

  useEffect(() => {
    setSearchPage(1);
  }, [query]);

  const persistRecentSearch = (value: string) => {
    const cleaned = value.trim();
    if (!cleaned || typeof window === "undefined") {
      return;
    }

    setRecentSearches((prev) => {
      const next = [
        cleaned,
        ...prev.filter((item) => normalizeText(item) !== normalizeText(cleaned)),
      ].slice(0, 6);
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canSearch) {
      persistRecentSearch(searchQuery);
    }
  };

  const applySuggestedSearch = (value: string) => {
    setSearchQuery(value);
    persistRecentSearch(value);
  };

  const openBestMatch = () => {
    if (searchMatches[0]) {
      navigate(`/products/item/${encodeURIComponent(searchMatches[0].product.code)}`);
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

            {!hasQuery ? (
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
            ) : null}

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
                ) : searchMatches.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">
                    No products matched "{searchQuery}".
                  </p>
                ) : (
                  <>
                    <div className="flex flex-col gap-3 border-b border-border/40 bg-secondary/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {searchMatches.length} matches for "{searchQuery}"
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Search looks across product name, brand, code, and supplier code.
                        </p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={openBestMatch}>
                        Open Best Match
                      </Button>
                    </div>
                    {pagedSearchItems.map((product, index) => {
                      const image = getPrimaryProductImage(product);
                      const price = formatPrice(product.price) ?? product.priceText ?? "POA";
                      return (
                        <Link
                          key={`${product.code}-${index}`}
                          to={`/products/item/${encodeURIComponent(product.code)}`}
                          className={`grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 hover:bg-secondary/60 transition-colors ${
                            index < pagedSearchItems.length - 1 ? "border-b border-border/40" : ""
                          }`}
                        >
                          <div className="h-16 w-16 rounded-lg bg-white border border-border/40 overflow-hidden flex items-center justify-center">
                            <img
                              src={image}
                              alt={product.description}
                              loading="lazy"
                              onError={handleProductImageError}
                              className="h-full w-full object-contain"
                            />
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
                    <div className="flex flex-col gap-3 px-4 py-3 text-xs text-muted-foreground border-t border-border/40 bg-secondary/35 sm:flex-row sm:items-center sm:justify-between">
                      <p>
                        Showing {(currentSearchPage - 1) * SEARCH_RESULTS_PER_PAGE + 1} to {Math.min(currentSearchPage * SEARCH_RESULTS_PER_PAGE, searchMatches.length)} of {searchMatches.length} matching products.
                      </p>
                      {totalSearchPages > 1 ? (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={currentSearchPage <= 1}
                            onClick={() => setSearchPage((page) => Math.max(1, page - 1))}
                          >
                            Previous
                          </Button>
                          <span className="text-xs text-muted-foreground px-1">
                            Page {currentSearchPage} of {totalSearchPages}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={currentSearchPage >= totalSearchPages}
                            onClick={() => setSearchPage((page) => Math.min(totalSearchPages, page + 1))}
                          >
                            Next
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>

          <div className="space-y-8">
            {categories.map((category) => {
              return (
                <div
                  key={category.title}
                  className="rounded-2xl border border-border/50 bg-card p-7 md:p-8 shadow-card transition-all duration-200 hover:shadow-elevated"
                >
                  <div className="flex items-start gap-4 mb-6">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-secondary text-accent">
                        <category.icon className="h-7 w-7" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">{category.title}</h2>
                        <p className="text-muted-foreground max-w-3xl">{category.desc}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {category.items.map((item) => (
                      <Link
                        key={item.label}
                        to={item.href}
                        className="group rounded-lg border border-border/60 bg-secondary p-4 transition-colors duration-200 hover:bg-accent/10"
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
