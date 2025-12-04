import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Building2, User, Mail, Phone, Globe, DollarSign, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const Register = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    businessName: "",
    abn: "",
    contactName: "",
    email: "",
    phone: "",
    website: "",
    industry: "",
    monthlyVolume: "",
    additionalInfo: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Application Submitted",
      description: "We'll review your application and contact you within 2 business days.",
    });
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-hero py-12 md:py-16">
        <div className="container-wide">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Become a Reseller
            </h1>
            <p className="text-lg text-primary-foreground/80">
              Apply for a reseller account to access our full product range, competitive pricing, and partner benefits.
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
                  Reseller Application Form
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Business Details */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                      Business Details
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Business Name *
                        </label>
                        <Input
                          required
                          value={formData.businessName}
                          onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                          className="bg-secondary border-0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          ABN *
                        </label>
                        <Input
                          required
                          value={formData.abn}
                          onChange={(e) => setFormData({ ...formData, abn: e.target.value })}
                          placeholder="XX XXX XXX XXX"
                          className="bg-secondary border-0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Details */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                      Contact Details
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Contact Name *
                        </label>
                        <Input
                          required
                          value={formData.contactName}
                          onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                          className="bg-secondary border-0"
                        />
                      </div>
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
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Website
                        </label>
                        <Input
                          type="url"
                          value={formData.website}
                          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                          placeholder="https://"
                          className="bg-secondary border-0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Business Info */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                      Business Information
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Industry *
                        </label>
                        <select
                          required
                          value={formData.industry}
                          onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                          className="w-full bg-secondary border-0 rounded-md px-3 py-2"
                        >
                          <option value="">Select industry...</option>
                          <option value="it-reseller">IT Reseller</option>
                          <option value="av-integrator">AV Integrator</option>
                          <option value="security-installer">Security Installer</option>
                          <option value="msp">Managed Service Provider</option>
                          <option value="office-dealer">Office Equipment Dealer</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Estimated Monthly Volume *
                        </label>
                        <select
                          required
                          value={formData.monthlyVolume}
                          onChange={(e) => setFormData({ ...formData, monthlyVolume: e.target.value })}
                          className="w-full bg-secondary border-0 rounded-md px-3 py-2"
                        >
                          <option value="">Select range...</option>
                          <option value="0-5k">Under $5,000</option>
                          <option value="5k-20k">$5,000 - $20,000</option>
                          <option value="20k-50k">$20,000 - $50,000</option>
                          <option value="50k-100k">$50,000 - $100,000</option>
                          <option value="100k+">Over $100,000</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Additional Information
                    </label>
                    <Textarea
                      value={formData.additionalInfo}
                      onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                      placeholder="Tell us about your business and what products you're interested in..."
                      rows={4}
                      className="bg-secondary border-0"
                    />
                  </div>

                  <Button type="submit" className="w-full md:w-auto">
                    Submit Application <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>

            {/* Sidebar */}
            <div>
              <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50 mb-6">
                <h3 className="font-semibold text-foreground mb-4">Partner Benefits</h3>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <DollarSign className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                    Competitive trade pricing
                  </li>
                  <li className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                    Access to 50+ vendor brands
                  </li>
                  <li className="flex items-start gap-2">
                    <User className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                    Dedicated account manager
                  </li>
                  <li className="flex items-start gap-2">
                    <Globe className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                    Online ordering portal
                  </li>
                </ul>
              </div>

              <div className="bg-secondary rounded-2xl p-6">
                <h3 className="font-semibold text-foreground mb-4">Already a Partner?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Sign in to access your reseller account.
                </p>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Register;
