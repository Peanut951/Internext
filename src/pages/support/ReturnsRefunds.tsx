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
                  <p className="mt-3 leading-7 text-muted-foreground">
                    We accept change-of-mind returns subject to the following conditions:
                  </p>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                    {[
                      "Approval is required before returning goods.",
                      "Goods must be unopened, unused, uninstalled, unregistered, and in resaleable condition, with all original packaging and seals intact and all accessories, manuals, and documentation included.",
                      "We may request photos, video, serial numbers, or other information to help assess the return request.",
                      "Return freight is the customer's responsibility and must be sent using a trackable service.",
                      "Approved change-of-mind returns incur a 15% restocking fee.",
                      "Refunds are for the cost of the goods only, less the 15% restocking fee. Original delivery charges are not refundable.",
                    ].map((point) => (
                      <li key={point} className="flex gap-2">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 rounded-xl bg-secondary p-4">
                    <h3 className="font-semibold text-foreground">Australian Consumer Law</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      This policy applies only to change-of-mind returns and does not affect or limit any
                      rights you may have under the Australian Consumer Law (ACL).
                    </p>
                    <p className="mt-2 text-sm font-medium leading-6 text-foreground">
                      Our goods come with guarantees that cannot be excluded under the Australian Consumer Law.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Faulty &amp; DOA Products - Returns Policy
              </h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                This section applies only to products that are faulty or Dead on Arrival (DOA). It does not
                apply to change-of-mind returns.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {[
                {
                  title: "Dead on Arrival (DOA)",
                  points: [
                    "Contact us within 7 days of delivery to request an expedited DOA assessment if a product is faulty or not functioning when first received.",
                    "Return authorisation is required before returning the product.",
                    "We may ask you to complete basic troubleshooting before authorising a return.",
                    "We may request photos, video, serial numbers, or other information to help assess the issue.",
                    "Once authorised, we will provide return instructions.",
                    "The product may be tested and assessed when received to determine whether a fault exists.",
                    "If a fault is confirmed, we will provide the appropriate remedy in accordance with the ACL.",
                  ],
                },
                {
                  title: "Faulty Products",
                  points: [
                    "Products reported as faulty outside the 7-day DOA period will be assessed in accordance with the Australian Consumer Law.",
                    "We may require the product to be returned for testing and assessment before determining the appropriate remedy.",
                    "The remedy will depend on the nature of the problem and may include a repair, replacement, or refund, as required by the ACL.",
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
              <h2 className="text-xl font-semibold text-foreground">Physical Damage or Misuse</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                Consumer guarantees do not apply where the problem was caused by the customer's misuse or
                other actions. Examples may include accidental damage, improper installation, modification,
                unauthorised repair, liquid damage, or other customer-caused damage. We may inspect and test
                the product to determine the cause of the reported issue.
              </p>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-card sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <AlertCircle className="h-6 w-6 shrink-0 text-accent" />
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Return Freight</h2>
                  <div className="mt-3 space-y-3 leading-7 text-muted-foreground">
                    <p>
                      For products that can be posted or easily returned, the customer is responsible for
                      returning the product to us.
                    </p>
                    <p>
                      If we confirm that the product has a problem covered by the Australian Consumer Law,
                      we will reimburse the reasonable cost of return freight.
                    </p>
                    <p>
                      For products that are large, heavy, or difficult to return, we will arrange collection
                      or cover the reasonable cost of return.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-secondary p-5 sm:p-7">
              <h2 className="text-xl font-semibold text-foreground">Australian Consumer Law</h2>
              <div className="mt-3 space-y-3 leading-7 text-muted-foreground">
                <p className="font-medium text-foreground">
                  Our goods come with guarantees that cannot be excluded under the Australian Consumer Law.
                </p>
                <p>Nothing in this policy limits, excludes, or replaces your rights under the ACL.</p>
                <p>
                  The 7-day DOA period facilitates an expedited DOA assessment only. It does not limit your
                  rights under the Australian Consumer Law.
                </p>
                <p>
                  Where a product has a major problem, you may be entitled to choose a refund or replacement.
                  Where the problem is minor, we may repair the product within a reasonable time. The remedy
                  will be determined in accordance with the ACL.
                </p>
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
