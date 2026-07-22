import { useState } from "react";
import { Gift, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const FirstOrderPromo = () => {
  const location = useLocation();
  const [state, setState] = useState<"open" | "minimized">("open");
  const isSignupOfferPage =
    location.pathname === "/signup" && new URLSearchParams(location.search).get("offer") === "first-order";

  if (isSignupOfferPage) {
    return null;
  }

  if (state === "minimized") {
    return (
      <button
        type="button"
        onClick={() => setState("open")}
        className="fixed bottom-5 right-5 z-[70] inline-flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-bold text-accent-foreground shadow-elevated transition-transform hover:-translate-y-0.5"
      >
        <Gift className="h-4 w-4" />
        10% Off
      </button>
    );
  }

  return (
    <aside className="fixed bottom-5 right-5 z-[70] w-[min(calc(100vw-2rem),24rem)] rounded-2xl border border-accent/40 bg-card p-5 text-foreground shadow-elevated">
      <button
        type="button"
        onClick={() => setState("minimized")}
        className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        aria-label="Close first order offer"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="pr-8">
        <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Gift className="h-5 w-5" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">First Order Offer</p>
        <h2 className="mt-2 text-2xl font-extrabold leading-tight text-foreground">
          Sign up now and receive 10% off your first order
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Create an Internext customer account and your first eligible account order will receive the discount automatically at checkout.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button asChild className="flex-1">
          <Link to="/signup?offer=first-order">Sign Up Now</Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => setState("minimized")}
        >
          Later
        </Button>
      </div>
    </aside>
  );
};

export default FirstOrderPromo;
