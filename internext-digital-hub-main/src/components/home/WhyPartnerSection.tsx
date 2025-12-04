import { CheckCircle } from "lucide-react";

const partnerReasons = [
  {
    title: "Reliable Supply Chain",
    points: [
      "Nationwide distribution network",
      "Same-day dispatch on stocked items",
      "Real-time inventory visibility",
      "Flexible delivery options",
    ],
  },
  {
    title: "Expert Support",
    points: [
      "Dedicated account managers",
      "Pre-sales technical consultants",
      "Product training programs",
      "24/7 partner support portal",
    ],
  },
  {
    title: "Growth Resources",
    points: [
      "Marketing development funds",
      "Lead generation programs",
      "Co-branded campaigns",
      "Business planning support",
    ],
  },
];

const WhyPartnerSection = () => {
  return (
    <section className="section-padding bg-background">
      <div className="container-wide">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Why partner with Internext?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We're more than a distributor — we're your strategic partner in growing 
            your technology business.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {partnerReasons.map((reason, index) => (
            <div
              key={reason.title}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <h3 className="text-xl font-semibold text-foreground mb-6 pb-4 border-b border-border">
                {reason.title}
              </h3>
              <ul className="space-y-4">
                {reason.points.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyPartnerSection;
