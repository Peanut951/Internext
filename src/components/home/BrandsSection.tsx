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
              <img
                src={brand.logo}
                alt={brand.name}
                className="h-12 w-auto object-contain grayscale hover:grayscale-0 transition"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandsSection;
