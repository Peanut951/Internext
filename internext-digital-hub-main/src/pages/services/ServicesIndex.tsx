import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Wrench, FileText, ArrowRight, Monitor, Shield, Network, Printer, Cable, ClipboardCheck } from "lucide-react";

const services = [
  { icon: Monitor, title: "AV Installation", desc: "Professional installation of displays, projectors, and complete AV systems" },
  { icon: Shield, title: "Security Deployment", desc: "End-to-end security system installation including cameras, NVRs, and access control" },
  { icon: Network, title: "Network Setup", desc: "Enterprise networking infrastructure including switches, WiFi, and structured cabling" },
  { icon: Printer, title: "Print & Device Rollout", desc: "Fleet deployment, configuration, and managed print services implementation" },
  { icon: ClipboardCheck, title: "Site Assessments", desc: "Pre-project evaluation and detailed scope of works preparation" },
  { icon: Cable, title: "Cabling Services", desc: "Structured cabling, fibre optic, and infrastructure wiring" },
];

const ServicesIndex = () => {
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
              Professional installation and deployment services to support your 
              customer projects from planning through to completion.
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <div
                key={service.title}
                className="bg-card rounded-xl p-6 shadow-card border border-border/50"
              >
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <service.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{service.title}</h3>
                <p className="text-muted-foreground">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section-padding bg-secondary">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our streamlined process ensures smooth project delivery for you and your customers
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Enquiry", desc: "Submit project details via our service request form" },
              { step: "2", title: "Scoping", desc: "Our team prepares a detailed scope and quote" },
              { step: "3", title: "Scheduling", desc: "We coordinate installation timing with your customer" },
              { step: "4", title: "Delivery", desc: "Professional technicians complete the project" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="grid md:grid-cols-2 gap-8">
            <Link
              to="/services/installation"
              className="bg-card rounded-2xl p-8 shadow-card border border-border/50 hover:shadow-elevated transition-shadow group"
            >
              <Wrench className="h-10 w-10 text-accent mb-4" />
              <h3 className="text-2xl font-bold text-foreground mb-2 group-hover:text-accent transition-colors">
                Installation Services
              </h3>
              <p className="text-muted-foreground mb-4">
                Learn more about our professional installation capabilities and service areas.
              </p>
              <span className="inline-flex items-center text-accent font-semibold">
                View Details <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </Link>

            <Link
              to="/services/request"
              className="bg-card rounded-2xl p-8 shadow-card border border-border/50 hover:shadow-elevated transition-shadow group"
            >
              <FileText className="h-10 w-10 text-accent mb-4" />
              <h3 className="text-2xl font-bold text-foreground mb-2 group-hover:text-accent transition-colors">
                Service Request
              </h3>
              <p className="text-muted-foreground mb-4">
                Have a project? Submit a service request and we'll get back to you promptly.
              </p>
              <span className="inline-flex items-center text-accent font-semibold">
                Submit Request <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary">
        <div className="container-wide text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
            Ready to Start a Project?
          </h2>
          <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
            Book a project assessment with our technical services team.
          </p>
          <Link
            to="/services/request"
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-8 py-3 rounded-lg font-semibold hover:bg-teal-light transition-colors"
          >
            Book Assessment <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default ServicesIndex;
