import { Link } from "react-router-dom";
import { ArrowRight, Building2, Gauge, Handshake, ShieldCheck, Users } from "lucide-react";
import Layout from "@/components/layout/Layout";

const highlights = [
  {
    icon: Handshake,
    title: "Reseller First",
    text: "Keep your customer relationship while we support sourcing and fulfilment behind the scenes.",
  },
  {
    icon: Gauge,
    title: "Commercially Practical",
    text: "Faster quoting, broad catalogue coverage, and support designed for daily reseller pressure.",
  },
  {
    icon: ShieldCheck,
    title: "Reliable Execution",
    text: "A dependable operating model focused on consistency, responsiveness, and clean delivery.",
  },
];

const stats = [
  { value: "7,500+", label: "Products in catalogue" },
  { value: "500+", label: "Australian reseller partners" },
  { value: "Australia-wide", label: "Coverage across business and government" },
];

const aboutLinks = [
  {
    title: "Who We Support",
    text: "Industries and customer segments we work with.",
    href: "/about/customers",
  },
  {
    title: "Why Partner",
    text: "How the Internext partner model works in practice.",
    href: "/about/why-partner",
  },
  {
    title: "Contact Internext",
    text: "Talk with us about your reseller requirements.",
    href: "/contact",
  },
];

const AboutIndex = () => {
  return (
    <Layout>
      <section className="relative overflow-hidden bg-[#252b34] py-14 md:py-20">
        <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:88px_88px]" />
        <div className="container-wide relative">
          <div className="grid gap-10 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)] xl:items-center">
            <div className="max-w-4xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent/90">
                About Internext
              </p>
              <h1 className="mt-4 text-4xl font-bold leading-tight text-primary-foreground md:text-5xl">
                Built to help Australian resellers move faster.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-relaxed text-primary-foreground/80 md:text-xl">
                Internext supports technology resellers with stronger product access, practical commercial support, and reliable fulfilment
                execution while keeping your customer experience under your own brand.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.2] bg-[#1d222a]/95 p-5 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.8)] sm:p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[#72b9e8]/[0.15] p-2 text-[#72b9e8]">
                  <Building2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#72b9e8]">
                  Internext Snapshot
                </p>
              </div>
              <div className="mt-5 grid border-t border-white/[0.15] sm:grid-cols-3 xl:grid-cols-1">
                {stats.map((item) => (
                  <div
                    key={item.value}
                    className="min-w-0 border-t border-white/[0.12] py-4 first:border-t-0 sm:border-l sm:border-t-0 sm:px-4 sm:first:border-l-0 xl:border-l-0 xl:border-t xl:px-0 xl:first:border-t-0"
                  >
                    <p className={`whitespace-nowrap font-bold text-primary-foreground ${item.value === "Australia-wide" ? "text-xl" : "text-2xl"}`}>
                      {item.value}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-primary-foreground/75">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="grid gap-6 lg:grid-cols-3">
            {highlights.map((card, index) => (
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
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Explore More</p>
              <h2 className="mt-3 text-3xl font-bold text-foreground md:text-4xl">
                Explore how Internext supports your business.
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Use the links below to view customer segments, the partner model, and contact options.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {aboutLinks.map((item) => (
                <Link
                  key={item.title}
                  to={item.href}
                  className="group rounded-2xl border border-border/60 bg-background p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-card"
                >
                  <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                    Open
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default AboutIndex;
