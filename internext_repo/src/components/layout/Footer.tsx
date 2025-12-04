import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Linkedin, Twitter } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container-wide py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-accent-foreground font-bold text-xl">IN</span>
              </div>
              <span className="text-2xl font-bold">Internext</span>
            </div>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              Empowering Australian technology resellers with smarter distribution, 
              better service, and stronger partnerships.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-primary-foreground/70 hover:text-accent transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" className="text-primary-foreground/70 hover:text-accent transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {["About Us", "Brands", "Product Range", "Tools & Resources", "Technical Services"].map((link) => (
                <li key={link}>
                  <Link 
                    to={`/${link.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                    className="text-primary-foreground/70 hover:text-accent transition-colors text-sm"
                  >
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Support</h4>
            <ul className="space-y-3">
              {["Reseller Portal", "Partner Program", "Technical Support", "RMA Process", "Contact Us"].map((link) => (
                <li key={link}>
                  <a 
                    href="#"
                    className="text-primary-foreground/70 hover:text-accent transition-colors text-sm"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-accent" />
                <a href="tel:1300123456" className="text-primary-foreground/70 hover:text-accent transition-colors">
                  1300 123 456
                </a>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-accent" />
                <a href="mailto:sales@internext.com.au" className="text-primary-foreground/70 hover:text-accent transition-colors">
                  sales@internext.com.au
                </a>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <MapPin className="h-4 w-4 text-accent mt-0.5" />
                <span className="text-primary-foreground/70">
                  Level 10, 123 Business Street<br />
                  Sydney NSW 2000
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-primary-foreground/50 text-sm">
            © {new Date().getFullYear()} Internext. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="text-primary-foreground/50 hover:text-accent transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-primary-foreground/50 hover:text-accent transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
