import { Link } from "react-router-dom";
import { BarChart3, Box, CreditCard, ShoppingCart, Truck } from "lucide-react";
import Layout from "@/components/layout/Layout";
import PortalNav from "@/components/auth/PortalNav";
import { Button } from "@/components/ui/button";
import { getAuthSession, isAdminSession } from "@/lib/auth";
import { formatAud, getCartItems, getOrders } from "@/lib/orderManagement";

const PortalDashboard = () => {
  const session = getAuthSession();
  const orders = getOrders();
  const cartItems = getCartItems();
  const totalKnownValue = orders.reduce((sum, order) => sum + order.totalKnownValue, 0);
  const openOrders = orders.filter((order) => order.fulfillmentStatus !== "delivered").length;
  const adminView = isAdminSession(session);

  return (
    <Layout>
      <section className="bg-gradient-hero py-14 md:py-20">
        <div className="container-wide">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Portal Home
          </p>
          <h1 className="mt-4 text-4xl font-bold text-primary-foreground md:text-5xl">
            Welcome to the reseller portal.
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-7 text-primary-foreground/80">
            Use this workspace to move between quoting, ordering, checkout, and operational visibility without leaving the portal flow.
          </p>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide space-y-8">
          <PortalNav />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Cart Items", value: String(cartItems.length), icon: ShoppingCart },
              { label: "Orders Logged", value: String(orders.length), icon: Box },
              { label: "Open Orders", value: String(openOrders), icon: Truck },
              { label: "Known Order Value", value: formatAud(totalKnownValue), icon: CreditCard },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-border/60 bg-card p-5 shadow-card"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <item.icon className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold text-foreground">{item.value}</p>
                <p className="mt-2 text-sm text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
            <div className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card md:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Quick Actions
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">Move through the portal</h2>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {[
                  {
                    title: "Browse Products",
                    description: "Search the catalog, compare products, and add items to cart.",
                    href: "/products",
                  },
                  {
                    title: "Open Cart",
                    description: "Adjust quantities, remove products, and prepare the current order.",
                    href: "/cart",
                  },
                  {
                    title: "Proceed to Checkout",
                    description: "Review customer delivery details and submit an order.",
                    href: "/checkout",
                  },
                  ...(adminView
                    ? [
                        {
                          title: "Order Operations",
                          description: "Manage supplier submissions and fulfillment state changes.",
                          href: "/admin/orders",
                        },
                      ]
                    : []),
                ].map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="rounded-2xl border border-border/60 bg-secondary/25 p-5 transition-colors hover:border-accent/35 hover:bg-secondary/40"
                  >
                    <p className="text-lg font-semibold text-foreground">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card md:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Account
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">Session Overview</h2>
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-border/60 bg-secondary/25 p-4">
                  <p className="text-sm text-muted-foreground">Signed-in account</p>
                  <p className="mt-1 font-semibold text-foreground">{session?.email}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-secondary/25 p-4">
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="mt-1 font-semibold capitalize text-foreground">
                    {session?.role ?? "reseller"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-secondary/25 p-4">
                  <p className="text-sm text-muted-foreground">Portal scope</p>
                  <p className="mt-1 text-sm leading-6 text-foreground">
                    Cart, checkout, product access, and {adminView ? "order operations." : "account workflow."}
                  </p>
                </div>
              </div>

              <Button className="mt-6 h-12 w-full" asChild>
                <Link to="/products">
                  Open Catalog <BarChart3 className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default PortalDashboard;
