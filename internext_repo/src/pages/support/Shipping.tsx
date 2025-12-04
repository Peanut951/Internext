import Layout from "@/components/layout/Layout";
import { Truck, Clock, MapPin, Package, CheckCircle } from "lucide-react";

const Shipping = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-hero py-16 md:py-20">
        <div className="container-wide">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
              Shipping & Delivery
            </h1>
            <p className="text-xl text-primary-foreground/80">
              Fast, reliable delivery across Australia with real-time tracking.
            </p>
          </div>
        </div>
      </section>

      {/* Delivery Times */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-8">Delivery Timeframes</h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Truck className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Metro Areas</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Sydney, Melbourne, Brisbane, Perth, Adelaide, Canberra
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-foreground">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    Next business day (orders before 2pm)
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    Same-day available (additional cost)
                  </li>
                </ul>
              </div>

              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Regional Areas</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  All other Australian locations
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-foreground">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    2-5 business days depending on location
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    Express options available
                  </li>
                </ul>
              </div>
            </div>

            {/* Shipping Options */}
            <h2 className="text-2xl font-bold text-foreground mb-8">Shipping Options</h2>
            
            <div className="space-y-4 mb-12">
              {[
                { name: "Standard Delivery", desc: "Our default shipping option included with all orders. Tracking provided.", time: "1-5 business days" },
                { name: "Express Delivery", desc: "Priority handling and expedited shipping for urgent orders.", time: "Same or next day (metro)" },
                { name: "Scheduled Delivery", desc: "Choose a specific delivery date that suits your customer.", time: "As scheduled" },
                { name: "Direct Ship", desc: "Ship directly to your customer with your branding.", time: "Varies by location" },
              ].map((option) => (
                <div key={option.name} className="bg-card rounded-xl p-6 shadow-card border border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{option.name}</h3>
                    <p className="text-muted-foreground text-sm">{option.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm bg-secondary px-4 py-2 rounded-lg">
                    <Clock className="h-4 w-4 text-accent" />
                    <span className="text-foreground font-medium">{option.time}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Tracking */}
            <h2 className="text-2xl font-bold text-foreground mb-8">Order Tracking</h2>
            
            <div className="bg-secondary rounded-2xl p-8 mb-12">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Real-Time Tracking</h3>
                  <p className="text-muted-foreground mb-4">
                    All orders include tracking information sent via email once dispatched. 
                    You can also view tracking status in your reseller portal at any time.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Dispatch confirmation with tracking number</li>
                    <li>• SMS and email notifications (optional)</li>
                    <li>• Proof of delivery documentation</li>
                    <li>• Integration with major courier tracking systems</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Important Notes */}
            <h2 className="text-2xl font-bold text-foreground mb-8">Important Information</h2>
            
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-accent rounded-full mt-2 flex-shrink-0" />
                  Delivery times are estimates and may vary during peak periods or due to circumstances beyond our control.
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-accent rounded-full mt-2 flex-shrink-0" />
                  Orders placed after 2pm or on weekends/public holidays will be processed on the next business day.
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-accent rounded-full mt-2 flex-shrink-0" />
                  Large or heavy items may require tailgate delivery or special handling arrangements.
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-accent rounded-full mt-2 flex-shrink-0" />
                  Freight charges are calculated at checkout based on delivery location and order weight/dimensions.
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-accent rounded-full mt-2 flex-shrink-0" />
                  Contact us for special delivery requirements or large project logistics.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Shipping;
