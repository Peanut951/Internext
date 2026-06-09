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
    <div className="bg-primary py-2 text-primary-foreground">
      <div className="container-wide flex items-center justify-between gap-3 text-sm">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          <a href="tel:1300123456" className="flex items-center gap-2 hover:text-accent transition-colors">
            <Phone className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">1300 567 835</span>
          </a>
          <a href="mailto:sales@internext.com.au" className="hidden min-w-0 items-center gap-2 transition-colors hover:text-accent sm:flex">
            <Mail className="h-4 w-4 shrink-0" />
            <span>orders@internext.com.au</span>
          </a>
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
  );
};

export default TopBar;
