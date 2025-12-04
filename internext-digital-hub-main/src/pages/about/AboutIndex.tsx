import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Users, Award, Target, Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const AboutIndex = () => {
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
              We're Australia's trusted technology distributor, dedicated to empowering 
              resellers with the products, services, and support they need to succeed.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">Our Mission</h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                Internext was founded with a simple mission: to be the distributor that 
                truly understands what resellers need. We bridge the gap between global 
                technology brands and Australian businesses, providing not just products, 
                but complete solutions.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                From our state-of-the-art warehouse facilities to our dedicated account 
                management team, every aspect of our operation is designed to make your 
                business more successful.
              </p>
            </div>
            <div className="bg-secondary rounded-2xl p-8">
              <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
                <span className="text-muted-foreground">Company Video</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-padding bg-secondary">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our Core Values
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              These principles guide everything we do at Internext
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Users, title: "Partnership First", desc: "We succeed when our partners succeed. Your growth is our priority." },
              { icon: Award, title: "Excellence", desc: "We strive for excellence in every interaction, every delivery, every day." },
              { icon: Target, title: "Reliability", desc: "Count on us for accurate information, timely delivery, and consistent service." },
              { icon: Heart, title: "Integrity", desc: "Honest communication and transparent business practices in all we do." },
            ].map((value) => (
              <div key={value.title} className="bg-card rounded-xl p-6 shadow-card">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <value.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{value.title}</h3>
                <p className="text-muted-foreground text-sm">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: "15+", label: "Years in Business" },
              { number: "500+", label: "Active Resellers" },
              { number: "50+", label: "Brand Partners" },
              { number: "10K+", label: "Products Available" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-accent mb-2">{stat.number}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="section-padding bg-secondary">
        <div className="container-wide">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Learn More About Us</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Why Partner With Us", desc: "Discover the benefits of becoming an Internext partner", href: "/about/why-partner" },
              { title: "Meet the Team", desc: "Get to know the people behind Internext", href: "/about/team" },
              { title: "Join Our Team", desc: "Explore career opportunities with us", href: "/about/careers" },
              { title: "Our Customers", desc: "See the industries and businesses we serve", href: "/about/customers" },
            ].map((link) => (
              <Link
                key={link.title}
                to={link.href}
                className="bg-card rounded-xl p-6 shadow-card hover:shadow-elevated transition-shadow group"
              >
                <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-accent transition-colors">
                  {link.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">{link.desc}</p>
                <span className="inline-flex items-center text-accent text-sm font-medium">
                  Learn more <ArrowRight className="ml-1 h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary">
        <div className="container-wide text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
            Ready to Partner With Us?
          </h2>
          <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
            Join hundreds of successful Australian resellers who trust Internext for their technology distribution needs.
          </p>
          <Button variant="hero" asChild>
            <Link to="/login/register">Become a Reseller</Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
};

export default AboutIndex;
