import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, RefreshCw, ShieldCheck, Truck, Workflow } from "lucide-react";
import Layout from "@/components/layout/Layout";
import PortalNav from "@/components/auth/PortalNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FulfillmentStatus,
  SupplierIntegrationSettings,
  SupplierSubmissionStatus,
  formatAud,
  getOrders,
  getSupplierIntegrationSettings,
  retrySupplierSubmission,
  saveSupplierIntegrationSettings,
  updateOrderFulfillment,
} from "@/lib/orderManagement";
import { clearAuthSession, getAuthSession } from "@/lib/auth";

const supplierStatusClass: Record<SupplierSubmissionStatus, string> = {
  submitted: "bg-emerald-100 text-emerald-800",
  queued: "bg-amber-100 text-amber-800",
  not_configured: "bg-orange-100 text-orange-800",
  failed: "bg-red-100 text-red-800",
};

const fulfillmentStatusClass: Record<FulfillmentStatus, string> = {
  new: "bg-slate-100 text-slate-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

const OrdersAdmin = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState(getOrders());
  const [settings, setSettings] = useState<SupplierIntegrationSettings>(
    getSupplierIntegrationSettings(),
  );
  const [savingSettings, setSavingSettings] = useState(false);
  const [actioningOrderId, setActioningOrderId] = useState<string | null>(null);
  const session = getAuthSession();

  const refreshOrders = () => {
    setOrders(getOrders());
  };

  const summary = useMemo(() => {
    const open = orders.filter((order) => order.fulfillmentStatus !== "delivered").length;
    const needsSupplierAttention = orders.filter((order) => order.supplierStatus !== "submitted").length;
    const submitted = orders.filter((order) => order.supplierStatus === "submitted").length;
    return { total: orders.length, open, needsSupplierAttention, submitted };
  }, [orders]);

  const saveSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingSettings(true);
    saveSupplierIntegrationSettings(settings);
    setSavingSettings(false);
  };

  const withOrderAction = async (orderId: string, action: () => Promise<void> | void) => {
    setActioningOrderId(orderId);
    try {
      await action();
      refreshOrders();
    } finally {
      setActioningOrderId(null);
    }
  };

  const markFulfillment = async (orderId: string, status: FulfillmentStatus) => {
    await withOrderAction(orderId, async () => {
      if (status === "shipped") {
        const trackingNumber = window.prompt("Tracking number (optional)", "") ?? "";
        const trackingUrl = window.prompt("Tracking URL (optional)", "") ?? "";
        updateOrderFulfillment(orderId, {
          fulfillmentStatus: "shipped",
          trackingNumber: trackingNumber || undefined,
          trackingUrl: trackingUrl || undefined,
        });
        return;
      }

      updateOrderFulfillment(orderId, { fulfillmentStatus: status });
    });
  };

  const handleSignOut = () => {
    clearAuthSession();
    navigate("/login");
  };

  return (
    <Layout>
      <section className="relative overflow-hidden bg-gradient-hero py-14 md:py-20">
        <div className="absolute inset-0 opacity-20">
          <div className="h-full w-full bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:34px_34px]" />
        </div>
        <div className="container-wide relative">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_360px]">
            <div className="rounded-[2rem] border border-white/15 bg-primary/35 p-6 text-primary-foreground shadow-elevated backdrop-blur md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                Reseller Operations
              </p>
              <h1 className="mt-4 text-4xl font-bold leading-[0.96] md:text-5xl">
                Manage supplier submissions, fulfillment updates, and order operations in one place.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-primary-foreground/80 md:text-lg">
                This dashboard is the operational side of the reseller portal. Use it to control supplier handoff, review customer order detail, and keep fulfillment activity current.
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/15 bg-white/8 px-5 py-4">
                  <p className="text-3xl font-bold text-primary-foreground">{summary.total}</p>
                  <p className="mt-2 text-sm text-primary-foreground/72">orders tracked</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/8 px-5 py-4">
                  <p className="text-3xl font-bold text-primary-foreground">{summary.open}</p>
                  <p className="mt-2 text-sm text-primary-foreground/72">orders in active fulfillment</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/8 px-5 py-4">
                  <p className="text-3xl font-bold text-primary-foreground">{summary.submitted}</p>
                  <p className="mt-2 text-sm text-primary-foreground/72">already sent to supplier</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border/40 bg-card p-6 shadow-elevated md:p-7">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Workflow className="h-6 w-6" />
                </div>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </div>

              <p className="mt-5 text-lg font-semibold text-foreground">Portal Session</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Signed in as <span className="font-medium text-foreground">{session?.email ?? "admin"}</span>.
              </p>

              <div className="mt-6 space-y-4">
                {[
                  {
                    icon: ShieldCheck,
                    title: "Supplier controls",
                    description: "Switch between queued manual handling and webhook submission without leaving the portal.",
                  },
                  {
                    icon: Truck,
                    title: "Fulfillment actions",
                    description: "Move orders through processing, shipped, and delivered states and add tracking when required.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-border/60 bg-secondary/30 p-4"
                  >
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide space-y-8">
          <PortalNav />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
            <form
              onSubmit={saveSettings}
              className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card md:p-7"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Supplier Integration
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">Submission Settings</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Choose whether supplier submission stays manual in the portal or automatically sends after checkout through a webhook.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Mode</label>
                  <select
                    value={settings.mode}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        mode: event.target.value as SupplierIntegrationSettings["mode"],
                      }))
                    }
                    className="h-12 w-full rounded-xl border border-border/70 bg-secondary/45 px-3 text-sm"
                  >
                    <option value="manual">Manual Queue</option>
                    <option value="webhook">Webhook</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Supplier Webhook URL
                  </label>
                  <Input
                    value={settings.webhookUrl}
                    onChange={(event) =>
                      setSettings((prev) => ({ ...prev, webhookUrl: event.target.value }))
                    }
                    placeholder="https://supplier.example.com/api/orders"
                    className="h-12 border-border/70 bg-secondary/45"
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Auth Header Name
                  </label>
                  <Input
                    value={settings.authHeaderName || ""}
                    onChange={(event) =>
                      setSettings((prev) => ({ ...prev, authHeaderName: event.target.value }))
                    }
                    placeholder="X-API-Key"
                    className="h-12 border-border/70 bg-secondary/45"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Auth Header Value
                  </label>
                  <Input
                    value={settings.authHeaderValue || ""}
                    onChange={(event) =>
                      setSettings((prev) => ({ ...prev, authHeaderValue: event.target.value }))
                    }
                    placeholder="your-secret-key"
                    className="h-12 border-border/70 bg-secondary/45"
                  />
                </div>
              </div>

              <Button type="submit" className="mt-6 h-12" disabled={savingSettings}>
                {savingSettings ? "Saving..." : "Save Integration Settings"}
              </Button>
            </form>

            <div className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card md:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Workflow Notes
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">Portal guidance</h2>
              <div className="mt-5 space-y-4">
                {[
                  "Manual Queue keeps supplier submission under your control inside the portal.",
                  "Webhook mode is for automated supplier forwarding after checkout.",
                  "Tracking details can be added when an order moves into shipped status.",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-border/60 bg-secondary/25 px-4 py-3"
                  >
                    <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                    <p className="text-sm leading-6 text-muted-foreground">{item}</p>
                  </div>
                ))}
                <div className="rounded-2xl border border-border/60 bg-background p-4">
                  <p className="text-sm font-semibold text-foreground">
                    Orders needing supplier attention
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {summary.needsSupplierAttention} order{summary.needsSupplierAttention === 1 ? "" : "s"} currently need supplier action.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-foreground">Orders</h2>
              <Button variant="outline" size="sm" onClick={refreshOrders}>
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
              </Button>
            </div>

            {orders.length === 0 ? (
              <div className="rounded-2xl border border-border/60 bg-card p-6 text-muted-foreground shadow-card">
                No orders yet.
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card"
                >
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{order.orderNumber}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleString("en-AU")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${supplierStatusClass[order.supplierStatus]}`}
                      >
                        Supplier: {order.supplierStatus}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${fulfillmentStatusClass[order.fulfillmentStatus]}`}
                      >
                        Fulfillment: {order.fulfillmentStatus}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="space-y-3 text-sm">
                      <p>
                        <span className="text-muted-foreground">Customer:</span>{" "}
                        <span className="font-medium text-foreground">
                          {order.customer.firstName} {order.customer.lastName}
                        </span>
                        {order.customer.company ? ` (${order.customer.company})` : ""}
                      </p>
                      <p className="text-muted-foreground">
                        {order.customer.email} · {order.customer.phone}
                      </p>
                      <p className="text-muted-foreground">
                        {order.customer.address1}
                        {order.customer.address2 ? `, ${order.customer.address2}` : ""}, {order.customer.suburb},{" "}
                        {order.customer.state} {order.customer.postcode}, {order.customer.country}
                      </p>
                      <p className="font-semibold text-foreground">
                        Known value {formatAud(order.totalKnownValue)}
                        {order.poaLines > 0 ? ` · ${order.poaLines} POA line(s)` : ""}
                      </p>
                      {order.supplierMessage ? (
                        <p className="text-xs text-muted-foreground">
                          Supplier note: {order.supplierMessage}
                        </p>
                      ) : null}
                      {order.trackingNumber ? (
                        <p className="text-xs text-muted-foreground">
                          Tracking: {order.trackingNumber}
                          {order.trackingUrl ? (
                            <a
                              href={order.trackingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-2 text-accent hover:underline"
                            >
                              Open tracking
                            </a>
                          ) : null}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 lg:min-w-[190px] lg:flex-col">
                      {order.supplierStatus !== "submitted" ? (
                        <Button
                          size="sm"
                          onClick={() =>
                            withOrderAction(order.id, async () => {
                              await retrySupplierSubmission(order.id);
                            })
                          }
                          disabled={actioningOrderId === order.id}
                        >
                          Send to Supplier
                        </Button>
                      ) : null}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markFulfillment(order.id, "processing")}
                        disabled={actioningOrderId === order.id}
                      >
                        Mark Processing
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markFulfillment(order.id, "shipped")}
                        disabled={actioningOrderId === order.id}
                      >
                        Mark Shipped
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markFulfillment(order.id, "delivered")}
                        disabled={actioningOrderId === order.id}
                      >
                        Mark Delivered
                      </Button>
                    </div>
                  </div>

                  <details className="mt-4 border-t border-border pt-4">
                    <summary className="cursor-pointer text-sm font-medium text-foreground">
                      View Supplier Payload
                    </summary>
                    <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-secondary p-3 text-xs">
                      {JSON.stringify(order.supplierPayload, null, 2)}
                    </pre>
                  </details>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default OrdersAdmin;
