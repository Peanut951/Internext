import { Store, Warehouse, Megaphone, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Store,
    title: "Your showroom",
    description: "Give customers a credible catalogue and a cleaner buying experience without building everything from scratch.",
  },
  {
    icon: Warehouse,
    title: "Your warehouse",
    description: "Use our supply and dispatch capability to keep projects moving without carrying unnecessary operational weight.",
  },
  {
    icon: Megaphone,
    title: "Your commercial engine",
    description: "Support pitches, campaigns, quotes, and category expansion with assets that help you actually win work.",
  },
  {
    icon: TrendingUp,
    title: "Your growth partner",
    description: "Scale into education, government, enterprise, and essential services with sharper execution behind the scenes.",
  },
];

const FeatureCards = () => {
  return (
    <section className="relative bg-background py-20 md:py-24">
      <div className="container-wide">
        <div className="grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">How We Plug In</p>
            <h2 className="mt-3 text-3xl font-bold text-foreground md:text-4xl">
              Built to feel like an extension of your business.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              The best distributor relationship should reduce noise, remove friction, and help you look better in front of customers.
            </p>
            <Link to="/about/why-partner" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline">
              Why partner with Internext <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-7 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated animate-fade-in-up"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-accent opacity-70" />
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent transition-colors group-hover:bg-accent/15">
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureCards;
