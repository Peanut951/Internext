import { FormEvent, useMemo, useState } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
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
import { clearAuthSession } from "@/lib/auth";
import { RefreshCw } from "lucide-react";

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

  const refreshOrders = () => {
    setOrders(getOrders());
  };

  const summary = useMemo(() => {
    const open = orders.filter((order) => order.fulfillmentStatus !== "delivered").length;
    const needsSupplierAttention = orders.filter((order) => order.supplierStatus !== "submitted").length;
    return { total: orders.length, open, needsSupplierAttention };
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
      <section className="bg-gradient-hero py-14 md:py-20">
        <div className="container-wide">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground">Order Operations</h1>
            <Button variant="secondary" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
          <p className="text-primary-foreground/80 max-w-3xl">
            Manage customer orders, trigger supplier submissions, and update fulfillment status.
          </p>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide space-y-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="bg-card border border-border/60 rounded-xl p-4 shadow-card">
              <p className="text-sm text-muted-foreground mb-1">Total Orders</p>
              <p className="text-2xl font-bold text-foreground">{summary.total}</p>
            </div>
            <div className="bg-card border border-border/60 rounded-xl p-4 shadow-card">
              <p className="text-sm text-muted-foreground mb-1">Open Fulfillment</p>
              <p className="text-2xl font-bold text-foreground">{summary.open}</p>
            </div>
            <div className="bg-card border border-border/60 rounded-xl p-4 shadow-card">
              <p className="text-sm text-muted-foreground mb-1">Need Supplier Action</p>
              <p className="text-2xl font-bold text-foreground">{summary.needsSupplierAttention}</p>
            </div>
          </div>

          <form
            onSubmit={saveSettings}
            className="bg-card border border-border/60 rounded-2xl p-6 shadow-card space-y-4"
          >
            <h2 className="text-xl font-semibold text-foreground">Supplier Integration</h2>
            <p className="text-sm text-muted-foreground">
              Use manual mode to process supplier submissions from this dashboard, or webhook mode to
              auto-submit after checkout.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Mode</label>
                <select
                  value={settings.mode}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, mode: event.target.value as SupplierIntegrationSettings["mode"] }))
                  }
                  className="w-full bg-secondary border-0 rounded-md px-3 py-2"
                >
                  <option value="manual">Manual Queue</option>
                  <option value="webhook">Webhook</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Supplier Webhook URL</label>
                <Input
                  value={settings.webhookUrl}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, webhookUrl: event.target.value }))
                  }
                  placeholder="https://supplier.example.com/api/orders"
                  className="bg-secondary border-0"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Auth Header Name</label>
                <Input
                  value={settings.authHeaderName || ""}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, authHeaderName: event.target.value }))
                  }
                  placeholder="X-API-Key"
                  className="bg-secondary border-0"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Auth Header Value</label>
                <Input
                  value={settings.authHeaderValue || ""}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, authHeaderValue: event.target.value }))
                  }
                  placeholder="your-secret-key"
                  className="bg-secondary border-0"
                />
              </div>
            </div>

            <Button type="submit" disabled={savingSettings}>
              {savingSettings ? "Saving..." : "Save Integration Settings"}
            </Button>
          </form>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-foreground">Orders</h2>
              <Button variant="outline" size="sm" onClick={refreshOrders}>
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </Button>
            </div>

            {orders.length === 0 ? (
              <div className="bg-card border border-border/60 rounded-xl p-6 text-muted-foreground">
                No orders yet.
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="bg-card border border-border/60 rounded-2xl p-6 shadow-card">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{order.orderNumber}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleString("en-AU")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${supplierStatusClass[order.supplierStatus]}`}>
                        Supplier: {order.supplierStatus}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${fulfillmentStatusClass[order.fulfillmentStatus]}`}>
                        Fulfillment: {order.fulfillmentStatus}
                      </span>
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] gap-4">
                    <div className="space-y-3 text-sm">
                      <p>
                        <span className="text-muted-foreground">Customer:</span>{" "}
                        <span className="text-foreground font-medium">
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
                      <p className="text-foreground font-semibold">
                        Known value {formatAud(order.totalKnownValue)}
                        {order.poaLines > 0 ? ` · ${order.poaLines} POA line(s)` : ""}
                      </p>
                      {order.supplierMessage ? (
                        <p className="text-xs text-muted-foreground">Supplier note: {order.supplierMessage}</p>
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

                    <div className="flex flex-wrap lg:flex-col gap-2 lg:min-w-[170px]">
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
                    <pre className="mt-3 text-xs bg-secondary rounded-lg p-3 overflow-auto whitespace-pre-wrap break-words">
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

