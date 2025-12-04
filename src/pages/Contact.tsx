import Layout from "@/components/layout/Layout";
import { useState } from "react";
import { Phone, Mail, MapPin, Clock, Send, Building2, Headphones, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const contactTypes = [
  { icon: Building2, title: "General Enquiries", email: "info@internext.com.au", phone: "1300 123 456" },
  { icon: Users, title: "Sales Enquiries", email: "sales@internext.com.au", phone: "1300 123 457" },
  { icon: Headphones, title: "Technical Support", email: "support@internext.com.au", phone: "1300 123 458" },
];

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    enquiryType: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message Sent",
      description: "Thank you for contacting us. We'll respond within 1 business day.",
    });
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-hero py-16 md:py-20">
        <div className="container-wide">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
              Get in Touch with Internext
            </h1>
            <p className="text-xl text-primary-foreground/80">
              We're here to help. Reach out to our team for sales, support, or partnership enquiries.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Types */}
      <section className="py-12 bg-secondary">
        <div className="container-wide">
          <div className="grid md:grid-cols-3 gap-6">
            {contactTypes.map((type) => (
              <div key={type.title} className="bg-card rounded-xl p-6 shadow-card text-center">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <type.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-semibold text-foreground mb-3">{type.title}</h3>
                <p className="text-muted-foreground text-sm mb-1">
                  <a href={`mailto:${type.email}`} className="hover:text-accent">{type.email}</a>
                </p>
                <p className="text-muted-foreground text-sm">
                  <a href={`tel:${type.phone.replace(/\s/g, '')}`} className="hover:text-accent">{type.phone}</a>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form and Map */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">Send Us a Message</h2>
              <div className="bg-card rounded-2xl p-8 shadow-card border border-border/50">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Name *
                      </label>
                      <Input
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Phone
                      </label>
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="bg-secondary border-0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Company
                      </label>
                      <Input
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="bg-secondary border-0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Enquiry Type *
                    </label>
                    <select
                      required
                      value={formData.enquiryType}
                      onChange={(e) => setFormData({ ...formData, enquiryType: e.target.value })}
                      className="w-full bg-secondary border-0 rounded-md px-3 py-2"
                    >
                      <option value="">Select...</option>
                      <option value="general">General Enquiry</option>
                      <option value="sales">Sales Enquiry</option>
                      <option value="technical">Technical Support</option>
                      <option value="reseller">Become a Reseller</option>
                      <option value="vendor">Vendor Partnership</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Message *
                    </label>
                    <Textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="How can we help you?"
                      className="bg-secondary border-0"
                    />
                  </div>

                  <Button type="submit" className="w-full md:w-auto">
                    <Send className="mr-2 h-4 w-4" /> Send Message
                  </Button>
                </form>
              </div>
            </div>

            {/* Office Info */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">Our Office</h2>
              
              <div className="bg-muted rounded-2xl aspect-video mb-6 flex items-center justify-center">
                <span className="text-muted-foreground">Map</span>
              </div>

              <div className="bg-card rounded-2xl p-8 shadow-card border border-border/50">
                <h3 className="font-semibold text-foreground mb-4">Internext Head Office</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-foreground">Level 10, 123 Business Street</p>
                      <p className="text-muted-foreground">Sydney NSW 2000</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-accent flex-shrink-0" />
                    <a href="tel:1300123456" className="text-foreground hover:text-accent">
                      1300 123 456
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-accent flex-shrink-0" />
                    <a href="mailto:info@internext.com.au" className="text-foreground hover:text-accent">
                      info@internext.com.au
                    </a>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-foreground">Monday - Friday: 8:30am - 5:30pm</p>
                      <p className="text-muted-foreground">Weekends & Public Holidays: Closed</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
