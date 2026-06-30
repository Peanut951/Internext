import Layout from "@/components/layout/Layout";
import { Users, Target, Award, Globe } from "lucide-react";

const stats = [
  { value: "7,500+", label: "Products in Catalogue" },
  { value: "Current", label: "Pricing & Availability" },
  { value: "AU-wide", label: "Delivery Coverage" },
  { value: "Secure", label: "Online Checkout" },
];

const values = [
  {
    icon: Users,
    title: "Clear Product Data",
    description: "We keep product pages focused on price, availability, size, ETA, and practical buying information.",
  },
  {
    icon: Target,
    title: "Reliable Fulfilment",
    description: "Shipping is calculated from the order contents and destination so customers see freight before payment.",
  },
  {
    icon: Award,
    title: "Transparent Pricing",
    description: "Customer pricing is shown including GST, while approved reseller accounts can access reseller pricing.",
  },
  {
    icon: Globe,
    title: "Practical Support",
    description: "Customers and resellers can contact our team for product questions, warranty help, and order support.",
  },
];

const About = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-hero py-20 md:py-28">
        <div className="container-wide">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
              About Internext
            </h1>
            <p className="text-xl text-primary-foreground/80 leading-relaxed">
              Internext helps Australian customers and technology resellers source products with current pricing,
              availability, secure checkout, and practical support.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-card border-b border-border">
        <div className="container-wide">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-accent mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Our Story
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Internext is built around a simple buying experience: search the catalogue, compare current
                  product information, add items to cart, and complete checkout with delivery calculated from
                  the order and destination.
                </p>
                <p>
                  The catalogue brings together thousands of technology products across print, networking,
                  communications, security, AV, computing, consumables, and services. Product pages are designed
                  to show the details buyers actually need: price, stock, ETA where available, size, warranty
                  context, and product imagery.
                </p>
                <p>
                  Registered customers can keep track of order history, while approved reseller accounts receive
                  access to reseller pricing and account tools. Guest checkout is also available for eligible
                  purchases.
                </p>
              </div>
            </div>
            <div className="bg-secondary rounded-2xl p-8 lg:p-12">
              <blockquote className="text-xl text-foreground italic leading-relaxed">
                "Our focus is straightforward: make technology purchasing easier to search, compare,
                price, order, and support."
              </blockquote>
              <div className="mt-6">
                <div className="font-semibold text-foreground">Internext Team</div>
                <div className="text-muted-foreground">Sales and support</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-padding bg-secondary">
        <div className="container-wide">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our Values
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value) => (
              <div key={value.title} className="text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <value.icon className="h-8 w-8 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {value.title}
                </h3>
                <p className="text-muted-foreground">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary">
        <div className="container-wide text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Ready to get started?
          </h2>
          <p className="text-primary-foreground/70 mb-8 max-w-xl mx-auto">
            Browse products, create an account for order history, or contact us for help choosing the
            right product.
          </p>
          <a 
            href="/contact" 
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-8 py-3 rounded-lg font-semibold hover:bg-teal-light transition-colors"
          >
            Contact Internext
          </a>
        </div>
      </section>
    </Layout>
  );
};

export default About;
