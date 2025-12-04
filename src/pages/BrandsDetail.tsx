import Layout from "@/components/layout/Layout";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Download, FileText, GraduationCap, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

const brandData: Record<string, { name: string; description: string; categories: string[] }> = {
  "cisco": { name: "Cisco", description: "Global leader in networking, security, and collaboration solutions.", categories: ["Networking", "Security", "Collaboration"] },
  "hp": { name: "HP Enterprise", description: "Enterprise computing, storage, and hybrid cloud solutions.", categories: ["Infrastructure", "Storage", "Networking"] },
  "dell": { name: "Dell Technologies", description: "End-to-end IT infrastructure and client solutions.", categories: ["Infrastructure", "Storage", "Client Devices"] },
  "microsoft": { name: "Microsoft", description: "Cloud, productivity, and business applications leader.", categories: ["Software", "Cloud", "Collaboration"] },
  "samsung": { name: "Samsung", description: "Displays, digital signage, and enterprise mobility solutions.", categories: ["Displays", "Digital Signage", "Mobile"] },
  "hikvision": { name: "Hikvision", description: "World's leading provider of video surveillance products.", categories: ["IP Cameras", "NVRs", "Access Control"] },
};

const BrandsDetail = () => {
  const { brand } = useParams();
  const data = brandData[brand || ""] || { name: "Brand", description: "Leading technology vendor.", categories: [] };

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-hero py-16 md:py-24">
        <div className="container-wide">
          <div className="flex flex-col md:flex-row md:items-center gap-8">
            <div className="w-32 h-32 bg-card rounded-2xl flex items-center justify-center flex-shrink-0">
              <span className="text-3xl font-bold text-primary">{data.name.substring(0, 2).toUpperCase()}</span>
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
                {data.name}
              </h1>
              <p className="text-xl text-primary-foreground/80">
                {data.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Overview */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-foreground mb-6">About {data.name}</h2>
              <div className="prose max-w-none text-muted-foreground">
                <p className="mb-4">
                  Internext is proud to partner with {data.name}, bringing their industry-leading 
                  technology solutions to Australian resellers. As an authorised distributor, 
                  we provide access to the full {data.name} product range with competitive pricing, 
                  strong stock availability, and local support.
                </p>
                <p className="mb-4">
                  Our team includes certified {data.name} specialists who can assist with 
                  pre-sales consultation, solution design, and technical support. We also offer 
                  training opportunities and marketing support to help you grow your {data.name} business.
                </p>
              </div>

              <h3 className="text-xl font-bold text-foreground mt-8 mb-4">Product Categories</h3>
              <div className="flex flex-wrap gap-3">
                {data.categories.map((cat) => (
                  <span key={cat} className="bg-secondary text-foreground px-4 py-2 rounded-lg text-sm font-medium">
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50 mb-6">
                <h3 className="font-semibold text-foreground mb-4">Quick Links</h3>
                <ul className="space-y-3">
                  <li>
                    <a href="#" className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors text-sm">
                      <Download className="h-4 w-4" /> Product Catalogue
                    </a>
                  </li>
                  <li>
                    <a href="#" className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors text-sm">
                      <FileText className="h-4 w-4" /> Price List
                    </a>
                  </li>
                  <li>
                    <a href="#" className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors text-sm">
                      <GraduationCap className="h-4 w-4" /> Training & Certifications
                    </a>
                  </li>
                </ul>
              </div>

              <div className="bg-secondary rounded-2xl p-6">
                <h3 className="font-semibold text-foreground mb-4">Speak to a Specialist</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Our {data.name} specialists can help with product selection, pricing, and solution design.
                </p>
                <Button className="w-full" asChild>
                  <Link to="/contact">
                    <Phone className="mr-2 h-4 w-4" /> Contact Us
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="section-padding bg-secondary">
        <div className="container-wide">
          <h2 className="text-2xl font-bold text-foreground mb-8">Featured {data.name} Products</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card rounded-xl p-4 shadow-card">
                <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">Product Image</span>
                </div>
                <h4 className="font-semibold text-foreground mb-1">{data.name} Product {i}</h4>
                <p className="text-sm text-muted-foreground mb-3">SKU-00{i}</p>
                <Button variant="outline" size="sm" className="w-full">View Details</Button>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button variant="default" asChild>
              <Link to="/products">
                View All {data.name} Products <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary">
        <div className="container-wide text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
            Ready to Order {data.name} Products?
          </h2>
          <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
            Log in to your reseller account to view pricing and stock availability.
          </p>
          <Button variant="hero" asChild>
            <Link to="/login">Access Reseller Portal</Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
};

export default BrandsDetail;
