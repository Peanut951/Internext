import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { signUp } from "@/lib/auth";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  company: "",
  password: "",
  confirmPassword: "",
  marketingOptIn: false,
};

const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const result = await signUp({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      company: formData.company,
      password: formData.password,
      marketingOptIn: formData.marketingOptIn,
    });

    if (!result.ok) {
      setError(result.message);
      setSubmitting(false);
      return;
    }

    toast({
      title: "Account Created",
      description: "You are signed in and can now checkout.",
    });

    navigate(searchParams.get("redirect") || "/products");
    setSubmitting(false);
  };

  return (
    <Layout>
      <section className="section-padding flex min-h-[75vh] items-center bg-secondary/40">
        <div className="container-wide">
          <div className="mx-auto max-w-2xl rounded-[2rem] border border-border/60 bg-card p-7 shadow-elevated md:p-8">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-card">
                <User className="h-7 w-7" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Create an Internext Account</h1>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                Create a standard customer account for checkout and order access. Reseller pricing is enabled separately after approval.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">First Name *</label>
                  <Input
                    required
                    value={formData.firstName}
                    onChange={(event) => setFormData({ ...formData, firstName: event.target.value })}
                    className="h-12 border-border/70 bg-secondary/45"
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Last Name *</label>
                  <Input
                    required
                    value={formData.lastName}
                    onChange={(event) => setFormData({ ...formData, lastName: event.target.value })}
                    className="h-12 border-border/70 bg-secondary/45"
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                      className="h-12 border-border/70 bg-secondary/45 pl-11"
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Phone</label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                    className="h-12 border-border/70 bg-secondary/45"
                    autoComplete="tel"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Company</label>
                <Input
                  value={formData.company}
                  onChange={(event) => setFormData({ ...formData, company: event.target.value })}
                  className="h-12 border-border/70 bg-secondary/45"
                  autoComplete="organization"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={formData.password}
                      onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                      className="h-12 border-border/70 bg-secondary/45 pl-11 pr-11"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={formData.confirmPassword}
                      onChange={(event) => setFormData({ ...formData, confirmPassword: event.target.value })}
                      className="h-12 border-border/70 bg-secondary/45 pl-11 pr-11"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-border/60 bg-background px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={formData.marketingOptIn}
                  onChange={(event) =>
                    setFormData({ ...formData, marketingOptIn: event.target.checked })
                  }
                  className="mt-1 h-4 w-4 rounded border-border"
                />
                <span className="font-medium text-foreground">
                  Email me Internext product updates and offers
                </span>
              </label>

              {error ? (
                <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              <Button type="submit" className="h-12 w-full" disabled={submitting}>
                {submitting ? "Creating Account..." : "Create Account"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-accent hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Signup;
