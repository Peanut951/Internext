import Layout from "@/components/layout/Layout";
import { Users, Target, Award, Globe } from "lucide-react";

const stats = [
  { value: "15+", label: "Years in Business" },
  { value: "500+", label: "Active Partners" },
  { value: "25+", label: "Premium Brands" },
  { value: "$50M+", label: "Annual Revenue" },
];

const values = [
  {
    icon: Users,
    title: "Partner First",
    description: "Every decision we make starts with how it benefits our reseller partners. Your success drives our business.",
  },
  {
    icon: Target,
    title: "Excellence",
    description: "We hold ourselves to the highest standards in service, support, and delivery across every interaction.",
  },
  {
    icon: Award,
    title: "Integrity",
    description: "Transparent pricing, honest communication, and ethical business practices are non-negotiable.",
  },
  {
    icon: Globe,
    title: "Innovation",
    description: "Constantly evolving our services and technology offerings to keep our partners ahead of the curve.",
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
              For over 15 years, Internext has been Australia's trusted technology 
              distributor, building lasting partnerships with resellers nationwide.
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
                  Founded in 2008 in Sydney, Internext began with a simple mission: 
                  to be the distributor that Australian IT resellers actually wanted 
                  to work with.
                </p>
                <p>
                  We saw an industry dominated by transactional relationships and 
                  decided to do things differently. By investing in our people, 
                  building genuine partnerships, and maintaining the highest service 
                  standards, we've grown to become one of Australia's most respected 
                  technology distributors.
                </p>
                <p>
                  Today, we partner with over 500 resellers across Australia, 
                  representing 25+ premium technology brands. But our success isn't 
                  measured in numbers — it's measured in the success of our partners.
                </p>
              </div>
            </div>
            <div className="bg-secondary rounded-2xl p-8 lg:p-12">
              <blockquote className="text-xl text-foreground italic leading-relaxed">
                "We don't just distribute products. We distribute success to our 
                partners through genuine support, expert guidance, and a commitment 
                to their growth."
              </blockquote>
              <div className="mt-6">
                <div className="font-semibold text-foreground">Michael Chen</div>
                <div className="text-muted-foreground">Founder & CEO</div>
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
            Ready to partner with us?
          </h2>
          <p className="text-primary-foreground/70 mb-8 max-w-xl mx-auto">
            Join 500+ Australian technology resellers who trust Internext as their 
            distribution partner.
          </p>
          <a 
            href="/contact" 
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-8 py-3 rounded-lg font-semibold hover:bg-teal-light transition-colors"
          >
            Become a Partner
          </a>
        </div>
      </section>
    </Layout>
  );
};

export default About;
