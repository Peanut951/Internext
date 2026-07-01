import { Link } from "react-router-dom";
import { Phone, Mail, MapPin } from "lucide-react";

const quickLinks = [
  { label: "About Us", path: "/about" },
  { label: "Product Range", path: "/products" },
  { label: "Technical Services", path: "/services" },
];

const supportLinks = [
  { label: "Reseller Portal", path: "/login" },
  { label: "Partner Program", path: "/contact" },
  { label: "Technical Support", path: "/support/faq" },
  { label: "Shipping & Delivery", path: "/support/shipping" },
  { label: "Returns & Refunds", path: "/support/returns" },
  { label: "Payment Security", path: "/support/payment-security" },
  { label: "Contact Us", path: "/contact" },
];

const legalLinks = [
  { label: "Privacy Policy", path: "/privacy" },
  { label: "Terms of Service", path: "/terms" },
  { label: "Consumer Guarantees", path: "/support/consumer-guarantees" },
];

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container-wide py-12 sm:py-16">
        <div className="grid grid-cols-1 gap-9 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          {/* Brand Column */}
          <div className="space-y-4">
            <div>
              <img
                src="/Internext Transparent Logo.png"
                alt="Internext"
                className="h-14 w-auto object-contain"
              />
            </div>

            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              Empowering Australian technology resellers with smarter distribution,
              better service, and stronger partnerships.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4 text-primary-foreground">Quick Links</h4>
            <ul className="space-y-3">
              {quickLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.path}
                    className="text-primary-foreground/70 hover:text-accent transition-colors text-sm"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-lg mb-4 text-primary-foreground">Support</h4>
            <ul className="space-y-3">
              {supportLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.path}
                    className="text-primary-foreground/70 hover:text-accent transition-colors text-sm"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-lg mb-4 text-primary-foreground">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-accent" />
                <Link to="/contact" className="text-primary-foreground/70 hover:text-accent transition-colors leading-tight">
                  <span className="block">1300 U R NEXT</span>
                  <span className="block text-xs">(1300 87 6398)</span>
                </Link>
              </li>

              <li className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-accent" />
                <Link to="/contact" className="text-primary-foreground/70 hover:text-accent transition-colors">
                  orders@internext.com.au
                </Link>
              </li>

              <li className="flex items-start gap-3 text-sm">
                <MapPin className="h-4 w-4 text-accent mt-0.5" />
                <span className="text-primary-foreground/70">
                  Unit 7, 7B/256 New Line Rd<br />
                  Dural NSW 2158
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-primary-foreground/20 mt-12 pt-8 space-y-6">
          <p className="max-w-4xl text-primary-foreground/60 text-sm leading-relaxed">
            Internext acknowledges the Traditional Custodians of the land upon which we work, live and blend.
            <br />
            We pay our respect to their Elders past and present and extend that respect to all Aboriginal and Torres
            Strait Islander peoples today.
          </p>

          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <p className="text-sm text-primary-foreground/50">
              &copy; {new Date().getFullYear()} Internext. All rights reserved.
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {legalLinks.map((item) => (
                <Link
                  key={item.label}
                  to={item.path}
                  className="text-primary-foreground/50 transition-colors hover:text-accent"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
