import { ReactNode } from "react";
import Layout from "@/components/layout/Layout";

type PortalShellStat = {
  label: string;
  value: string;
};

type PortalShellFeature = {
  title: string;
  description: string;
};

type PortalShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  stats: PortalShellStat[];
  features: PortalShellFeature[];
  children: ReactNode;
};

const PortalShell = ({
  eyebrow,
  title,
  description,
  stats,
  features,
  children,
}: PortalShellProps) => {
  return (
    <Layout>
      <section className="relative overflow-hidden bg-gradient-hero py-12 md:py-16 lg:py-20">
        <div className="absolute inset-0 opacity-20">
          <div className="h-full w-full bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:34px_34px]" />
        </div>
        <div className="container-wide relative">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
            <div className="rounded-[2rem] border border-white/15 bg-primary/35 p-6 text-primary-foreground shadow-elevated backdrop-blur md:p-8">
              <div className="mb-8 flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="Internext"
                  className="h-12 w-12 rounded-2xl object-cover ring-1 ring-white/20"
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                    {eyebrow}
                  </p>
                  <p className="text-sm text-primary-foreground/70">Internext Reseller Portal</p>
                </div>
              </div>

              <h1 className="max-w-2xl text-4xl font-bold leading-[0.95] md:text-5xl">
                {title}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-primary-foreground/80 md:text-lg">
                {description}
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-white/15 bg-white/8 px-5 py-4"
                  >
                    <p className="text-3xl font-bold text-primary-foreground">{stat.value}</p>
                    <p className="mt-2 text-sm leading-6 text-primary-foreground/70">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className="rounded-2xl border border-white/12 bg-slate-950/10 px-5 py-4"
                  >
                    <p className="text-base font-semibold text-primary-foreground">
                      {feature.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-primary-foreground/72">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="self-center">{children}</div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default PortalShell;
