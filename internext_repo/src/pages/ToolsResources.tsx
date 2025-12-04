import Layout from "@/components/layout/Layout";
import { FileText, Calculator, BookOpen, Download, Video, Wrench } from "lucide-react";

const resources = [
  {
    icon: FileText,
    title: "Product Datasheets",
    description: "Technical specifications and feature comparisons for all products in our portfolio.",
    action: "Browse Library",
  },
  {
    icon: Calculator,
    title: "Pricing Tools",
    description: "Configure and quote solutions with real-time pricing and availability.",
    action: "Launch Tool",
  },
  {
    icon: BookOpen,
    title: "Sales Playbooks",
    description: "Comprehensive guides to help you position and sell technology solutions.",
    action: "View Playbooks",
  },
  {
    icon: Download,
    title: "Marketing Assets",
    description: "Co-branded collateral, email templates, and campaign materials.",
    action: "Download Assets",
  },
  {
    icon: Video,
    title: "Training Videos",
    description: "On-demand product training and certification preparation courses.",
    action: "Start Learning",
  },
  {
    icon: Wrench,
    title: "Configuration Guides",
    description: "Step-by-step guides for deploying and configuring solutions.",
    action: "View Guides",
  },
];

const quickLinks = [
  { title: "Partner Portal Login", description: "Access your dashboard, orders, and account tools" },
  { title: "RMA Request", description: "Submit return merchandise authorisation requests" },
  { title: "Deal Registration", description: "Register opportunities for additional discounts" },
  { title: "Demo Equipment", description: "Request demo units for customer presentations" },
];

const ToolsResources = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-hero py-20 md:py-28">
        <div className="container-wide">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
              Tools & Resources
            </h1>
            <p className="text-xl text-primary-foreground/80 leading-relaxed">
              Everything you need to sell, configure, and support technology solutions 
              for your customers.
            </p>
          </div>
        </div>
      </section>

      {/* Resources Grid */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">
            Partner Resources
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((resource) => (
              <div
                key={resource.title}
                className="bg-card rounded-xl p-8 shadow-card border border-border/50 card-hover group"
              >
                <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                  <resource.icon className="h-7 w-7 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {resource.title}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {resource.description}
                </p>
                <a
                  href="#"
                  className="inline-flex items-center text-accent hover:text-teal-dark transition-colors font-medium"
                >
                  {resource.action} →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="section-padding bg-secondary">
        <div className="container-wide">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">
            Quick Links
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickLinks.map((link) => (
              <a
                key={link.title}
                href="#"
                className="flex items-center justify-between bg-card rounded-lg p-6 border border-border/50 hover:shadow-card transition-shadow group"
              >
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors">
                    {link.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {link.description}
                  </p>
                </div>
                <span className="text-accent">→</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Support CTA */}
      <section className="py-16 bg-primary">
        <div className="container-wide text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
            Need assistance?
          </h2>
          <p className="text-primary-foreground/70 mb-6 max-w-xl mx-auto">
            Our partner support team is available to help you find the right resources.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-6 py-3 rounded-lg font-semibold hover:bg-teal-light transition-colors"
          >
            Contact Support
          </a>
        </div>
      </section>
    </Layout>
  );
};

export default ToolsResources;
