import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Truck, Users, BarChart3, Headphones, Box, Zap, Shield, Award } from "lucide-react";
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
      "Live stock visibility through our reseller portal",
      "Back-order management and ETA tracking",
      "Special order capabilities for unique requirements",
    ],
  },
  {
    icon: Users,
    title: "Dedicated Account Management",
    points: [
      "Personal account manager for every partner",
      "Regular business reviews and planning sessions",
      "Direct access via phone, email, or chat",
      "Proactive communication on deals and opportunities",
    ],
  },
  {
    icon: BarChart3,
    title: "Business Growth Support",
    points: [
      "Category insights and market intelligence",
      "Sales training and product certification",
      "Joint marketing campaigns and MDF programs",
      "Lead generation and deal registration",
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
              Why Partner With Internext
            </h1>
            <p className="text-xl text-primary-foreground/80 leading-relaxed">
              More than just a distributor — we're your complete technology partner, 
              committed to helping your business grow and succeed.
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

      {/* Partner Tiers */}
      <section className="section-padding bg-secondary">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Partner Program Tiers
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Grow with us and unlock greater benefits at every level
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                tier: "Registered",
                color: "bg-slate-100",
                benefits: ["Access to reseller portal", "Standard pricing", "Email support", "Product training access"],
              },
              {
                tier: "Silver",
                color: "bg-slate-200",
                benefits: ["Better pricing tiers", "Dedicated account manager", "Phone support priority", "MDF access", "Quarterly reviews"],
              },
              {
                tier: "Gold",
                color: "bg-amber-100",
                benefits: ["Best-in-class pricing", "Senior account management", "Priority technical support", "Enhanced MDF", "Joint marketing", "Executive sponsorship"],
              },
            ].map((program) => (
              <div key={program.tier} className={`rounded-xl p-6 ${program.color}`}>
                <div className="flex items-center gap-2 mb-4">
                  <Award className="h-6 w-6 text-foreground" />
                  <h3 className="text-xl font-semibold text-foreground">{program.tier} Partner</h3>
                </div>
                <ul className="space-y-2">
                  {program.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-foreground/80 text-sm">
                      <Shield className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                      {benefit}
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
            Ready to Join Our Partner Network?
          </h2>
          <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
            Apply today and discover why hundreds of Australian resellers choose Internext.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" asChild>
              <Link to="/login/register">Apply Now</Link>
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
