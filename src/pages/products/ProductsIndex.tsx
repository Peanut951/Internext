import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
// Import additional icons to represent the expanded category set.  We choose
// icons that roughly correspond to each top–level category.  You can swap
// these out for any other lucide icons if they better suit your brand.
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
} from "lucide-react";

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
    desc:
      "End‑to‑end IP video solutions including cameras, recorders, kits and accessories",
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
      { label: "Large Format Consumables", href: "/products/large-format-consumables" },
      { label: "Ribbon & Tape", href: "/products/ribbon-tape" },
      { label: "3D Filament", href: "/products/3d-filament" },
      { label: "Other Consumables", href: "/products/other-consumables" },
    ],
  },
  {
    icon: Scan,
    title: "Scanners",
    desc:
      "From portable scanners to high‑speed production units plus imaging accessories",
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
