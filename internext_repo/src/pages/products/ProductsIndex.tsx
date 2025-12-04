import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Monitor, Printer, Shield, Network, Headphones, ArrowRight } from "lucide-react";

const categories = [
  {
    icon: Monitor,
    title: "Audio Visual",
    desc: "Displays, projectors, digital signage, and collaboration solutions",
    items: [
      { label: "Displays", href: "/products/displays" },
      { label: "Projectors", href: "/products/projectors" },
      { label: "Digital Signage", href: "/products/digital-signage" },
      { label: "Interactive Panels", href: "/products/interactive-panels" },
      { label: "Mounts & Brackets", href: "/products/mounts-brackets" },
      { label: "Collaboration Solutions", href: "/products/collaboration" },
    ],
  },
  {
    icon: Printer,
    title: "Print & Office",
    desc: "Printers, multifunction devices, scanners, and office equipment",
    items: [
      { label: "Printers", href: "/products/printers" },
      { label: "Multifunction Devices", href: "/products/multifunction" },
      { label: "Scanners", href: "/products/scanners" },
      { label: "Shredders", href: "/products/shredders" },
      { label: "Office Technology", href: "/products/office-technology" },
    ],
  },
  {
    icon: Shield,
    title: "Security & Surveillance",
    desc: "IP cameras, NVRs, access control, and intercom systems",
    items: [
      { label: "IP Cameras", href: "/products/ip-cameras" },
      { label: "NVRs & Recorders", href: "/products/nvrs-recorders" },
      { label: "Surveillance Kits", href: "/products/surveillance-kits" },
      { label: "Access Control", href: "/products/access-control" },
      { label: "Intercom Systems", href: "/products/intercom-systems" },
    ],
  },
  {
    icon: Network,
    title: "Networking & IT",
    desc: "Network infrastructure, wireless, storage, and power solutions",
    items: [
      { label: "Networking Hardware", href: "/products/networking" },
      { label: "Wireless Solutions", href: "/products/wireless" },
      { label: "Storage & Backup", href: "/products/storage" },
      { label: "UPS & Power", href: "/products/ups-power" },
      { label: "Cables & Accessories", href: "/products/cables" },
    ],
  },
  {
    icon: Headphones,
    title: "Unified Communications",
    desc: "Headsets, conference equipment, VOIP, and BYOD solutions",
    items: [
      { label: "Headsets", href: "/products/headsets" },
      { label: "Conference Equipment", href: "/products/conference" },
      { label: "VOIP Phones", href: "/products/voip" },
      { label: "BYOD Solutions", href: "/products/byod" },
    ],
  },
];

const ProductsIndex = () => {
  return (
    <Layout>
      {/* Hero */}
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

      {/* Categories */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="space-y-12">
            {categories.map((category) => (
              <div key={category.title} className="bg-card rounded-2xl p-8 shadow-card border border-border/50">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <category.icon className="h-7 w-7 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">{category.title}</h2>
                    <p className="text-muted-foreground">{category.desc}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {category.items.map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="bg-secondary rounded-lg p-4 text-center hover:bg-accent/10 transition-colors group"
                    >
                      <span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
                        {item.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
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
