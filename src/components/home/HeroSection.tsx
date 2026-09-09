import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Users, ShieldCheck, Truck } from "lucide-react";

const operationalPillars = [
  "Product sourcing",
  "Dropship fulfilment",
  "Pre-sales support",
  "Account growth",
];

const spotlightStats = [
  {
    value: "7,500+",
    label: "Products in catalogue",
    eyebrow: "Product Range",
  },
  {
    value: "500+",
    label: "Australian reseller partners",
    eyebrow: "Channel Reach",
  },
  {
    value: "Statewide",
    label: "Coverage across government and business",
    eyebrow: "Trusted Footprint",
  },
];

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-[#252b34]">
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:88px_88px]" />
      </div>

      <div className="container-wide relative py-14 sm:py-16 md:py-20 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(440px,520px)] xl:gap-16">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/[0.14] px-4 py-2 text-sm font-medium text-white shadow-[0_10px_30px_-18px_rgba(255,255,255,0.5)] backdrop-blur animate-fade-in-up">
              <span className="h-2 w-2 rounded-full bg-accent" />
              Reseller-first technology distribution across Australia
            </div>

            <h1 className="mt-6 text-4xl font-bold leading-[1.05] text-primary-foreground md:text-6xl animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
              Less supplier friction.
              <br />
              <span className="text-[#72b9e8]">More momentum for your business.</span>
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
              <Link to="/products" className="group w-full sm:w-auto">
                <Button
                  size="lg"
                  className="h-14 w-full gap-3 rounded-lg bg-[#58a6da] px-7 text-base font-bold text-white shadow-[0_18px_42px_-18px_rgba(88,166,218,0.95)] ring-1 ring-white/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#6bb7e8] hover:shadow-[0_22px_52px_-20px_rgba(107,183,232,1)] sm:w-auto"
                >
                  Browse Product Range
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.18] transition-transform duration-200 group-hover:translate-x-0.5">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Button>
              </Link>
              <Link to="/about/customers" className="w-full sm:w-auto">
                <Button variant="hero-outline" size="lg" className="w-full gap-2 sm:w-auto">
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
                  className="flex min-h-9 items-center gap-2 text-sm font-semibold text-white/[0.85]"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#72b9e8]" aria-hidden="true" />
                  {pillar}
                </div>
              ))}
            </div>
          </div>

          <div className="animate-fade-in-up" style={{ animationDelay: "0.18s" }}>
            <div className="rounded-2xl border border-white/[0.22] bg-[#1d222a]/95 p-5 shadow-[0_28px_70px_-34px_rgba(0,0,0,0.75)] sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#72b9e8]">Why Internext</p>
                  <h2 className="mt-2 max-w-sm text-2xl font-semibold leading-tight text-primary-foreground">
                    Built to help resellers move faster
                  </h2>
                </div>
                <div className="shrink-0 rounded-lg bg-[#72b9e8]/[0.15] p-3 text-[#72b9e8]">
                  <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>

              <div className="mt-5 border-t border-white/[0.12]">
                <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 py-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-[#72b9e8]" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-white">Own the customer relationship</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/80">
                      Present a clean Internext experience while we support product supply behind the scenes.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-t border-white/[0.12] py-4">
                  <Truck className="mt-0.5 h-5 w-5 text-[#72b9e8]" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-white">Operational support that feels practical</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/80">
                      Stock access, fulfilment workflows, and sales support designed for real reseller pressure.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid border-t border-white/[0.15] sm:grid-cols-3">
                {spotlightStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="min-w-0 border-t border-white/[0.12] py-4 first:border-t-0 sm:border-l sm:border-t-0 sm:px-4 sm:first:border-l-0"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8acdf5]">{stat.eyebrow}</p>
                    <p className={`mt-2 whitespace-nowrap font-bold text-white ${stat.value === "Statewide" ? "text-xl" : "text-3xl"}`}>
                      {stat.value}
                    </p>
                    <p className="mt-2 max-w-[15rem] text-sm leading-5 text-white/80">{stat.label}</p>
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
