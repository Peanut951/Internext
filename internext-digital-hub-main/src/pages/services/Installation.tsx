import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Monitor, Shield, Network, Printer, Cable, ClipboardCheck, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const serviceDetails = [
  {
    icon: Monitor,
    title: "AV Installation",
    description: "Complete audio visual installation services for commercial, education, and retail environments.",
    includes: [
      "Display and projector mounting",
      "Video wall configuration",
      "Interactive panel installation",
      "Digital signage deployment",
      "Room system integration",
      "Cable management and concealment",
    ],
  },
  {
    icon: Shield,
    title: "Security System Deployment",
    description: "End-to-end security solutions from site assessment through to handover and training.",
    includes: [
      "IP camera installation",
      "NVR setup and configuration",
      "Access control systems",
      "Intercom installation",
      "System programming",
      "Client training",
    ],
  },
  {
    icon: Network,
    title: "Networking Setup",
    description: "Enterprise-grade network infrastructure installation and configuration.",
    includes: [
      "Switch and router installation",
      "WiFi access point deployment",
      "Network rack builds",
      "VLAN configuration",
      "Performance testing",
      "Documentation",
    ],
  },
  {
    icon: Printer,
    title: "Print & Device Rollout",
    description: "Efficient deployment of printer fleets and office technology.",
    includes: [
      "Device delivery and placement",
      "Network configuration",
      "Driver installation",
      "User training",
      "Asset tagging",
      "Decommissioning of old equipment",
    ],
  },
  {
    icon: ClipboardCheck,
    title: "Site Assessments",
    description: "Professional pre-project evaluation to ensure successful deployments.",
    includes: [
      "Physical site survey",
      "Infrastructure assessment",
      "Risk identification",
      "Scope documentation",
      "Project recommendations",
      "Cost estimation",
    ],
  },
  {
    icon: Cable,
    title: "Cabling Services",
    description: "Structured cabling and infrastructure wiring by certified technicians.",
    includes: [
      "Cat6/6A installation",
      "Fibre optic cabling",
      "Patch panel termination",
      "Cable certification",
      "Pathway installation",
      "Labelling and documentation",
    ],
  },
];

const Installation = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-hero py-20 md:py-28">
        <div className="container-wide">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
              Installation Services
            </h1>
            <p className="text-xl text-primary-foreground/80 leading-relaxed">
              Professional installation services delivered by experienced technicians 
              across Australia. We handle everything so your customers get the best experience.
            </p>
          </div>
        </div>
      </section>

      {/* Service Details */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="space-y-12">
            {serviceDetails.map((service, idx) => (
              <div
                key={service.title}
                className={`flex flex-col lg:flex-row gap-8 ${idx % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
              >
                <div className="lg:w-1/2">
                  <div className="bg-card rounded-2xl p-8 shadow-card border border-border/50 h-full">
                    <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mb-6">
                      <service.icon className="h-7 w-7 text-accent" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-4">{service.title}</h2>
                    <p className="text-muted-foreground mb-6">{service.description}</p>
                    <h4 className="font-semibold text-foreground mb-3">Service Includes:</h4>
                    <ul className="space-y-2">
                      {service.includes.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-muted-foreground text-sm">
                          <CheckCircle className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="lg:w-1/2">
                  <div className="aspect-video bg-muted rounded-2xl flex items-center justify-center h-full min-h-[300px]">
                    <span className="text-muted-foreground">Service Image</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Areas */}
      <section className="section-padding bg-secondary">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Service Areas
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We provide installation services across Australia with local technicians in major metro areas
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Canberra", "Gold Coast", "Newcastle"].map((city) => (
              <div key={city} className="bg-card rounded-lg p-4 text-center shadow-sm">
                <span className="font-medium text-foreground">{city}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-muted-foreground mt-6">
            Regional areas available on request. Contact us for coverage details.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary">
        <div className="container-wide text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
            Ready to Start a Project?
          </h2>
          <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
            Submit a service request and our team will prepare a detailed quote for your project.
          </p>
          <Button variant="hero" asChild>
            <Link to="/services/request">
              Submit Service Request <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
};

export default Installation;
