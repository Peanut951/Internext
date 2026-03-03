import { ArrowRight, BadgeCheck, Building2, Network } from "lucide-react";
import { Link } from "react-router-dom";

const brands = [
  { name: "Cisco", logo: "/brands/cisco.jpg" },
  { name: "HP Enterprise", logo: "/brands/hp.jpg" },
  { name: "Dell", logo: "/brands/dell.jpg" },
  { name: "Microsoft", logo: "/brands/microsoft.png" },
  { name: "VMware", logo: "/brands/vmware.png" },
  { name: "Fortinet", logo: "/brands/fortinet.jpg" },
  { name: "Palo Alto", logo: "/brands/paloalto.jpg" },
  { name: "Lenovo", logo: "/brands/lenovo.png" },
  { name: "NetApp", logo: "/brands/netapp.png" },
  { name: "Juniper", logo: "/brands/juniper.jpg" },
];

const proofPoints = [
  {
    icon: BadgeCheck,
    label: "Reseller-ready catalogue",
    detail: "Structured for quoting, browsing, and account growth.",
  },
  {
    icon: Building2,
    label: "Business and government reach",
    detail: "Positioned for commercial, education, and public-sector supply.",
  },
  {
    icon: Network,
    label: "Cross-category access",
    detail: "Networking, AV, print, surveillance, and UC in one place.",
  },
];

const BrandsSection = () => {
  return (
    <section className="relative overflow-hidden bg-secondary py-20 md:py-24">
      <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(to_right,hsl(var(--primary))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary))_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="container-wide relative">
        <div className="grid gap-8 xl:grid-cols-[minmax(320px,0.92fr)_minmax(0,1.08fr)]">
          <div className="rounded-[1.75rem] border border-border/60 bg-card p-8 shadow-card">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
              Brand Access
            </p>
            <h2 className="mt-3 text-3xl font-bold text-foreground md:text-4xl">
              Recognisable brands presented in an Internext-led experience.
            </h2>
            <p className="mt-4 max-w-xl text-muted-foreground leading-relaxed">
              Build customer confidence with a broader catalogue presence while keeping the
              sales journey and relationship under your own banner.
            </p>

            <div className="mt-8 space-y-3">
              {proofPoints.map((point) => (
                <div
                  key={point.label}
                  className="rounded-2xl border border-border/60 bg-secondary/55 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-accent/10 p-2 text-accent">
                      <point.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{point.label}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {point.detail}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Link
              to="/products"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
            >
              Explore product categories <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
              {brands.map((brand, index) => (
                <div
                  key={brand.name}
                  className="group flex h-28 items-center justify-center rounded-2xl border border-border/60 bg-background px-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-card animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.04}s` }}
                >
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    className="max-h-12 w-auto object-contain grayscale transition duration-300 group-hover:grayscale-0"
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 rounded-2xl bg-primary px-5 py-5 text-primary-foreground md:grid-cols-3">
              <div>
                <p className="text-3xl font-bold">7,500+</p>
                <p className="mt-1 text-sm text-primary-foreground/75">Products across core technology categories</p>
              </div>
              <div>
                <p className="text-3xl font-bold">500+</p>
                <p className="mt-1 text-sm text-primary-foreground/75">Australian reseller relationships supported</p>
              </div>
              <div>
                <p className="text-3xl font-bold">Statewide</p>
                <p className="mt-1 text-sm text-primary-foreground/75">Coverage across business and government environments</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrandsSection;
