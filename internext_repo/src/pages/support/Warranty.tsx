import Layout from "@/components/layout/Layout";
import { Shield, AlertCircle, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Warranty = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-hero py-16 md:py-20">
        <div className="container-wide">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
              Warranty & Returns
            </h1>
            <p className="text-xl text-primary-foreground/80">
              Our warranty and returns policies to protect you and your customers.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="max-w-4xl mx-auto">
            {/* Australian Consumer Law */}
            <div className="bg-secondary rounded-2xl p-8 mb-10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Shield className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-3">
                    Australian Consumer Law Compliance
                  </h2>
                  <p className="text-muted-foreground">
                    All products sold by Internext come with guarantees that cannot be excluded under 
                    the Australian Consumer Law. You are entitled to a replacement or refund for a major 
                    failure and compensation for any other reasonably foreseeable loss or damage. You are 
                    also entitled to have the goods repaired or replaced if the goods fail to be of 
                    acceptable quality and the failure does not amount to a major failure.
                  </p>
                </div>
              </div>
            </div>

            {/* DOA Policy */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-foreground mb-6">Dead on Arrival (DOA) Policy</h2>
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                <p className="text-muted-foreground mb-4">
                  If a product is found to be faulty within <strong>14 days</strong> of delivery, 
                  it may be eligible for DOA replacement. To qualify:
                </p>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full mt-2 flex-shrink-0" />
                    The product must have a manufacturing defect or arrive non-functional
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full mt-2 flex-shrink-0" />
                    All original packaging, accessories, and documentation must be included
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full mt-2 flex-shrink-0" />
                    The fault must be reported within the 14-day DOA period
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full mt-2 flex-shrink-0" />
                    The product must not show signs of physical damage or misuse
                  </li>
                </ul>
                <p className="text-sm text-muted-foreground">
                  DOA products will be replaced with the same model, subject to stock availability.
                </p>
              </div>
            </div>

            {/* Warranty Claims */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-foreground mb-6">How to Lodge a Warranty Claim</h2>
              <div className="grid md:grid-cols-4 gap-4">
                {[
                  { step: "1", title: "Gather Info", desc: "Product model, serial number, purchase date, and issue description" },
                  { step: "2", title: "Submit Request", desc: "Lodge claim through reseller portal or contact support" },
                  { step: "3", title: "Get RMA", desc: "Receive return authorisation and shipping instructions" },
                  { step: "4", title: "Resolution", desc: "Product repaired, replaced, or credited as applicable" },
                ].map((item) => (
                  <div key={item.step} className="bg-card rounded-xl p-5 shadow-card border border-border/50 text-center">
                    <div className="w-10 h-10 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-3">
                      {item.step}
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Returns Policy */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-foreground mb-6">Returns Policy</h2>
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                <h3 className="font-semibold text-foreground mb-3">Non-Faulty Returns</h3>
                <p className="text-muted-foreground mb-4">
                  We understand that sometimes products may need to be returned for reasons other than faults. 
                  Our policy for non-faulty returns is as follows:
                </p>
                <ul className="space-y-2 text-muted-foreground mb-4">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full mt-2 flex-shrink-0" />
                    Returns must be requested within 30 days of purchase
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full mt-2 flex-shrink-0" />
                    Products must be unopened and in original packaging
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full mt-2 flex-shrink-0" />
                    A restocking fee of 15-20% may apply
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full mt-2 flex-shrink-0" />
                    Return shipping costs are the responsibility of the customer
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full mt-2 flex-shrink-0" />
                    Some products may be excluded from returns (custom orders, special orders)
                  </li>
                </ul>

                <div className="bg-secondary rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    Software, consumables, and opened hygiene products (headsets, earphones) 
                    cannot be returned unless faulty.
                  </p>
                </div>
              </div>
            </div>

            {/* Exclusions */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-foreground mb-6">Warranty Exclusions</h2>
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                <p className="text-muted-foreground mb-4">
                  Warranties typically do not cover:
                </p>
                <ul className="grid md:grid-cols-2 gap-2 text-muted-foreground">
                  {[
                    "Physical damage or breakage",
                    "Damage from incorrect installation",
                    "Damage from power surges",
                    "Normal wear and tear",
                    "Consumable items (bulbs, batteries)",
                    "Software issues",
                    "Products with removed serial numbers",
                    "Damage from misuse or neglect",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-destructive rounded-full mt-2 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-primary rounded-2xl p-8 text-center">
              <FileText className="h-10 w-10 text-primary-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold text-primary-foreground mb-3">
                Need to Submit a Warranty Claim?
              </h2>
              <p className="text-primary-foreground/80 mb-6">
                Use our service request form to lodge your warranty or return request.
              </p>
              <Button variant="hero" asChild>
                <Link to="/services/request">
                  Submit Request <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Warranty;
