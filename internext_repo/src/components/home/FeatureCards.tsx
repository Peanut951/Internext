import { Store, Warehouse, Megaphone, TrendingUp } from "lucide-react";

const features = [
  {
    icon: Store,
    title: "Your showroom",
    description: "Access premium product demos and presentation materials to wow your customers.",
  },
  {
    icon: Warehouse,
    title: "Your warehouse",
    description: "Leverage our nationwide logistics network with same-day dispatch on stocked items.",
  },
  {
    icon: Megaphone,
    title: "Your marketing team",
    description: "Co-branded campaigns, MDF programs, and ready-to-use marketing assets.",
  },
  {
    icon: TrendingUp,
    title: "Your growth partner",
    description: "Strategic account management and business development support to scale faster.",
  },
];

const FeatureCards = () => {
  return (
    <section className="section-padding bg-background">
      <div className="container-wide">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group bg-card rounded-xl p-8 shadow-card card-hover border border-border/50 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                <feature.icon className="h-7 w-7 text-accent" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureCards;
