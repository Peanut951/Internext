import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Search, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPrimaryProductImage, handleProductImageError } from "@/lib/productImages";
import { getCatalogSummaryText, normalizeCatalogProducts } from "@/lib/catalogQuality";
import {
  MIN_CATALOG_SEARCH_LENGTH,
  searchCatalogProducts,
} from "@/lib/catalogSearch";

type CatalogProduct = {
  code: string;
  manufacturer: string;
  description: string;
  longDescription?: string;
  price: number | null;
  priceText?: string;
  supplierCode?: string;
  imageUrl?: string;
};

const RECENT_SEARCHES_KEY = "internext-recent-searches";
const SEARCH_RESULTS_PER_PAGE = 16;
const QUICK_SEARCHES = [
  "Grandstream router",
  "Akuvox intercom",
  "Ricoh toner",
  "Samsung signage",
  "Axis camera",
  "Hisense display",
];

const formatPrice = (value: number | null | undefined) => {
  if (value === null || value === undefined) {
    return null;
  }
  return value.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
};

const ProductSearch = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentQuery = searchParams.get("q") || "";
  const [inputValue, setInputValue] = useState(currentQuery);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    setInputValue(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    let mounted = true;

    const loadProducts = async () => {
      try {
        const response = await fetch("/data/catalog-products.json");
        if (!response.ok) {
          throw new Error("Unable to load product catalog.");
        }

        const data = normalizeCatalogProducts((await response.json()) as CatalogProduct[]);
        if (mounted) {
          setProducts(data);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unable to load product catalog.");
          setLoading(false);
        }
      }
    };

    loadProducts();
    return () => {
      mounted = false;
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

  const matches = useMemo(() => searchCatalogProducts(products, currentQuery), [products, currentQuery]);
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const totalPages = Math.max(1, Math.ceil(matches.length / SEARCH_RESULTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const currentItems = matches.slice(
    (currentPage - 1) * SEARCH_RESULTS_PER_PAGE,
    currentPage * SEARCH_RESULTS_PER_PAGE,
  );

  useEffect(() => {
    if (page !== currentPage) {
      const next = new URLSearchParams(searchParams);
      next.set("page", String(currentPage));
      setSearchParams(next, { replace: true });
    }
  }, [currentPage, page, searchParams, setSearchParams]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = inputValue.trim();
    if (!nextQuery) {
      navigate("/products");
      return;
    }

    persistRecentSearch(nextQuery);
    setSearchParams({ q: nextQuery, page: "1" });
  };

  const applyQuery = (value: string) => {
    persistRecentSearch(value);
    setSearchParams({ q: value, page: "1" });
  };

  const visibleStart = matches.length === 0 ? 0 : (currentPage - 1) * SEARCH_RESULTS_PER_PAGE + 1;
  const visibleEnd = Math.min(currentPage * SEARCH_RESULTS_PER_PAGE, matches.length);
  const canSearch = currentQuery.trim().length >= MIN_CATALOG_SEARCH_LENGTH;
  const pageWindow = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => Math.min(
      Math.max(1, currentPage - 2) + index,
      totalPages,
    ),
  ).filter((value, index, array) => array.indexOf(value) === index);

  return (
    <Layout>
      <section className="bg-gradient-hero py-16 md:py-22">
        <div className="container-catalog">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent/90">
              Catalog Search
            </p>
            <h1 className="mt-3 text-4xl font-bold text-primary-foreground md:text-5xl">
              Search real products across the catalogue.
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-relaxed text-primary-foreground/78">
              Search by product name, code, supplier code, or brand and move through full results with shareable URLs.
            </p>
          </div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-catalog">
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
            <form onSubmit={submitSearch} className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  placeholder="Search by brand, product name, code, or supplier code"
                  className="h-14 rounded-xl border-border/70 bg-background pl-12 pr-12 text-base"
                />
                {inputValue ? (
                  <button
                    type="button"
                    onClick={() => setInputValue("")}
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

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
              <div className="rounded-xl border border-border/60 bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Quick Searches</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {QUICK_SEARCHES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => applyQuery(item)}
                      className="rounded-full border border-border/70 bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:border-accent/50 hover:text-accent"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Recent Searches</p>
                {recentSearches.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recentSearches.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => applyQuery(item)}
                        className="rounded-full border border-border/70 bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">Your recent searches will appear here.</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-border/60 bg-card p-6 shadow-card">
            {!currentQuery.trim() ? (
              <p className="text-sm text-muted-foreground">
                Enter a search above to explore the catalogue.
              </p>
            ) : !canSearch ? (
              <p className="text-sm text-muted-foreground">
                Type at least {MIN_CATALOG_SEARCH_LENGTH} characters to search products.
              </p>
            ) : loading ? (
              <p className="text-sm text-muted-foreground">Loading search results...</p>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : matches.length === 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">No products matched "{currentQuery}".</p>
                <p className="text-sm text-muted-foreground">
                  Try combining fewer terms or searching by a code or brand.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4 border-b border-border/50 pb-5 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
                      Search Results
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-foreground">
                      {matches.length} matches for "{currentQuery}"
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Showing {visibleStart}-{visibleEnd} of {matches.length} results.
                    </p>
                  </div>

                  {matches[0] ? (
                    <Button
                      variant="outline"
                      asChild
                      className="w-full md:w-auto"
                    >
                      <Link to={`/products/item/${encodeURIComponent(matches[0].product.code)}`}>
                        Open Best Match
                      </Link>
                    </Button>
                  ) : null}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {currentItems.map(({ product }) => {
                    const image = getPrimaryProductImage(product);
                    return (
                      <Link
                        key={product.code}
                        to={`/products/item/${encodeURIComponent(product.code)}`}
                        className="group rounded-2xl border border-border/60 bg-background p-4 transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-card"
                      >
                        <div className="grid gap-4 sm:grid-cols-[112px_minmax(0,1fr)]">
                          <div className="aspect-square overflow-hidden rounded-xl border border-border/50 bg-white max-sm:max-w-[112px]">
                            <img
                              src={image}
                              alt={product.description}
                              loading="lazy"
                              onError={handleProductImageError}
                              className="h-full w-full object-contain"
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
                                {product.manufacturer || "Unbranded"}
                              </span>
                              <span className="rounded-full border border-border/60 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                                {product.code}
                              </span>
                            </div>

                            <h3 className="mt-3 text-lg font-semibold leading-snug text-foreground">
                              {product.description}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              {getCatalogSummaryText(product)}
                            </p>
                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <span className="text-xl font-bold text-foreground">
                                {formatPrice(product.price) ?? product.priceText ?? "POA"}
                              </span>
                              <span className="inline-flex items-center gap-1 text-sm font-medium text-accent">
                                View details <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {totalPages > 1 ? (
                  <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-5">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={currentPage <= 1}
                      onClick={() => setSearchParams({ q: currentQuery, page: String(currentPage - 1) })}
                    >
                      Previous
                    </Button>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {pageWindow.map((pageNumber) => (
                        <button
                          key={pageNumber}
                          type="button"
                          onClick={() => setSearchParams({ q: currentQuery, page: String(pageNumber) })}
                          className={`h-10 min-w-10 rounded-full px-3 text-sm font-medium transition-colors ${
                            pageNumber === currentPage
                              ? "bg-primary text-primary-foreground"
                              : "border border-border/70 bg-background text-foreground hover:border-accent/40 hover:text-accent"
                          }`}
                        >
                          {pageNumber}
                        </button>
                      ))}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={currentPage >= totalPages}
                      onClick={() => setSearchParams({ q: currentQuery, page: String(currentPage + 1) })}
                    >
                      Next
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ProductSearch;
