import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Monitor, Shield, Printer, Network, Building2, GraduationCap, Stethoscope, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

const industries = [
  {
    icon: Building2,
    title: "Corporate & Enterprise",
    desc: "Supporting large organisations with comprehensive technology solutions, from unified communications to complete AV fit-outs.",
  },
  {
    icon: GraduationCap,
    title: "Education",
    desc: "Empowering schools and universities with interactive displays, collaboration tools, and campus-wide networking solutions.",
  },
  {
    icon: Stethoscope,
    title: "Healthcare",
    desc: "Providing hospitals and medical facilities with secure, reliable technology for patient care and administration.",
  },
  {
    icon: ShoppingBag,
    title: "Retail",
    desc: "Equipping retailers with digital signage, POS systems, and security solutions to enhance customer experience.",
  },
];

const successStories = [
  {
    company: "National Retail Chain",
    industry: "Retail",
    challenge: "Needed to upgrade digital signage across 150+ stores nationally",
    solution: "Deployed comprehensive digital signage solution with centralised management",
    result: "30% increase in promotional effectiveness",
  },
  {
    company: "Major University",
    industry: "Education",
    challenge: "Required interactive collaboration spaces for hybrid learning",
    solution: "Installed interactive panels and video conferencing in 50 classrooms",
    result: "Improved student engagement and remote participation",
  },
  {
    company: "Healthcare Network",
    industry: "Healthcare",
    challenge: "Aging surveillance system needed replacement across 5 facilities",
    solution: "Implemented modern IP camera system with unified management",
    result: "Enhanced security and reduced monitoring costs",
  },
];

const Customers = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-hero py-20 md:py-28">
        <div className="container-wide">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
              Our Customers
            </h1>
            <p className="text-xl text-primary-foreground/80 leading-relaxed">
              We partner with resellers serving diverse industries across Australia, 
              providing the technology solutions that power business success.
            </p>
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Industries We Serve
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our partners support organisations across every sector with tailored technology solutions
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {industries.map((industry) => (
              <div
                key={industry.title}
                className="bg-card rounded-xl p-6 shadow-card border border-border/50 flex gap-4"
              >
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <industry.icon className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{industry.title}</h3>
                  <p className="text-muted-foreground">{industry.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Areas */}
      <section className="section-padding bg-secondary">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Technology Solutions
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From audio visual to security, we provide the products our partners need
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Monitor, label: "Audio Visual" },
              { icon: Shield, label: "Security" },
              { icon: Printer, label: "Print & Office" },
              { icon: Network, label: "Networking" },
            ].map((area) => (
              <div key={area.label} className="bg-card rounded-xl p-6 shadow-card text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <area.icon className="h-8 w-8 text-accent" />
                </div>
                <h3 className="font-semibold text-foreground">{area.label}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Success Stories
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Real results from real partnerships
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {successStories.map((story, idx) => (
              <div
                key={idx}
                className="bg-card rounded-xl p-6 shadow-card border border-border/50"
              >
                <span className="text-xs font-medium text-accent uppercase tracking-wide">
                  {story.industry}
                </span>
                <h3 className="text-xl font-semibold text-foreground mt-2 mb-4">{story.company}</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">Challenge</p>
                    <p className="text-muted-foreground">{story.challenge}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Solution</p>
                    <p className="text-muted-foreground">{story.solution}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Result</p>
                    <p className="text-accent">{story.result}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary">
        <div className="container-wide text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
            Ready to Grow With Us?
          </h2>
          <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
            Join our partner network and access the products, support, and expertise 
            to serve your customers better.
          </p>
          <Button variant="hero" asChild>
            <Link to="/login/register">Become a Partner</Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
};

export default Customers;
