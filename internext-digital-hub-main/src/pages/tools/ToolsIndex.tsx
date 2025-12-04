import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { BookOpen, Search, FileText, ArrowRight } from "lucide-react";

const tools = [
  {
    icon: BookOpen,
    title: "Blog & Insights",
    desc: "Stay informed with product guides, promotions, sales tips, and industry updates from our team.",
    href: "/tools/blog",
    cta: "Read Articles",
  },
  {
    icon: Search,
    title: "Consumables Finder",
    desc: "Find the right ink, toner, or supplies for any printer. Search by brand, model, or cartridge type.",
    href: "/tools/consumables-finder",
    cta: "Search Consumables",
  },
  {
    icon: FileText,
    title: "Product Category Guide",
    desc: "Download our comprehensive product guide or request a printed copy for your sales team.",
    href: "/tools/product-guide",
    cta: "Get the Guide",
  },
];

const ToolsIndex = () => {
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
              Everything you need to support your sales, find the right products, 
              and stay informed about the latest technology trends.
            </p>
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="grid md:grid-cols-3 gap-8">
            {tools.map((tool) => (
              <div
                key={tool.title}
                className="bg-card rounded-xl p-8 shadow-card border border-border/50 flex flex-col"
              >
                <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mb-6">
                  <tool.icon className="h-7 w-7 text-accent" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">{tool.title}</h2>
                <p className="text-muted-foreground mb-6 flex-1">{tool.desc}</p>
                <Link
                  to={tool.href}
                  className="inline-flex items-center gap-2 text-accent font-semibold hover:underline"
                >
                  {tool.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Resources */}
      <section className="section-padding bg-secondary">
        <div className="container-wide">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Quick Links</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              "Product Datasheets",
              "Marketing Assets",
              "Price Lists",
              "Warranty Information",
              "RMA Forms",
              "Vendor Programs",
              "Training Calendar",
              "Demo Requests",
            ].map((link) => (
              <a
                key={link}
                href="#"
                className="bg-card rounded-lg p-4 text-center hover:shadow-card transition-shadow"
              >
                <span className="text-sm font-medium text-foreground hover:text-accent">
                  {link}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ToolsIndex;
