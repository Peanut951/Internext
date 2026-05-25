import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, ChevronDown, ShoppingCart, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/hooks/use-auth-session";

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
  { label: "Brands", href: "/brands" },
  { label: "Technical Services", href: "/services" },
  {
    label: "Support",
    href: "#",
    megaMenu: true,
    items: [
      { label: "FAQ", href: "/support/faq" },
      { label: "Shipping & Delivery", href: "/support/shipping" },
      { label: "Warranty & Returns", href: "/support/warranty" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms & Conditions", href: "/terms" },
    ],
  },
  { label: "Contact Us", href: "/contact" },
];

const Header = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
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
    const intervalId = window.setInterval(syncCart, 1200);

    return () => {
      window.removeEventListener("storage", syncCart);
      window.removeEventListener("focus", syncCart);
      window.clearInterval(intervalId);
    };
  }, []);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      navigate("/products");
      return;
    }

    navigate(`/products/search?q=${encodeURIComponent(query)}&page=1`);
    setMobileMenuOpen(false);
  };

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

          <form
            onSubmit={submitSearch}
            className="hidden min-w-0 items-stretch md:flex"
            role="search"
          >
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Product Search"
              className="h-11 min-w-0 flex-1 rounded-l-none border border-r-0 border-border bg-background px-4 text-sm outline-none transition focus:border-accent"
              aria-label="Product search"
            />
            <button
              type="submit"
              className="flex h-11 w-16 items-center justify-center border border-border bg-background text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Search products"
            >
              <Search className="h-5 w-5" />
            </button>
          </form>

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
            <form onSubmit={submitSearch} className="mb-3 flex items-stretch px-4" role="search">
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Product Search"
                className="h-11 min-w-0 flex-1 border border-r-0 border-border bg-background px-3 text-sm outline-none focus:border-accent"
                aria-label="Product search"
              />
              <button
                type="submit"
                className="flex h-11 w-12 items-center justify-center border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Search products"
              >
                <Search className="h-5 w-5" />
              </button>
            </form>
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
              <Link
                key={item.label}
                to={item.href}
                className="block px-4 py-3 text-foreground hover:text-accent hover:bg-secondary rounded-md transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
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
