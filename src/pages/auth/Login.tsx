import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { signIn } from "@/lib/auth";
import PortalShell from "@/components/auth/PortalShell";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = signIn(email, password);
    if (!result.ok) {
      setError(result.message);
      setSubmitting(false);
      return;
    }

    toast({
      title: "Signed In",
      description: `Logged in as ${result.session.role}.`,
    });

    const redirect = searchParams.get("redirect");
    if (redirect) {
      navigate(redirect);
    } else if (result.session.role === "admin") {
      navigate("/admin/orders");
    } else {
      navigate("/portal");
    }

    setSubmitting(false);
  };

  return (
    <PortalShell
      eyebrow="Portal Access"
      title="A reseller portal built for quoting, stock visibility, and cleaner order flow."
      description="Sign in to manage pricing access, ordering, account activity, and operational support from one place."
      stats={[
        { value: "7,500+", label: "catalogued products available to reseller accounts" },
        { value: "24/7", label: "online access to pricing, stock, and order visibility" },
        { value: "AU", label: "local support aligned to Australian reseller workflows" },
      ]}
      features={[
        {
          title: "Faster account access",
          description: "Get into the catalog, review product detail, and move into cart or operations without hopping between disconnected screens.",
        },
        {
          title: "Operational clarity",
          description: "Use the same portal for account access, reseller applications, and order operations so the workflow feels consistent.",
        },
      ]}
    >
      <div className="mx-auto max-w-lg rounded-[2rem] border border-border/60 bg-card p-7 shadow-elevated md:p-8">
        <div className="mb-8">
          <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-card">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">Sign in to Internext</h2>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Access reseller pricing, product visibility, ordering, and account operations.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="h-12 border-border/70 bg-secondary/45 pl-11"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="h-12 border-border/70 bg-secondary/45 pl-11"
                required
              />
            </div>
          </div>

          {error ? (
            <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-3 text-sm">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" className="rounded border-border" />
              <span className="text-muted-foreground">Keep me signed in on this device</span>
            </label>
            <a href="#" className="font-medium text-accent hover:underline">
              Forgot password?
            </a>
          </div>

          <Button type="submit" className="h-12 w-full" disabled={submitting}>
            {submitting ? "Signing In..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-8 rounded-2xl border border-border/60 bg-secondary/30 p-4">
          <p className="text-sm font-semibold text-foreground">Need reseller access first?</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Submit your application and our team will review your business details before enabling portal access.
          </p>
          <Button variant="outline" className="mt-4 w-full" asChild>
            <Link to="/login/register">
              Request Reseller Access <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </PortalShell>
  );
};

export default Login;
