import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Navigation items for the site.  We mirror the structure of Alloys.com.au while
 * preserving our own brand.  In particular the Product Range dropdown lists
 * all of the top–level categories that Internext carries.  These map to
 * dynamic routes like `/products/:category` which are handled by
 * `ProductCategory.tsx`.  If you add or remove categories here, be sure to
 * update the corresponding `categories` list in `ProductsIndex.tsx` as well.
 */
const navItems = [
  { label: "About Internext", href: "/about" },
  {
    label: "Product Range",
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
  { label: "Login", href: "/login" },
];

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="container-wide py-4">
        <div className="flex items-center justify-between gap-8">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
<div className="flex items-center pr-6">
  <img
    src="/internext-logo.png"
    alt="Internext Logo"
    className="h-12 w-auto object-contain"
  />
</div>

          </Link>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products, brands..."
                className="pl-10 bg-secondary border-0 focus-visible:ring-accent"
              />
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => item.megaMenu && setActiveDropdown(item.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link
                  to={item.href}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-foreground hover:text-accent transition-colors"
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

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="lg:hidden mt-4 pb-4 border-t border-border pt-4 animate-fade-in">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search products, brands..."
                  className="pl-10 bg-secondary border-0"
                />
              </div>
            </div>
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
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
