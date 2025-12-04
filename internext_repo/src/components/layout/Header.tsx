import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const navItems = [
  { label: "About Internext", href: "/about" },
  {
    label: "Product Range",
    href: "/products",
    megaMenu: true,
    items: [
      { label: "Networking", href: "/products/networking" },
      { label: "Security", href: "/products/security" },
      { label: "Storage", href: "/products/storage" },
      { label: "Cloud Solutions", href: "/products/cloud" },
      { label: "Infrastructure", href: "/products/infrastructure" },
    ],
  },
  { label: "Brands", href: "/brands" },
  { label: "Tools & Resources", href: "/tools-resources" },
  { label: "Technical Services", href: "/technical-services" },
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
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-accent rounded-lg flex items-center justify-center">
                <span className="text-accent-foreground font-bold text-xl">IN</span>
              </div>
              <span className="text-2xl font-bold text-primary">Internext</span>
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
