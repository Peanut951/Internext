import Layout from "@/components/layout/Layout";
import { Link, useParams } from "react-router-dom";
import { Download, Phone, FileText, GraduationCap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const categoryData: Record<string, { title: string; description: string; brands: string[] }> = {
  "displays": { title: "Displays", description: "Professional displays for business, education, and digital signage applications. From compact monitors to large-format screens.", brands: ["Samsung", "LG", "NEC", "BenQ"] },
  "projectors": { title: "Projectors", description: "High-performance projectors for meeting rooms, classrooms, and large venues. Laser and lamp-based solutions.", brands: ["Epson", "BenQ", "Optoma", "Sony"] },
  "digital-signage": { title: "Digital Signage", description: "Complete digital signage solutions including displays, media players, and content management software.", brands: ["Samsung", "LG", "NEC", "Philips"] },
  "interactive-panels": { title: "Interactive Panels", description: "Touch-enabled interactive displays for collaboration, education, and presentations.", brands: ["Samsung", "BenQ", "Promethean", "SMART"] },
  "mounts-brackets": { title: "Mounts & Brackets", description: "Professional mounting solutions for displays, projectors, and audio equipment.", brands: ["Atdec", "Ergotron", "Chief", "B-Tech"] },
  "collaboration": { title: "Collaboration Solutions", description: "Video conferencing, wireless presentation, and meeting room solutions.", brands: ["Logitech", "Poly", "Microsoft", "Zoom"] },
  "printers": { title: "Printers", description: "Business printers from desktop to production-level, including laser, inkjet, and speciality printing.", brands: ["HP", "Canon", "Epson", "Brother"] },
  "multifunction": { title: "Multifunction Devices", description: "All-in-one print, scan, copy, and fax solutions for businesses of all sizes.", brands: ["Ricoh", "Xerox", "Canon", "Konica Minolta"] },
  "scanners": { title: "Scanners", description: "Document scanners from portable units to high-speed production scanners.", brands: ["Fujitsu", "Canon", "Epson", "Brother"] },
  "shredders": { title: "Shredders", description: "Secure document destruction for personal, office, and industrial applications.", brands: ["Fellowes", "Rexel", "HSM", "Kobra"] },
  "office-technology": { title: "Office Technology", description: "Essential office equipment including laminators, binding machines, and presentation tools.", brands: ["Fellowes", "GBC", "Rexel", "3M"] },
  "ip-cameras": { title: "IP Cameras", description: "Network cameras for surveillance applications, from compact domes to PTZ cameras.", brands: ["Hikvision", "Dahua", "Axis", "Hanwha"] },
  "nvrs-recorders": { title: "NVRs & Recorders", description: "Network video recorders and storage solutions for surveillance systems.", brands: ["Hikvision", "Dahua", "Milestone", "Synology"] },
  "surveillance-kits": { title: "Surveillance Kits", description: "Complete CCTV packages for residential and commercial security.", brands: ["Hikvision", "Dahua", "Swann", "Uniden"] },
  "access-control": { title: "Access Control", description: "Door access systems including card readers, biometric devices, and controllers.", brands: ["Hikvision", "Dahua", "ZKTeco", "Gallagher"] },
  "intercom-systems": { title: "Intercom Systems", description: "Video intercom and door station solutions for residential and commercial buildings.", brands: ["Hikvision", "Dahua", "Aiphone", "Akuvox"] },
  "networking": { title: "Networking Hardware", description: "Enterprise networking including switches, routers, and network management solutions.", brands: ["Cisco", "Ubiquiti", "HP Aruba", "Netgear"] },
  "wireless": { title: "Wireless Solutions", description: "WiFi access points, controllers, and wireless infrastructure for all environments.", brands: ["Ubiquiti", "Ruckus", "Cisco Meraki", "HP Aruba"] },
  "storage": { title: "Storage & Backup", description: "Network attached storage, backup solutions, and enterprise storage systems.", brands: ["Synology", "QNAP", "Seagate", "Western Digital"] },
  "ups-power": { title: "UPS & Power", description: "Uninterruptible power supplies and power protection for critical systems.", brands: ["APC", "Eaton", "CyberPower", "Vertiv"] },
  "cables": { title: "Cables & Accessories", description: "Network cables, patch leads, and connectivity accessories.", brands: ["Commscope", "Belkin", "Dynamix", "4Cabling"] },
  "headsets": { title: "Headsets", description: "Professional headsets for call centres, offices, and unified communications.", brands: ["Jabra", "Poly", "Logitech", "EPOS"] },
  "conference": { title: "Conference Equipment", description: "Speakerphones, conference cameras, and room systems for meetings.", brands: ["Poly", "Logitech", "Jabra", "Yealink"] },
  "voip": { title: "VOIP Phones", description: "IP desk phones and video phones for business communications.", brands: ["Yealink", "Cisco", "Poly", "Grandstream"] },
  "byod": { title: "BYOD Solutions", description: "Wireless presentation and collaboration tools for bring-your-own-device environments.", brands: ["Barco", "Mersive", "Kramer", "Crestron"] },
};

const ProductCategory = () => {
  const { category } = useParams();
  const data = categoryData[category || ""] || { title: "Products", description: "Browse our product range", brands: [] };

  const placeholderProducts = [
    { name: "Product Model A", sku: "SKU-001", image: "" },
    { name: "Product Model B", sku: "SKU-002", image: "" },
    { name: "Product Model C", sku: "SKU-003", image: "" },
    { name: "Product Model D", sku: "SKU-004", image: "" },
    { name: "Product Model E", sku: "SKU-005", image: "" },
    { name: "Product Model F", sku: "SKU-006", image: "" },
  ];

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-hero py-16 md:py-24">
        <div className="container-wide">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
              {data.title}
            </h1>
            <p className="text-xl text-primary-foreground/80 leading-relaxed">
              {data.description}
            </p>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <aside className="lg:w-64 flex-shrink-0">
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 sticky top-24">
                <h3 className="font-semibold text-foreground mb-4">Key Brands</h3>
                <ul className="space-y-2">
                  {data.brands.map((brand) => (
                    <li key={brand}>
                      <a href="#" className="text-muted-foreground hover:text-accent transition-colors text-sm">
                        {brand}
                      </a>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-border mt-6 pt-6">
                  <h3 className="font-semibold text-foreground mb-4">Resources</h3>
                  <ul className="space-y-3">
                    <li>
                      <a href="#" className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors text-sm">
                        <Download className="h-4 w-4" /> Product Catalogue
                      </a>
                    </li>
                    <li>
                      <a href="#" className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors text-sm">
                        <FileText className="h-4 w-4" /> Spec Sheets
                      </a>
                    </li>
                    <li>
                      <a href="#" className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors text-sm">
                        <GraduationCap className="h-4 w-4" /> Training
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </aside>

            {/* Products */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <p className="text-muted-foreground">{placeholderProducts.length} products</p>
                <select className="bg-secondary border-0 rounded-md px-3 py-2 text-sm">
                  <option>Sort by: Featured</option>
                  <option>Name A-Z</option>
                  <option>Name Z-A</option>
                </select>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {placeholderProducts.map((product, idx) => (
                  <div
                    key={idx}
                    className="bg-card rounded-xl p-4 shadow-card border border-border/50 hover:shadow-elevated transition-shadow"
                  >
                    <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center">
                      <span className="text-muted-foreground text-sm">Product Image</span>
                    </div>
                    <h4 className="font-semibold text-foreground mb-1">{product.name}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{product.sku}</p>
                    <Button variant="outline" size="sm" className="w-full">
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-secondary">
        <div className="container-wide">
          <div className="bg-card rounded-2xl p-8 shadow-card flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Need Help Choosing?</h3>
              <p className="text-muted-foreground">
                Our technical specialists can help you find the right solution for your project.
              </p>
            </div>
            <Button variant="default" className="flex-shrink-0" asChild>
              <Link to="/contact">
                <Phone className="mr-2 h-4 w-4" /> Contact a Specialist
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ProductCategory;
