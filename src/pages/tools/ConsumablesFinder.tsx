import Layout from "@/components/layout/Layout";
import { useState } from "react";
import { Search, Printer, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const brands = ["All Brands", "HP", "Canon", "Epson", "Brother", "Ricoh", "Xerox", "Lexmark", "Samsung"];

const sampleResults = [
  { name: "HP 305A Black Toner", model: "CE410A", compatible: "LaserJet Pro 300, 400 Series", price: "Login for pricing" },
  { name: "HP 305A Cyan Toner", model: "CE411A", compatible: "LaserJet Pro 300, 400 Series", price: "Login for pricing" },
  { name: "HP 305A Magenta Toner", model: "CE413A", compatible: "LaserJet Pro 300, 400 Series", price: "Login for pricing" },
  { name: "HP 305A Yellow Toner", model: "CE412A", compatible: "LaserJet Pro 300, 400 Series", price: "Login for pricing" },
];

const ConsumablesFinder = () => {
  const [selectedBrand, setSelectedBrand] = useState("All Brands");
  const [modelSearch, setModelSearch] = useState("");
  const [cartridgeSearch, setCartridgeSearch] = useState("");
  const [showResults, setShowResults] = useState(false);

  const handleSearch = () => {
    setShowResults(true);
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-hero py-16 md:py-20">
        <div className="container-wide">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
              Consumables Finder
            </h1>
            <p className="text-xl text-primary-foreground/80">
              Find the right ink, toner, or supplies for any printer model.
            </p>
          </div>
        </div>
      </section>

      {/* Search Interface */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="max-w-4xl mx-auto">
            <div className="bg-card rounded-2xl p-8 shadow-card border border-border/50">
              <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <Search className="h-5 w-5 text-accent" />
                Search Consumables
              </h2>

              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Printer Brand
                  </label>
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full bg-secondary border-0 rounded-lg px-4 py-3 text-foreground"
                  >
                    {brands.map((brand) => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Printer Model
                  </label>
                  <Input
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder="e.g. LaserJet Pro M404"
                    className="bg-secondary border-0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Cartridge Number
                  </label>
                  <Input
                    value={cartridgeSearch}
                    onChange={(e) => setCartridgeSearch(e.target.value)}
                    placeholder="e.g. CE410A"
                    className="bg-secondary border-0"
                  />
                </div>
              </div>

              <Button onClick={handleSearch} className="w-full md:w-auto">
                <Search className="mr-2 h-4 w-4" /> Search Consumables
              </Button>
            </div>

            {/* Results */}
            {showResults && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  {sampleResults.length} results found
                </h3>
                <div className="space-y-4">
                  {sampleResults.map((result, idx) => (
                    <div
                      key={idx}
                      className="bg-card rounded-xl p-6 shadow-card border border-border/50 flex flex-col md:flex-row md:items-center gap-4"
                    >
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">{result.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Model: {result.model} | Compatible with: {result.compatible}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground mb-2">{result.price}</p>
                        <Button variant="outline" size="sm">View Details</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Help Section */}
      <section className="py-12 bg-secondary">
        <div className="container-wide">
          <div className="max-w-4xl mx-auto text-center">
            <Printer className="h-12 w-12 text-accent mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-4">Need Help Finding Supplies?</h2>
            <p className="text-muted-foreground mb-6">
              Our team can help you find the right consumables for any printer, 
              including discontinued models and compatible alternatives.
            </p>
            <Button variant="default">Contact Our Team</Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ConsumablesFinder;
