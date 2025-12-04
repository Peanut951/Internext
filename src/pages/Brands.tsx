import Layout from "@/components/layout/Layout";
import { ExternalLink } from "lucide-react";

const brandCategories = [
  {
    category: "Networking",
    brands: [
      { name: "Cisco", description: "Enterprise networking and security solutions", tier: "Platinum" },
      { name: "Juniper", description: "High-performance networking infrastructure", tier: "Gold" },
      { name: "Aruba", description: "Wireless and edge networking solutions", tier: "Gold" },
    ],
  },
  {
    category: "Security",
    brands: [
      { name: "Fortinet", description: "Next-gen firewall and security fabric", tier: "Platinum" },
      { name: "Palo Alto", description: "Advanced cybersecurity platform", tier: "Gold" },
      { name: "CrowdStrike", description: "Endpoint protection and threat intelligence", tier: "Silver" },
    ],
  },
  {
    category: "Infrastructure",
    brands: [
      { name: "Dell Technologies", description: "Servers, storage, and data protection", tier: "Platinum" },
      { name: "HPE", description: "Enterprise computing and hybrid cloud", tier: "Platinum" },
      { name: "Lenovo", description: "Data centre and edge computing", tier: "Gold" },
    ],
  },
  {
    category: "Cloud & Software",
    brands: [
      { name: "Microsoft", description: "Cloud, productivity, and business applications", tier: "Platinum" },
      { name: "VMware", description: "Virtualisation and cloud infrastructure", tier: "Gold" },
      { name: "Veeam", description: "Backup and disaster recovery", tier: "Gold" },
    ],
  },
];

const getTierColor = (tier: string) => {
  switch (tier) {
    case "Platinum":
      return "bg-slate-100 text-slate-700";
    case "Gold":
      return "bg-amber-50 text-amber-700";
    case "Silver":
      return "bg-gray-100 text-gray-600";
    default:
      return "bg-secondary text-secondary-foreground";
  }
};

const Brands = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-hero py-20 md:py-28">
        <div className="container-wide">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
              Our Brand Partners
            </h1>
            <p className="text-xl text-primary-foreground/80 leading-relaxed">
              We've partnered with the world's leading technology vendors to bring 
              you a comprehensive portfolio of enterprise solutions.
            </p>
          </div>
        </div>
      </section>

      {/* Brands Grid */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          {brandCategories.map((category) => (
            <div key={category.category} className="mb-16 last:mb-0">
              <h2 className="text-2xl font-bold text-foreground mb-8 pb-4 border-b border-border">
                {category.category}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {category.brands.map((brand) => (
                  <div
                    key={brand.name}
                    className="bg-card rounded-xl p-6 shadow-card border border-border/50 hover:shadow-elevated transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-xl font-semibold text-foreground">
                        {brand.name}
                      </h3>
                      <span className={`text-xs font-medium px-3 py-1 rounded-full ${getTierColor(brand.tier)}`}>
                        {brand.tier}
                      </span>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      {brand.description}
                    </p>
                    <a
                      href="#"
                      className="inline-flex items-center gap-2 text-accent hover:text-teal-dark transition-colors text-sm font-medium"
                    >
                      View Products
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Become a Vendor */}
      <section className="py-16 bg-secondary">
        <div className="container-wide text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Interested in partnering with Internext?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            We're always looking for innovative technology vendors to expand our portfolio.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-navy-light transition-colors"
          >
            Contact Our Vendor Team
          </a>
        </div>
      </section>
    </Layout>
  );
};

export default Brands;
