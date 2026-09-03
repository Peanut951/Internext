import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle, FileText, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const ReturnsRefunds = () => {
  return (
    <Layout>
      <section className="bg-gradient-hero py-14 sm:py-16 md:py-20">
        <div className="container-wide">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Customer Care
            </p>
            <h1 className="text-3xl font-bold text-primary-foreground sm:text-4xl md:text-5xl">
              Returns & Refunds
            </h1>
            <p className="mt-4 text-base leading-7 text-primary-foreground/80 sm:text-lg">
              Return conditions for IP technology products, security hardware, networking equipment,
              print consumables, software, accessories, and special-order distribution stock.
            </p>
          </div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="mx-auto max-w-4xl space-y-8">
            <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-card sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                  <RotateCcw className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Change of Mind Returns</h2>
                  <div className="mt-3 space-y-3 leading-7 text-muted-foreground">
                    <p>
                      We do not accept returns, refunds, or exchanges where a customer has changed their
                      mind, selected the incorrect product, ordered an incorrect size or specification, or
                      subsequently determines that the goods are no longer required or suitable for their
                      application.
                    </p>
                    <p>
                      Customers are responsible for ensuring that products are suitable for their intended
                      application before placing an order. We recommend confirming product specifications
                      and compatibility before purchase if there is any uncertainty. This does not limit any
                      guarantee that goods will be fit for a purpose disclosed to us before purchase where the
                      customer reasonably relied on our skill or judgement.
                    </p>
                    <p>
                      Change-of-mind returns are not accepted, including where goods are unopened, unused,
                      or in their original packaging.
                    </p>
                    <p className="font-medium text-foreground">
                      This policy does not exclude, restrict, or modify any rights or remedies that cannot be
                      excluded under the Australian Consumer Law.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {[
                {
                  title: "Faulty or DOA Items",
                  points: [
                    "Report faults as soon as possible after discovery.",
                    "Our dead-on-arrival process applies to faults reported within 14 days of delivery, but this does not limit rights that may apply for a longer period under Australian Consumer Law.",
                    "We may request photos, serial numbers, diagnostic logs, configuration notes, or vendor troubleshooting results.",
                    "The available remedy depends on whether the failure is major or minor and the requirements of Australian Consumer Law.",
                  ],
                },
                {
                  title: "Australian Consumer Law",
                  points: [
                    "Consumer guarantees apply independently of this change-of-mind policy and any manufacturer warranty.",
                    "For a major failure, the customer may be entitled to choose a refund or replacement.",
                    "For a minor failure, we may provide a repair within a reasonable time or another remedy required by law.",
                    "Goods that are faulty, unsafe, materially different from their description, or otherwise fail a consumer guarantee will be handled in accordance with Australian Consumer Law.",
                  ],
                },
              ].map((section) => (
                <div key={section.title} className="rounded-2xl border border-border/50 bg-card p-5 shadow-card sm:p-6">
                  <h3 className="text-lg font-semibold text-foreground">{section.title}</h3>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                    {section.points.map((point) => (
                      <li key={point} className="flex gap-2">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-card sm:p-7">
              <h2 className="text-xl font-semibold text-foreground">Refund Timing</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                Where a refund is required under Australian Consumer Law, it will be processed after the
                claim has been assessed and any required returned goods have been received. Refunds are
                returned to the original payment method where possible. Bank and payment provider processing
                times may vary.
              </p>
            </div>

            <div className="rounded-2xl border border-border/50 bg-secondary p-5 sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <AlertCircle className="h-6 w-6 shrink-0 text-accent" />
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Product-Specific Considerations</h2>
                  <p className="mt-2 leading-7 text-muted-foreground">
                    Software licences, subscriptions, activated cloud services, print consumables, configured
                    or installed hardware, hygiene-sensitive items, custom orders, project stock, and
                    special-order products can have product-specific warranty and assessment requirements.
                    These requirements do not exclude any rights or remedies available under Australian
                    Consumer Law.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-primary p-6 text-center sm:p-8">
              <FileText className="mx-auto h-9 w-9 text-primary-foreground" />
              <h2 className="mt-4 text-xl font-semibold text-primary-foreground">Need to Start a Return?</h2>
              <p className="mx-auto mt-3 max-w-2xl leading-7 text-primary-foreground/75">
                Send us your order details, product code, serial number where applicable, and a clear
                description of the issue or return reason.
              </p>
              <Button variant="hero" className="mt-6" asChild>
                <Link to="/contact">Contact Internext</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ReturnsRefunds;
