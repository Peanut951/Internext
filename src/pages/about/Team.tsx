import Layout from "@/components/layout/Layout";

const Team = () => {
  return (
    <Layout>
      <section className="bg-gradient-hero py-16 md:py-24">
        <div className="container-wide">
          <div className="max-w-3xl">
            <h1 className="mb-4 text-4xl font-bold text-primary-foreground md:text-5xl">
              Meet The Team
            </h1>
            <p className="text-xl leading-relaxed text-primary-foreground/80">
              The people behind Internext.
            </p>
          </div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="mx-auto max-w-xl rounded-2xl border border-border/60 bg-card p-8 text-center shadow-card">
            <h2 className="text-3xl font-bold text-foreground">Roxi Hudson</h2>
            <p className="mt-2 text-lg font-medium text-accent">Director</p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Team;
