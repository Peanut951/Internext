import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, ChevronDown, ShoppingCart, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  MIN_CATALOG_SEARCH_LENGTH,
  searchCatalogProducts,
} from "@/lib/catalogSearch";
import {
  loadCatalogProducts,
  loadCatalogProductsFast,
  type CatalogProductWithLive,
} from "@/lib/liveCatalog";

/**
 * Navigation items for the site. The Product Range dropdown lists
 * all of the top–level categories that Internext carries.  These map to
 * dynamic routes like `/products/:category` which are handled by
 * `ProductCategory.tsx`.  If you add or remove categories here, be sure to
 * update the corresponding `categories` list in `ProductsIndex.tsx` as well.
 */
const navItems = [
  { label: "About Internext", href: "/about" },
  {
    label: "Products",
    href: "/products",
    megaMenu: true,
    // Each item points to a top–level category.  The slug after `/products/`
    // should match the `category` param used in the route definitions in
    // App.tsx and the keys of the `categoryData` object in
    // ProductCategory.tsx.  Feel free to rearrange or rename categories
    // to suit your catalogue, but keep the structure flat here.
    items: [
      { label: "Audio Visual", href: "/products/audio-visual" },
      { label: "Cameras", href: "/products/cameras" },
      { label: "IP Surveillance", href: "/products/ip-surveillance" },
      { label: "Office Products", href: "/products/office-products" },
      { label: "Printers", href: "/products/printers" },
      { label: "Print Consumables", href: "/products/print-consumables" },
      { label: "Scanners", href: "/products/scanners" },
      { label: "Security & Automation", href: "/products/security-automation" },
      { label: "Storage & Networking", href: "/products/storage-networking" },
      { label: "Unified Communications", href: "/products/unified-communications" },
    ],
  },
  { label: "Technical Services", href: "/services" },
  {
    label: "Support",
    href: "/support/faq",
    megaMenu: true,
    items: [
      { label: "FAQ", href: "/support/faq" },
      { label: "Shipping & Delivery", href: "/support/shipping" },
      { label: "Warranty & Returns", href: "/support/warranty" },
      { label: "Returns & Refunds", href: "/support/returns" },
      { label: "Payment Security", href: "/support/payment-security" },
      { label: "Consumer Guarantees", href: "/support/consumer-guarantees" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms & Conditions", href: "/terms" },
    ],
  },
  { label: "Contact Us", href: "/contact" },
];

const formatSuggestionPrice = (product: CatalogProductWithLive) => {
  if (product.priceText) {
    return product.priceText;
  }

  if (typeof product.price === "number") {
    return `$${product.price.toFixed(2)}`;
  }

  return null;
};

const hasVerifiedSuggestionPrice = (product: CatalogProductWithLive) =>
  Boolean(product.liveUpdatedAt) || product.manufacturer.trim().toLowerCase() === "leader";

const Header = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchProducts, setSearchProducts] = useState<CatalogProductWithLive[]>([]);
  const [searchProductsRefreshing, setSearchProductsRefreshing] = useState(true);
  const [searchSuggestionsOpen, setSearchSuggestionsOpen] = useState(false);
  const { session } = useAuthSession();

  useEffect(() => {
    const readCartCount = () => {
      try {
        const raw = window.localStorage.getItem("internext-cart");
        if (!raw) {
          return 0;
        }
        const items = JSON.parse(raw) as Array<{ qty?: number }>;
        return items.reduce((total, item) => total + Math.max(1, Number(item.qty) || 1), 0);
      } catch {
        return 0;
      }
    };

    const syncCart = () => setCartCount(readCartCount());

    syncCart();
    window.addEventListener("storage", syncCart);
    window.addEventListener("focus", syncCart);
    window.addEventListener("internext-cart-updated", syncCart);
    const intervalId = window.setInterval(syncCart, 1200);

    return () => {
      window.removeEventListener("storage", syncCart);
      window.removeEventListener("focus", syncCart);
      window.removeEventListener("internext-cart-updated", syncCart);
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSearchProducts = async () => {
      try {
        const products = await loadCatalogProductsFast();
        if (isMounted) {
          setSearchProducts(products);
        }
      } catch {
        if (isMounted) {
          setSearchProducts([]);
        }
      }

      try {
        const products = await loadCatalogProducts({ forceRefresh: true });
        if (isMounted) {
          setSearchProducts(products);
        }
      } catch {
        // Keep the fast catalogue for search suggestions if the refresh is unavailable.
      } finally {
        if (isMounted) {
          setSearchProductsRefreshing(false);
        }
      }
    };

    loadSearchProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const searchSuggestions = useMemo(() => {
    const products = searchProductsRefreshing
      ? searchProducts.filter(hasVerifiedSuggestionPrice)
      : searchProducts;

    if (searchQuery.trim().length < MIN_CATALOG_SEARCH_LENGTH || !products.length) {
      return [];
    }

    return searchCatalogProducts(products, searchQuery)
      .slice(0, 6)
      .map(({ product }) => product);
  }, [searchProducts, searchProductsRefreshing, searchQuery]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      navigate("/products");
      setSearchSuggestionsOpen(false);
      return;
    }

    navigate(`/products/search?q=${encodeURIComponent(query)}&page=1`);
    setSearchSuggestionsOpen(false);
    setMobileMenuOpen(false);
  };

  const openSuggestion = (product: CatalogProductWithLive) => {
    const code = product.code || product.supplierCode;
    if (!code) {
      return;
    }

    navigate(`/products/item/${encodeURIComponent(code)}`);
    setSearchQuery("");
    setSearchSuggestionsOpen(false);
    setMobileMenuOpen(false);
  };

  const searchSuggestionsPanel = (
    <div className="absolute left-0 right-0 top-full z-[70] mt-2 overflow-hidden rounded-md border border-border bg-card shadow-elevated">
      {searchSuggestions.length ? (
        <div className="max-h-[420px] overflow-y-auto py-2">
          {searchSuggestions.map((product) => {
            const price = formatSuggestionPrice(product);
            const code = product.code || product.supplierCode || product.description;

            return (
              <button
                key={`${code}-${product.description}`}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => openSuggestion(product)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-background">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt=""
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <Search className="h-5 w-5 text-muted-foreground" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 block text-sm font-semibold text-foreground">
                    {product.description}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{product.manufacturer}</span>
                    <span>{code}</span>
                  </span>
                </span>
                {price ? (
                  <span className="hidden shrink-0 text-sm font-semibold text-foreground sm:block">
                    {price}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-3 text-sm text-muted-foreground">No matching products.</div>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card shadow-sm">
      <div className="container-wide py-3">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 md:gap-5">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <img
              src="/internext-white-bg-cropped.png"
              alt="Internext Logo"
              className="h-8 w-auto max-w-[145px] object-contain sm:max-w-[180px] xl:h-10 xl:max-w-[220px]"
            />
          </Link>

          <div
            className="relative hidden min-w-0 md:block"
            onBlur={() => window.setTimeout(() => setSearchSuggestionsOpen(false), 120)}
          >
            <form onSubmit={submitSearch} className="flex min-w-0 items-stretch" role="search">
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSearchSuggestionsOpen(true);
                }}
                onFocus={() => setSearchSuggestionsOpen(true)}
                placeholder="Product Search"
                className="h-11 min-w-0 flex-1 rounded-l-none border border-r-0 border-border bg-background px-4 text-sm outline-none transition focus:border-accent"
                aria-label="Product search"
                autoComplete="off"
              />
              <button
                type="submit"
                className="flex h-11 w-16 items-center justify-center border border-border bg-background text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label="Search products"
              >
                <Search className="h-5 w-5" />
              </button>
            </form>
            {searchSuggestionsOpen && searchQuery.trim().length >= MIN_CATALOG_SEARCH_LENGTH
              ? searchSuggestionsPanel
              : null}
          </div>

          <div className="hidden flex-none items-center justify-end xl:flex">
            <Button variant="outline" size="sm" className="h-9 rounded-full px-0" asChild>
              <Link to="/cart" className="inline-flex h-9 items-center gap-2 px-4 leading-none">
                <ShoppingCart className="h-4 w-4 shrink-0" />
                <span>Cart</span>
                <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold leading-none text-primary-foreground">
                  {cartCount}
                </span>
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-end gap-2 xl:hidden">
            <Button variant="outline" size="sm" className="h-9 rounded-full px-0" asChild>
              <Link to="/cart" className="inline-flex h-9 items-center gap-2 px-3 leading-none">
                <ShoppingCart className="h-4 w-4 shrink-0" />
                <span className="sr-only sm:not-sr-only">Cart</span>
                <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold leading-none text-primary-foreground">
                  {cartCount}
                </span>
              </Link>
            </Button>
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="xl:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden bg-primary xl:block">
        <div className="container-wide">
          <nav className="flex items-center gap-2">
            {navItems.map((item) => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => item.megaMenu && setActiveDropdown(item.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link
                  to={item.href}
                  className="flex h-12 items-center gap-2 px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-navy-light"
                >
                  {item.label}
                  {item.megaMenu && <ChevronDown className="h-4 w-4" />}
                </Link>

                {item.megaMenu && activeDropdown === item.label && (
                  <div className="absolute left-0 top-full z-50 min-w-[230px] rounded-b-lg border border-border bg-card p-3 shadow-elevated animate-fade-in">
                    {item.items?.map((subItem) => (
                      <Link
                        key={subItem.label}
                        to={subItem.href}
                        className="block rounded-md px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-accent"
                      >
                        {subItem.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>

      <div className="container-wide">
        {mobileMenuOpen && (
          <nav className="xl:hidden mt-4 max-h-[calc(100vh-5rem)] overflow-y-auto pb-4 border-t border-border pt-4 animate-fade-in">
            <div
              className="relative mb-3 px-4"
              onBlur={() => window.setTimeout(() => setSearchSuggestionsOpen(false), 120)}
            >
              <form onSubmit={submitSearch} className="flex items-stretch" role="search">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setSearchSuggestionsOpen(true);
                  }}
                  onFocus={() => setSearchSuggestionsOpen(true)}
                  placeholder="Product Search"
                  className="h-11 min-w-0 flex-1 border border-r-0 border-border bg-background px-3 text-sm outline-none focus:border-accent"
                  aria-label="Product search"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="flex h-11 w-12 items-center justify-center border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label="Search products"
                >
                  <Search className="h-5 w-5" />
                </button>
              </form>
              {searchSuggestionsOpen && searchQuery.trim().length >= MIN_CATALOG_SEARCH_LENGTH
                ? searchSuggestionsPanel
                : null}
            </div>
            <Link
              to="/cart"
              className="flex items-center justify-between px-4 py-3 text-foreground hover:text-accent hover:bg-secondary rounded-md transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="inline-flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Cart
              </span>
              <span className="inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs px-1">
                {cartCount}
              </span>
            </Link>
            {navItems.map((item) => (
              <div key={item.label} className="border-t border-border/40 first:border-t-0">
                <Link
                  to={item.href}
                  className="block rounded-md px-4 py-3 font-medium text-foreground transition-colors hover:bg-secondary hover:text-accent"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
                {item.items?.length ? (
                  <div className="grid grid-cols-1 gap-1 pb-2 pl-5 pr-3 sm:grid-cols-2">
                    {item.items.map((subItem) => (
                      <Link
                        key={subItem.label}
                        to={subItem.href}
                        className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {subItem.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {session ? null : (
              <Link
                to="/login"
                className="block px-4 py-3 text-foreground hover:text-accent hover:bg-secondary rounded-md transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
