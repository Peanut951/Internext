import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Lock, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Login logic would go here
  };

  return (
    <Layout>
      <section className="section-padding bg-secondary min-h-[70vh] flex items-center">
        <div className="container-wide">
          <div className="max-w-md mx-auto">
            <div className="bg-card rounded-2xl p-8 shadow-card border border-border/50">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Lock className="h-8 w-8 text-accent-foreground" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Internext Reseller Portal
                </h1>
                <p className="text-muted-foreground">
                  Access pricing, stock, ordering and tracking
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="pl-10 bg-secondary border-0"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 bg-secondary border-0"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-border" />
                    <span className="text-muted-foreground">Remember me</span>
                  </label>
                  <a href="#" className="text-accent hover:underline">
                    Forgot password?
                  </a>
                </div>

                <Button type="submit" className="w-full">
                  Sign In
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-border text-center">
                <p className="text-muted-foreground text-sm mb-4">
                  Don't have an account?
                </p>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/login/register">
                    Request Reseller Access <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Login;
