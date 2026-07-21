import { Phone, Mail, LogOut, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { clearAuthSession } from "@/lib/auth";
import { useAuthSession } from "@/hooks/use-auth-session";

const TopBar = () => {
  const { session } = useAuthSession();
  const canAccessResellerPortal = session?.role === "reseller" || session?.role === "admin";
  const portalHref = canAccessResellerPortal ? "/portal" : "/portal/orders";
  const portalLabel = canAccessResellerPortal ? "Reseller Portal" : "User Portal";

  return (
    <>
      <div className="bg-primary py-2 text-primary-foreground">
        <div className="container-wide flex items-center justify-between gap-3 text-sm">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          <Link to="/contact" className="flex items-center gap-2 hover:text-accent transition-colors">
            <Phone className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap leading-tight">
              <span className="block">1300 U R NEXT</span>
              <span className="block text-[0.7rem] text-primary-foreground/70">(1300 876 398)</span>
            </span>
          </Link>
          <Link to="/contact" className="hidden min-w-0 items-center gap-2 transition-colors hover:text-accent sm:flex">
            <Mail className="h-4 w-4 shrink-0" />
            <span>orders@internext.com.au</span>
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          {session ? (
            <>
              <Link to={portalHref} className="hidden sm:inline text-primary-foreground/80 hover:text-accent transition-colors">
                {portalLabel}
              </Link>
              <Button
                variant="accent"
                size="sm"
                className="gap-2 px-3"
                onClick={async () => {
                  await clearAuthSession();
                  window.location.href = "/login";
                }}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="accent" size="sm" className="gap-2 px-3">
                  <User className="h-4 w-4" />
                  Login
                </Button>
              </Link>
            </>
          )}
        </div>
        </div>
      </div>
      <div className="bg-accent px-4 py-3 text-accent-foreground shadow-sm">
        <Link
          to="/signup?offer=first-order"
          className="container-wide flex flex-col items-center justify-center gap-1 text-center sm:flex-row sm:gap-3"
        >
          <span className="text-base font-extrabold sm:text-lg">10% off your first order</span>
          <span className="text-sm font-medium sm:text-base">
            Sign up now and receive your discount at checkout.
          </span>
        </Link>
      </div>
    </>
  );
};

export default TopBar;
