import Layout from "@/components/layout/Layout";
import { useState } from "react";
import { Upload, Send, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const ServiceRequest = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    companyName: "",
    contactPerson: "",
    email: "",
    phone: "",
    product: "",
    serialNumber: "",
    issueDescription: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Request Submitted",
      description: "We'll review your request and get back to you within 1 business day.",
    });
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-hero py-16 md:py-20">
        <div className="container-wide">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
              Service Request
            </h1>
            <p className="text-xl text-primary-foreground/80">
              Submit a service request for installation, support, or warranty issues.
            </p>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Form */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-2xl p-8 shadow-card border border-border/50">
                <h2 className="text-xl font-semibold text-foreground mb-6">
                  Project / Service Details
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Company Name *
                      </label>
                      <Input
                        required
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        className="bg-secondary border-0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Contact Person *
                      </label>
                      <Input
                        required
                        value={formData.contactPerson}
                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                        className="bg-secondary border-0"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Email *
                      </label>
                      <Input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="bg-secondary border-0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Phone *
                      </label>
                      <Input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="bg-secondary border-0"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Product / Category
                      </label>
                      <select
                        value={formData.product}
                        onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                        className="w-full bg-secondary border-0 rounded-md px-3 py-2"
                      >
                        <option value="">Select...</option>
                        <option value="av">Audio Visual Installation</option>
                        <option value="security">Security System</option>
                        <option value="networking">Networking</option>
                        <option value="print">Print / Office Equipment</option>
                        <option value="cabling">Cabling</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Serial Number (if applicable)
                      </label>
                      <Input
                        value={formData.serialNumber}
                        onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                        className="bg-secondary border-0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Issue / Project Description *
                    </label>
                    <Textarea
                      required
                      rows={5}
                      value={formData.issueDescription}
                      onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
                      placeholder="Please describe your project requirements or the issue you're experiencing..."
                      className="bg-secondary border-0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Attachments (optional)
                    </label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Drag and drop files here, or click to browse
                      </p>
                      <input type="file" multiple className="hidden" id="file-upload" />
                      <Button variant="outline" size="sm" asChild>
                        <label htmlFor="file-upload" className="cursor-pointer">
                          Choose Files
                        </label>
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full md:w-auto">
                    <Send className="mr-2 h-4 w-4" /> Submit Request
                  </Button>
                </form>
              </div>
            </div>

            {/* Sidebar */}
            <div>
              <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50 mb-6">
                <h3 className="font-semibold text-foreground mb-4">What Happens Next?</h3>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">1</span>
                    We'll review your request within 1 business day
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">2</span>
                    A technical specialist will contact you if needed
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">3</span>
                    You'll receive a detailed quote and timeline
                  </li>
                </ol>
              </div>

              <div className="bg-secondary rounded-2xl p-6">
                <h3 className="font-semibold text-foreground mb-4">Need Urgent Help?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  For urgent technical support, please call us directly.
                </p>
                <a
                  href="tel:1300123456"
                  className="inline-flex items-center gap-2 text-accent font-semibold"
                >
                  <Phone className="h-4 w-4" /> 1300 567 835
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ServiceRequest;
