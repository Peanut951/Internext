import Layout from "@/components/layout/Layout";
import { Download, BookOpen, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ProductGuide = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-hero py-16 md:py-20">
        <div className="container-wide">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
              Product Category Guide
            </h1>
            <p className="text-xl text-primary-foreground/80">
              Your comprehensive reference for our complete product range.
            </p>
          </div>
        </div>
      </section>

      {/* Guide Content */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Guide Preview */}
            <div>
              <div className="bg-card rounded-2xl p-8 shadow-card border border-border/50">
                <div className="aspect-[3/4] bg-muted rounded-xl mb-6 flex items-center justify-center">
                  <div className="text-center">
                    <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <span className="text-muted-foreground">Guide Preview</span>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Internext Product Guide 2024
                </h2>
                <p className="text-muted-foreground mb-4">
                  200+ pages of product information, specifications, and ordering codes 
                  across all our technology categories.
                </p>
                <Button className="w-full">
                  <Download className="mr-2 h-4 w-4" /> Download PDF (45MB)
                </Button>
              </div>
            </div>

            {/* Request Printed Copy */}
            <div>
              <div className="bg-card rounded-2xl p-8 shadow-card border border-border/50 mb-8">
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  Request a Printed Copy
                </h3>
                <p className="text-muted-foreground mb-6">
                  Prefer a physical guide? We'll mail one directly to your office.
                </p>
                <form className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Name
                      </label>
                      <Input placeholder="Your name" className="bg-secondary border-0" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Company
                      </label>
                      <Input placeholder="Company name" className="bg-secondary border-0" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Email
                    </label>
                    <Input type="email" placeholder="your@email.com" className="bg-secondary border-0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Mailing Address
                    </label>
                    <Input placeholder="Street address" className="bg-secondary border-0 mb-2" />
                    <div className="grid grid-cols-3 gap-2">
                      <Input placeholder="City" className="bg-secondary border-0" />
                      <Input placeholder="State" className="bg-secondary border-0" />
                      <Input placeholder="Postcode" className="bg-secondary border-0" />
                    </div>
                  </div>
                  <Button variant="accent" className="w-full">Request Printed Guide</Button>
                </form>
              </div>

              {/* How to Use */}
              <div className="bg-secondary rounded-2xl p-8">
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  How to Use This Guide
                </h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">1</span>
                    <span>Browse by category to find products in your area of focus</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">2</span>
                    <span>Use product codes to quickly order through the reseller portal</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">3</span>
                    <span>Reference specifications when preparing customer quotes</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">4</span>
                    <span>Share relevant pages with customers during sales conversations</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ProductGuide;
