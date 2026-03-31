import { Link } from "react-router-dom";
import { ArrowRight, CreditCard, Package, ShoppingBag, Truck } from "lucide-react";
import Layout from "@/components/layout/Layout";
import PortalNav from "@/components/auth/PortalNav";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/hooks/use-auth-session";
import { formatAud, getOrdersForReseller } from "@/lib/orderManagement";

const formatStatusLabel = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const PortalOrders = () => {
  const { session } = useAuthSession();

  const orders = session
    ? getOrdersForReseller({ userId: session.userId, email: session.email })
    : [];

  const activeOrders = orders.filter((order) =>
    ["new", "processing", "shipped"].includes(order.fulfillmentStatus),
  ).length;
  const deliveredOrders = orders.filter((order) => order.fulfillmentStatus === "delivered").length;
  const totalKnownValue = orders.reduce((sum, order) => sum + order.totalKnownValue, 0);

  return (
    <Layout>
      <section className="bg-gradient-hero py-14 md:py-20">
        <div className="container-wide">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
            <div className="rounded-[2rem] border border-white/15 bg-white/6 p-6 shadow-elevated backdrop-blur md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Reseller Orders
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-[0.95] text-white md:text-5xl">
                Review every order placed through your reseller account.
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-7 text-white/80">
                See order numbers, customer delivery details, fulfillment status, and tracking from
                one reseller-facing history page.
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/15 bg-slate-950/35 p-6 text-white shadow-elevated backdrop-blur md:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Account scope
              </p>
              <p className="mt-4 text-lg font-semibold text-white">{session?.email}</p>
              <p className="mt-2 text-sm leading-6 text-white/72">
                This page only shows orders placed by the signed-in reseller account.
              </p>

              <Button className="mt-6 h-11 w-full rounded-full" asChild>
                <Link to="/products">
                  Create New Order <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide space-y-8">
          <PortalNav />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Orders placed", value: String(orders.length), icon: ShoppingBag },
              { label: "Active orders", value: String(activeOrders), icon: Truck },
              { label: "Delivered", value: String(deliveredOrders), icon: Package },
              { label: "Known spend", value: formatAud(totalKnownValue), icon: CreditCard },
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

          {orders.length === 0 ? (
            <div className="rounded-[1.75rem] border border-border/60 bg-card p-8 shadow-card">
              <p className="text-lg font-semibold text-foreground">No reseller orders yet</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Once you place an order while signed in, it will show here with customer detail,
                fulfillment progress, and tracking updates.
              </p>
              <Button className="mt-6" asChild>
                <Link to="/products">Browse Products</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-4">
                    <div>
                      <p className="text-lg font-semibold text-foreground">{order.orderNumber}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Created {new Date(order.createdAt).toLocaleString("en-AU")}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        Supplier: {formatStatusLabel(order.supplierStatus)}
                      </span>
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        Fulfillment: {formatStatusLabel(order.fulfillmentStatus)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_240px]">
                    <div className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-border/60 bg-secondary/25 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                            Customer
                          </p>
                          <p className="mt-3 text-base font-semibold text-foreground">
                            {order.customer.firstName} {order.customer.lastName}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {order.customer.company || "No company supplied"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-secondary/25 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                            Delivery
                          </p>
                          <p className="mt-3 text-sm leading-6 text-foreground">
                            {order.customer.address1}
                            {order.customer.address2 ? `, ${order.customer.address2}` : ""}
                            <br />
                            {order.customer.suburb}, {order.customer.state} {order.customer.postcode}
                            <br />
                            {order.customer.country}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-secondary/25 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                            Value
                          </p>
                          <p className="mt-3 text-2xl font-semibold text-foreground">
                            {formatAud(order.totalKnownValue)}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {order.items.length} item{order.items.length === 1 ? "" : "s"}
                            {order.poaLines > 0 ? ` · ${order.poaLines} POA line(s)` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border/60 bg-background">
                        <div className="border-b border-border/60 px-4 py-3">
                          <p className="text-sm font-semibold text-foreground">Order lines</p>
                        </div>
                        <div className="divide-y divide-border/60">
                          {order.items.map((item) => (
                            <div
                              key={`${order.id}-${item.code}`}
                              className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_88px_120px]"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground">
                                  {item.description}
                                </p>
                                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                                  {item.manufacturer} · {item.code}
                                </p>
                              </div>
                              <div className="text-sm text-muted-foreground md:text-right">
                                Qty {item.qty}
                              </div>
                              <div className="text-sm font-medium text-foreground md:text-right">
                                {item.price === null ? "POA" : formatAud(item.price * item.qty)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-2xl border border-border/60 bg-secondary/25 p-4">
                        <p className="text-sm font-semibold text-foreground">Supplier note</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {order.supplierMessage || "No supplier message available yet."}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-border/60 bg-secondary/25 p-4">
                        <p className="text-sm font-semibold text-foreground">Tracking</p>
                        {order.trackingNumber ? (
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {order.trackingNumber}
                            {order.trackingUrl ? (
                              <a
                                href={order.trackingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-2 font-medium text-accent hover:underline"
                              >
                                Open tracking
                              </a>
                            ) : null}
                          </p>
                        ) : (
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            No tracking information has been added yet.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default PortalOrders;
