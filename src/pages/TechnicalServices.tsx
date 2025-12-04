import Layout from "@/components/layout/Layout";
import { Settings, Shield, Cloud, Headphones, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const services = [
  {
    icon: Settings,
    title: "Pre-Sales Engineering",
    description: "Expert technical consultation to help you design the right solution for your customers.",
    features: ["Solution architecture", "Product recommendations", "Proof of concept support", "Technical proposals"],
  },
  {
    icon: Shield,
    title: "Security Assessments",
    description: "Comprehensive security audits and recommendations for your customers' environments.",
    features: ["Vulnerability assessments", "Compliance reviews", "Security roadmaps", "Risk analysis"],
  },
  {
    icon: Cloud,
    title: "Cloud Migration",
    description: "End-to-end support for migrating workloads to cloud and hybrid environments.",
    features: ["Migration planning", "Workload assessment", "Implementation support", "Post-migration optimisation"],
  },
  {
    icon: Headphones,
    title: "Technical Support",
    description: "Dedicated support team to help resolve technical issues and answer product questions.",
    features: ["Priority support queue", "Escalation management", "Vendor liaison", "Knowledge base access"],
  },
  {
    icon: Users,
    title: "Training & Certification",
    description: "Comprehensive training programs to build your team's technical expertise.",
    features: ["Product training", "Certification prep", "Custom workshops", "Online learning"],
  },
  {
    icon: Zap,
    title: "Professional Services",
    description: "Hands-on implementation and deployment services for complex projects.",
    features: ["Project management", "Installation services", "Configuration assistance", "Documentation"],
  },
];

const TechnicalServices = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-hero py-20 md:py-28">
        <div className="container-wide">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
              Technical Services
            </h1>
            <p className="text-xl text-primary-foreground/80 leading-relaxed">
              From pre-sales engineering to post-deployment support, our technical 
              experts are here to help you deliver exceptional solutions.
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How we support you
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our team of certified engineers and technical specialists provide 
              comprehensive support throughout the entire project lifecycle.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <div
                key={service.title}
                className="bg-card rounded-xl p-8 shadow-card border border-border/50"
              >
                <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mb-6">
                  <service.icon className="h-7 w-7 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {service.title}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {service.description}
                </p>
                <ul className="space-y-2">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="w-1.5 h-1.5 bg-accent rounded-full" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="section-padding bg-secondary">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Get expert assistance
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Our technical services team is ready to help you scope, design, 
                and deliver your next project. Whether you need pre-sales support 
                or hands-on implementation assistance, we've got you covered.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Headphones className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Technical Hotline</div>
                    <div className="text-muted-foreground">1300 123 456 (Option 2)</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Zap className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Response Time</div>
                    <div className="text-muted-foreground">Under 4 hours for priority requests</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-2xl p-8 shadow-card border border-border/50">
              <h3 className="text-xl font-semibold text-foreground mb-6">
                Request Technical Support
              </h3>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                    placeholder="you@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Service Required
                  </label>
                  <select className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-accent focus:border-accent outline-none">
                    <option>Pre-Sales Engineering</option>
                    <option>Technical Support</option>
                    <option>Professional Services</option>
                    <option>Training</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-accent focus:border-accent outline-none resize-none"
                    placeholder="Describe your requirements..."
                  />
                </div>
                <Button type="submit" className="w-full" variant="accent">
                  Submit Request
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default TechnicalServices;
