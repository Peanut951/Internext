import { useState } from "react";
import { ArrowRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import PortalShell from "@/components/auth/PortalShell";

const emptyForm = {
  businessName: "",
  abn: "",
  contactName: "",
  email: "",
  phone: "",
  website: "",
  industry: "",
  monthlyVolume: "",
  additionalInfo: "",
};

const Register = () => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/reseller-application", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setSubmitError(payload.message || "Unable to submit the application.");
        setSubmitting(false);
        return;
      }

      setFormData(emptyForm);
      toast({
        title: "Application Submitted",
        description: "We'll review your application and contact you within 2 business days.",
      });
    } catch {
      setSubmitError("Unable to send the application right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalShell
      eyebrow="Partner Application"
      title="Apply once, then use the same portal for pricing, ordering, and account operations."
      description="Tell us about your business, reseller model, and expected volume so we can review your application against the right commercial workflow."
      stats={[
        { value: "2 Days", label: "typical review window for reseller applications" },
        { value: "50+", label: "vendor brands available through the reseller channel" },
        { value: "1", label: "single portal for catalog access, ordering, and account support" },
      ]}
      features={[
        {
          title: "Commercial fit first",
          description:
            "We review your business profile, channel focus, and expected purchasing needs before activating reseller access.",
        },
        {
          title: "Straightforward onboarding",
          description:
            "The application collects only the information needed to qualify your account and route you to the right team.",
        },
      ]}
    >
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-border/60 bg-card p-7 shadow-elevated md:p-8">
          <div className="mb-7">
            <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-card">
              <Building2 className="h-7 w-7" />
            </div>
            <h2 className="text-3xl font-bold text-foreground">Reseller Application</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
              Complete the details below so we can review your account request and set up the right reseller access path.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Business Details
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Business Name *</label>
                  <Input
                    required
                    value={formData.businessName}
                    onChange={(event) =>
                      setFormData({ ...formData, businessName: event.target.value })
                    }
                    className="h-12 border-border/70 bg-secondary/45"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">ABN *</label>
                  <Input
                    required
                    value={formData.abn}
                    onChange={(event) => setFormData({ ...formData, abn: event.target.value })}
                    placeholder="XX XXX XXX XXX"
                    className="h-12 border-border/70 bg-secondary/45"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Contact Details
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Contact Name *</label>
                  <Input
                    required
                    value={formData.contactName}
                    onChange={(event) =>
                      setFormData({ ...formData, contactName: event.target.value })
                    }
                    className="h-12 border-border/70 bg-secondary/45"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Email *</label>
                  <Input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                    className="h-12 border-border/70 bg-secondary/45"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Phone *</label>
                  <Input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                    className="h-12 border-border/70 bg-secondary/45"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Website</label>
                  <Input
                    type="url"
                    value={formData.website}
                    onChange={(event) => setFormData({ ...formData, website: event.target.value })}
                    placeholder="https://"
                    className="h-12 border-border/70 bg-secondary/45"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Commercial Profile
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Industry *</label>
                  <select
                    required
                    value={formData.industry}
                    onChange={(event) => setFormData({ ...formData, industry: event.target.value })}
                    className="h-12 w-full rounded-xl border border-border/70 bg-secondary/45 px-3 text-sm"
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
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Estimated Monthly Volume *
                  </label>
                  <select
                    required
                    value={formData.monthlyVolume}
                    onChange={(event) =>
                      setFormData({ ...formData, monthlyVolume: event.target.value })
                    }
                    className="h-12 w-full rounded-xl border border-border/70 bg-secondary/45 px-3 text-sm"
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
              <label className="mb-2 block text-sm font-medium text-foreground">
                Additional Information
              </label>
              <Textarea
                value={formData.additionalInfo}
                onChange={(event) =>
                  setFormData({ ...formData, additionalInfo: event.target.value })
                }
                placeholder="Tell us about your business, project focus, brands of interest, or account requirements..."
                rows={5}
                className="border-border/70 bg-secondary/45"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button type="submit" className="h-12 sm:px-6" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Application"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-sm text-muted-foreground">
                We&apos;ll review your application and reply within 2 business days.
              </p>
            </div>

            {submitError ? (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {submitError}
              </div>
            ) : null}
          </form>
        </div>
      </div>
    </PortalShell>
  );
};

export default Register;
