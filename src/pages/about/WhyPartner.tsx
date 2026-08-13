import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Truck, Headphones, Box, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const benefits = [
  {
    icon: Truck,
    title: "Fast, Reliable Fulfilment",
    points: [
      "Same-day dispatch for orders before 2pm",
      "National delivery network with metro and regional coverage",
      "Real-time tracking and delivery notifications",
      "Flexible shipping options to suit your needs",
    ],
  },
  {
    icon: Box,
    title: "Strong Stock Availability",
    points: [
      "Australia's largest technology distribution warehouse",
      "Stock visibility through our reseller portal",
      "Back-order management and ETA tracking",
      "Special order capabilities for unique requirements",
    ],
  },
  {
    icon: Headphones,
    title: "Technical Expertise",
    points: [
      "Pre-sales technical consultation",
      "Solution design and configuration support",
      "Installation and deployment services",
      "Post-sales technical support",
    ],
  },
  {
    icon: Zap,
    title: "Easy Online Ordering",
    points: [
      "24/7 online ordering portal",
      "Real-time pricing and availability",
      "Order history and reorder functionality",
      "Integration options for your systems",
    ],
  },
];

const WhyPartner = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-hero py-20 md:py-28">
        <div className="container-wide">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
              Why Resellers Choose Internext
            </h1>
            <p className="text-xl text-primary-foreground/80 leading-relaxed">
              Technology products, online ordering, fulfilment, and support for Australian resellers.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="bg-card rounded-xl p-6 shadow-card border border-border/50"
              >
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <benefit.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4">{benefit.title}</h3>
                <ul className="space-y-2">
                  {benefit.points.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-muted-foreground text-sm">
                      <span className="w-1.5 h-1.5 bg-accent rounded-full mt-2 flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary">
        <div className="container-wide text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
            Apply for Reseller Access
          </h2>
          <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
            Submit your business details for review and access to the Internext reseller portal.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" asChild>
              <Link to="/login/register">Apply as a Reseller</Link>
            </Button>
            <Button variant="hero-outline" asChild>
              <Link to="/contact">Contact Sales</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default WhyPartner;
