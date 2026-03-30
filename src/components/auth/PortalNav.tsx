import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { clearAuthSession, isAdminSession } from "@/lib/auth";
import { useAuthSession } from "@/hooks/use-auth-session";

const portalLinks = [
  { label: "Portal Home", href: "/portal" },
  { label: "Cart", href: "/cart" },
  { label: "Checkout", href: "/checkout" },
  { label: "Products", href: "/products" },
];

const PortalNav = () => {
  const location = useLocation();
  const { session, loading } = useAuthSession();
  if (loading || !session) {
    return null;
  }
  const showAdmin = isAdminSession(session);

  return (
    <div className="rounded-[1.75rem] border border-border/60 bg-card/95 p-5 shadow-card backdrop-blur">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Reseller Portal
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{session?.email ?? "guest"}</span> with{" "}
            <span className="font-medium capitalize text-foreground">{session.role}</span> access.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {portalLinks.map((link) => {
            const active = location.pathname === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-accent bg-accent text-accent-foreground shadow-sm"
                    : "border-border/60 bg-background text-foreground hover:border-accent/40 hover:text-accent"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {showAdmin ? (
            <Link
              to="/admin/orders"
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                location.pathname === "/admin/orders"
                  ? "border-accent bg-accent text-accent-foreground shadow-sm"
                  : "border-border/60 bg-background text-foreground hover:border-accent/40 hover:text-accent"
              }`}
            >
              Order Ops
            </Link>
          ) : null}

          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await clearAuthSession();
              window.location.hash = "#/login";
            }}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PortalNav;
