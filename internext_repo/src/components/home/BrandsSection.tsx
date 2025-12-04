const brands = [
  { name: "Cisco", color: "#1BA0D8" },
  { name: "HP Enterprise", color: "#0096D6" },
  { name: "Dell", color: "#007DB8" },
  { name: "Microsoft", color: "#00A4EF" },
  { name: "VMware", color: "#607078" },
  { name: "Fortinet", color: "#DA291C" },
  { name: "Palo Alto", color: "#FA582D" },
  { name: "Lenovo", color: "#E2231A" },
  { name: "NetApp", color: "#0067C5" },
  { name: "Juniper", color: "#84B135" },
];

const BrandsSection = () => {
  return (
    <section className="section-padding bg-secondary">
      <div className="container-wide">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Brands we work with
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Partnering with industry-leading technology brands to bring you the best solutions
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {brands.map((brand, index) => (
            <div
              key={brand.name}
              className="bg-card rounded-xl p-6 flex items-center justify-center h-24 shadow-sm hover:shadow-card transition-shadow border border-border/50 animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <span 
                className="text-lg font-semibold"
                style={{ color: brand.color }}
              >
                {brand.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandsSection;
