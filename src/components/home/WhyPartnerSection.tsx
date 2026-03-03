import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

const partnerReasons = [
  {
    title: "Reliable supply flow",
    intro: "Reduce project friction with a supply model that supports day-to-day reseller delivery expectations.",
    points: [
      "Structured access to stocked product ranges",
      "Fulfilment support that helps shorten turnaround",
      "Cleaner category breadth across AV, print, UC, and networking",
    ],
  },
  {
    title: "Commercial support that is usable",
    intro: "The right distributor input should help you win, quote, and respond faster instead of creating more admin.",
    points: [
      "Pre-sales assistance when specification detail matters",
      "Sharper quoting support across multiple categories",
      "Account-level help that feels practical rather than generic",
    ],
  },
  {
    title: "Growth without carrying everything yourself",
    intro: "Extend your apparent capability without building the full operational footprint internally from day one.",
    points: [
      "Support broader customer segments and verticals",
      "Keep the customer relationship under your own brand",
      "Expand catalogue credibility without overextending operations",
    ],
  },
];

const WhyPartnerSection = () => {
  return (
    <section className="bg-background py-20 md:py-24">
      <div className="container-wide">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
              Why Partner
            </p>
            <h2 className="mt-3 text-3xl font-bold text-foreground md:text-4xl">
              Support that helps you look sharper in front of customers.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Internext is built around helping reseller businesses present stronger capability,
              cover more product ground, and move with less operational drag.
            </p>
          </div>

          <Link
            to="/about/why-partner"
            className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
          >
            See the full partner view <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {partnerReasons.map((reason, index) => (
            <article
              key={reason.title}
              className="group rounded-[1.5rem] border border-border/60 bg-card p-7 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated animate-fade-in-up"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-sm font-bold text-accent">
                0{index + 1}
              </div>

              <h3 className="mt-5 text-xl font-semibold text-foreground">{reason.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{reason.intro}</p>

              <ul className="mt-6 space-y-3">
                {reason.points.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                    <span className="text-sm leading-relaxed text-foreground/85">{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyPartnerSection;
