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
    <div className="bg-primary text-primary-foreground py-2">
      <div className="container-wide flex items-center justify-between text-sm">
        <div className="flex items-center gap-6">
          <a href="tel:1300123456" className="flex items-center gap-2 hover:text-accent transition-colors">
            <Phone className="h-4 w-4" />
            <span>1300 567 835</span>
          </a>
          <a href="mailto:sales@internext.com.au" className="flex items-center gap-2 hover:text-accent transition-colors">
            <Mail className="h-4 w-4" />
            <span>orders@internext.com.au</span>
          </a>
        </div>
        <div className="flex items-center gap-4">
          {session ? (
            <>
              <Link to={portalHref} className="hidden sm:inline text-primary-foreground/80 hover:text-accent transition-colors">
                {portalLabel}
              </Link>
              <Button
                variant="accent"
                size="sm"
                className="gap-2"
                onClick={async () => {
                  await clearAuthSession();
                  window.location.href = "/login";
                }}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="accent" size="sm" className="gap-2">
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
