import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, ChevronDown, ShoppingCart } from "lucide-react";
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
  { label: "Sales Tools", href: "/tools" },
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
];

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
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

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="container-wide py-4">
        <div className="flex items-center gap-6 xl:gap-8">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <div className="flex items-center pr-4 xl:pr-6">
              <img
                src="/internext-white-bg-cropped.png"
                alt="Internext Logo"
                className="h-12 w-auto object-contain"
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-2 xl:gap-3">
            {navItems.map((item) => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => item.megaMenu && setActiveDropdown(item.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link
                  to={item.href}
                  className="flex items-center gap-1 px-2 py-2 text-sm font-medium text-foreground transition-colors hover:text-accent xl:px-3"
                >
                  {item.label}
                  {item.megaMenu && <ChevronDown className="h-4 w-4" />}
                </Link>
                
                {item.megaMenu && activeDropdown === item.label && (
                  <div className="absolute top-full left-0 bg-card border border-border rounded-lg shadow-elevated p-4 min-w-[200px] animate-fade-in">
                    {item.items?.map((subItem) => (
                      <Link
                        key={subItem.label}
                        to={subItem.href}
                        className="block px-4 py-2 text-sm text-muted-foreground hover:text-accent hover:bg-secondary rounded-md transition-colors"
                      >
                        {subItem.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="ml-auto hidden lg:flex flex-none items-center border-l border-border/70 pl-5">
            <Button variant="outline" size="sm" className="h-9 rounded-full px-4" asChild>
              <Link to="/cart" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                Cart
                <span className="inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs px-1">
                  {cartCount}
                </span>
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-end gap-2 lg:hidden">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="lg:hidden mt-4 pb-4 border-t border-border pt-4 animate-fade-in">
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
