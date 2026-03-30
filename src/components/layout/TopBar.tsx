import { Phone, Mail, LogOut, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { clearAuthSession } from "@/lib/auth";
import { useAuthSession } from "@/hooks/use-auth-session";

const TopBar = () => {
  const { session } = useAuthSession();

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
              <Link to="/portal" className="hidden sm:inline text-primary-foreground/80 hover:text-accent transition-colors">
                Reseller Portal
              </Link>
              <Button
                variant="accent"
                size="sm"
                className="gap-2"
                onClick={async () => {
                  await clearAuthSession();
                  window.location.hash = "#/login";
                }}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <span className="text-primary-foreground/70 hidden sm:inline">Reseller Portal</span>
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
