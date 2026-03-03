import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, ShieldCheck, Truck, ChevronRight } from "lucide-react";

const operationalPillars = [
  "Product sourcing",
  "Dropship fulfilment",
  "Pre-sales support",
  "Account growth",
];

const spotlightStats = [
  {
    value: "7,500+",
    label: "Products live in catalogue",
    eyebrow: "Live Range",
    valueClassName: "text-[1.9rem] md:text-[2.1rem]",
  },
  {
    value: "500+",
    label: "Australian reseller partners",
    eyebrow: "Channel Reach",
    valueClassName: "text-[1.9rem] md:text-[2.1rem]",
  },
  {
    value: "Statewide",
    label: "Coverage across government and business",
    eyebrow: "Trusted Footprint",
    valueClassName: "text-[1.35rem] md:text-[1.55rem] leading-tight",
  },
];

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-hero">
      <div className="absolute inset-0">
        <div className="absolute left-[-8%] top-[-10%] h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
        <div className="absolute right-[-6%] top-[18%] h-80 w-80 rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-navy-dark/25 to-transparent" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:72px_72px]" />
      </div>

      <div className="container-wide relative py-20 md:py-28 lg:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,480px)] xl:gap-16">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-2 text-sm text-primary-foreground/85 animate-fade-in-up">
              <span className="h-2 w-2 rounded-full bg-accent" />
              Reseller-first technology distribution across Australia
            </div>

            <h1 className="mt-6 text-4xl font-bold leading-[1.05] text-primary-foreground md:text-6xl animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
              Less supplier friction.
              <br />
              <span className="text-accent">More momentum for your business.</span>
            </h1>

            <p
              className="mt-6 max-w-2xl text-lg leading-relaxed text-primary-foreground/80 md:text-xl animate-fade-in-up"
              style={{ animationDelay: "0.1s" }}
            >
              Internext helps Australian resellers source, sell, and fulfil technology products with a cleaner customer experience,
              faster turnaround, and support that feels commercially useful.
            </p>

            <div
              className="mt-8 flex flex-col gap-4 sm:flex-row animate-fade-in-up"
              style={{ animationDelay: "0.15s" }}
            >
              <Link to="/products">
                <Button variant="hero" size="lg" className="gap-2">
                  Browse Product Range
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/about/customers">
                <Button variant="hero-outline" size="lg" className="gap-2">
                  <Users className="h-5 w-5" />
                  See Who We Support
                </Button>
              </Link>
            </div>

            <div
              className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 animate-fade-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              {operationalPillars.map((pillar) => (
                <div
                  key={pillar}
                  className="rounded-xl border border-white/18 bg-white/6 px-4 py-3 text-sm font-medium text-white backdrop-blur-sm"
                >
                  {pillar}
                </div>
              ))}
            </div>
          </div>

          <div className="animate-fade-in-up" style={{ animationDelay: "0.18s" }}>
            <div className="rounded-[1.75rem] border border-primary-foreground/15 bg-primary-foreground/8 p-5 shadow-[0_24px_80px_-30px_rgba(0,0,0,0.45)] backdrop-blur-md">
              <div className="rounded-2xl border border-primary-foreground/18 bg-navy-dark/60 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-accent/90">Why Internext</p>
                    <h2 className="mt-2 text-2xl font-semibold text-primary-foreground">Built to help resellers move faster</h2>
                  </div>
                  <div className="rounded-xl bg-accent/15 p-3 text-accent">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/8 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white">Own the customer relationship</p>
                        <p className="mt-1 text-sm leading-relaxed text-white" style={{ color: "rgba(255,255,255,0.84)" }}>
                          Present a clean Internext experience while we support product supply behind the scenes.
                        </p>
                      </div>
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    </div>
                  </div>

                  <div className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/8 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white">Operational support that feels practical</p>
                        <p className="mt-1 text-sm leading-relaxed text-white" style={{ color: "rgba(255,255,255,0.84)" }}>
                          Stock access, fulfilment workflows, and sales support designed for real reseller pressure.
                        </p>
                      </div>
                      <Truck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {spotlightStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="group relative min-w-0 overflow-hidden rounded-2xl border border-white/16 bg-gradient-to-br from-white/14 via-white/8 to-transparent px-5 py-5 text-white backdrop-blur-md transition-transform duration-300 hover:-translate-y-1"
                  >
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent/90 text-center">
                      {stat.eyebrow}
                    </p>
                    <div className="mt-3 mb-3 text-center">
                      <p className={`font-bold tracking-tight text-white ${stat.valueClassName} ${stat.value === "Statewide" ? "mx-auto max-w-[8ch] text-center" : ""}`}>
                        {stat.value}
                      </p>
                    </div>
                    <p className="mx-auto max-w-[11rem] text-sm leading-6 text-white/82 text-center">
                      {stat.label}
                    </p>
                    <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-accent/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100 opacity-70" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
