import Layout from "@/components/layout/Layout";
import { BadgeCheck, FileCheck2, Handshake, Scale } from "lucide-react";

const ConsumerGuarantees = () => {
  return (
    <Layout>
      <section className="bg-gradient-hero py-14 sm:py-16 md:py-20">
        <div className="container-wide">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Australian Consumer Law
            </p>
            <h1 className="text-3xl font-bold text-primary-foreground sm:text-4xl md:text-5xl">
              Consumer Guarantees
            </h1>
            <p className="mt-4 text-base leading-7 text-primary-foreground/80 sm:text-lg">
              Products sold by Internext come with protections that cannot be excluded under Australian law.
            </p>
          </div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="mx-auto max-w-4xl space-y-7">
            <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-card sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                  <Scale className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Your Rights</h2>
                  <p className="mt-3 leading-7 text-muted-foreground">
                    Our goods come with guarantees that cannot be excluded under the Australian Consumer Law.
                    You are entitled to a replacement or refund for a major failure and compensation for
                    any other reasonably foreseeable loss or damage. You are also entitled to have goods
                    repaired or replaced if they fail to be of acceptable quality and the failure does not
                    amount to a major failure.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {[
                {
                  icon: BadgeCheck,
                  title: "Acceptable Quality",
                  body: "Products should be safe, durable, and free from defects when used as intended.",
                },
                {
                  icon: FileCheck2,
                  title: "Match Description",
                  body: "Products should match the product information displayed at the time of purchase.",
                },
                {
                  icon: Handshake,
                  title: "Remedies",
                  body: "Depending on the issue, remedies may include repair, replacement, refund, or credit.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-border/50 bg-card p-5 shadow-card">
                  <item.icon className="h-6 w-6 text-accent" />
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-border/50 bg-secondary p-5 sm:p-7">
              <h2 className="text-xl font-semibold text-foreground">Manufacturer Warranties</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                Manufacturer warranties operate in addition to your consumer guarantees. Warranty periods,
                service methods, and claim requirements can vary by brand and product. Internext will help
                direct eligible claims through the correct supplier or manufacturer process.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ConsumerGuarantees;
