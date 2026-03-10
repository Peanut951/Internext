import { Link } from "react-router-dom";
import { ArrowRight, Building2, Gauge, Handshake, ShieldCheck, Users } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";

const valueCards = [
  {
    icon: Handshake,
    title: "Reseller First",
    text: "We help partners keep customer ownership while scaling product access and fulfilment confidence.",
  },
  {
    icon: Gauge,
    title: "Operationally Practical",
    text: "Faster quoting, cleaner product coverage, and support that is useful in real commercial pressure.",
  },
  {
    icon: ShieldCheck,
    title: "Dependable Delivery",
    text: "A stable supply model focused on consistency, responsiveness, and professional execution.",
  },
];

const stats = [
  { value: "7,500+", label: "Products in catalogue" },
  { value: "500+", label: "Australian reseller partners" },
  { value: "Statewide", label: "Coverage across business and government" },
];

const AboutIndex = () => {
  return (
    <Layout>
      <section className="relative overflow-hidden bg-gradient-hero py-20 md:py-28">
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="container-wide relative">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] xl:items-end">
            <div className="max-w-4xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent/90">
                About Internext
              </p>
              <h1 className="mt-4 text-4xl font-bold leading-tight text-primary-foreground md:text-6xl">
                Built to help Australian resellers move faster with less friction.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-relaxed text-primary-foreground/80 md:text-xl">
                Internext supports technology resellers with stronger product access, practical commercial support, and reliable fulfilment
                execution while keeping your customer experience under your own brand.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" variant="hero" className="gap-2">
                  <Link to="/about/why-partner">
                    Why Partner With Us
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="hero-outline" className="gap-2">
                  <Link to="/about/customers">
                    Who We Support
                    <Users className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-primary-foreground/15 bg-primary-foreground/10 p-6 backdrop-blur-sm">
              <div className="rounded-2xl border border-primary-foreground/15 bg-navy-dark/55 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-accent/15 p-2 text-accent">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent/90">
                    Internext Snapshot
                  </p>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  {stats.map((item) => (
                    <div key={item.value} className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/8 px-4 py-3">
                      <p className="text-2xl font-bold text-primary-foreground">{item.value}</p>
                      <p className="mt-1 text-sm leading-relaxed text-primary-foreground/75">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="grid gap-6 lg:grid-cols-3">
            {valueCards.map((card, index) => (
              <article
                key={card.title}
                className="group rounded-[1.5rem] border border-border/60 bg-card p-7 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated animate-fade-in-up"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <card.icon className="h-6 w-6" />
                </div>
                <h2 className="mt-5 text-2xl font-semibold text-foreground">{card.title}</h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-secondary py-16 md:py-20">
        <div className="container-wide">
          <div className="rounded-[1.75rem] border border-border/60 bg-card p-8 shadow-card md:p-10">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Next Steps</p>
                <h2 className="mt-3 text-3xl font-bold text-foreground md:text-4xl">
                  Learn more about the people, customers, and partner model behind Internext.
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  Explore how we work, where we support partners, and the practical model we use to help reseller businesses grow.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <Button asChild variant="outline" className="justify-between">
                  <Link to="/about/team">
                    Meet The Team
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="default" className="justify-between">
                  <Link to="/contact">
                    Contact Internext
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default AboutIndex;
