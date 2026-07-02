import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Boxes,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Workflow,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import PortalNav from "@/components/auth/PortalNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FulfillmentStatus,
  OrderRecord,
  OrderReseller,
  SupplierIntegrationSettings,
  SupplierSubmissionStatus,
  fetchSharedOrdersResult,
  formatAud,
  getOrderItemSerialKey,
  getOrders,
  getSupplierIntegrationSettings,
  persistSharedOrder,
  removeOrder,
  saveSupplierIntegrationSettings,
  updateSharedOrderFulfillment,
  updateSharedOrderSerialNumbers,
} from "@/lib/orderManagement";
import { clearAuthSession } from "@/lib/auth";
import { useAuthSession } from "@/hooks/use-auth-session";

type OrderView = "all" | "needs_supplier" | "active" | "completed";
type ShipmentFormState = {
  trackingCarrier: string;
  trackingNumber: string;
  trackingUrl: string;
  expectedArrivalDate: string;
};
type ShipmentMessage = {
  tone: "success" | "error";
  text: string;
};
type ManualInvoiceDraft = {
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  itemCode: string;
  itemBrand: string;
  itemDescription: string;
  quantity: string;
  unitPrice: string;
  shippingTotal: string;
  notes: string;
};

const emptyManualInvoiceDraft: ManualInvoiceDraft = {
  firstName: "",
  lastName: "",
  company: "",
  email: "",
  phone: "",
  address1: "",
  address2: "",
  suburb: "",
  state: "NSW",
  postcode: "",
  country: "Australia",
  itemCode: "",
  itemBrand: "Internext",
  itemDescription: "",
  quantity: "1",
  unitPrice: "",
  shippingTotal: "0",
  notes: "",
};

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

const formatStatusLabel = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const OrdersAdmin = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [settings, setSettings] = useState<SupplierIntegrationSettings>(
    getSupplierIntegrationSettings(),
  );
  const [savingSettings, setSavingSettings] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [actioningOrderId, setActioningOrderId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<OrderView>("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [resellerFilter, setResellerFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState<SupplierSubmissionStatus | "all">("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<FulfillmentStatus | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [manualInvoiceOpen, setManualInvoiceOpen] = useState(false);
  const [manualInvoiceDraft, setManualInvoiceDraft] =
    useState<ManualInvoiceDraft>(emptyManualInvoiceDraft);
  const [manualInvoiceSaving, setManualInvoiceSaving] = useState(false);
  const [manualInvoiceMessage, setManualInvoiceMessage] = useState<ShipmentMessage | null>(null);
  const [shipmentForms, setShipmentForms] = useState<Record<string, ShipmentFormState>>({});
  const [shipmentMessages, setShipmentMessages] = useState<Record<string, ShipmentMessage>>({});
  const [serialDrafts, setSerialDrafts] = useState<Record<string, Record<string, string[]>>>({});
  const [serialMessages, setSerialMessages] = useState<Record<string, ShipmentMessage>>({});
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});
  const { session } = useAuthSession();

  const refreshOrders = async () => {
    setOrdersLoading(true);
    setOrdersError(null);
    const result = await fetchSharedOrdersResult({
      fallbackToLocal: false,
      mergeWithLocal: false,
    });
    setOrders(result.orders);
    if (!result.ok) {
      setOrdersError(
        result.message ||
          "Unable to load shared orders. Check Supabase order storage and admin session settings.",
      );
    }
    setOrdersLoading(false);
  };

  useEffect(() => {
    if (session?.role !== "admin") {
      return;
    }

    void (async () => {
      const localOrders = getOrders();
      if (localOrders.length > 0) {
        await Promise.all(localOrders.map((order) => persistSharedOrder(order)));
      }
      await refreshOrders();
    })();
  }, [session?.role]);

  const summary = useMemo(() => {
    const open = orders.filter(
      (order) => !["delivered", "cancelled"].includes(order.fulfillmentStatus),
    ).length;
    const needsSupplierAttention = orders.filter(
      (order) => order.supplierStatus !== "submitted",
    ).length;
    const submitted = orders.filter((order) => order.supplierStatus === "submitted").length;
    return { total: orders.length, open, needsSupplierAttention, submitted };
  }, [orders]);

  const queueMetrics = useMemo(
    () => [
      {
        label: "Queued supplier",
        value: orders.filter((order) => order.supplierStatus === "queued").length,
        note: "manual handoff still pending",
      },
      {
        label: "Processing",
        value: orders.filter((order) => order.fulfillmentStatus === "processing").length,
        note: "actively moving through workflow",
      },
      {
        label: "Shipped",
        value: orders.filter((order) => order.fulfillmentStatus === "shipped").length,
        note: "tracking can be reviewed now",
      },
      {
        label: "Tracking added",
        value: orders.filter((order) => Boolean(order.trackingNumber)).length,
        note: "orders with courier reference",
      },
    ],
    [orders],
  );

  const resellerOptions = useMemo(
    () =>
      Array.from(new Set(orders.map((order) => order.reseller.email).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [orders],
  );

  const customerOptions = useMemo(
    () =>
      Array.from(
        new Set(
          orders
            .map((order) =>
              `${order.customer.firstName} ${order.customer.lastName}`.trim() ||
              order.customer.email,
            )
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [orders],
  );

  const hasOrderFilters = Boolean(
    orderSearch.trim() ||
      resellerFilter !== "all" ||
      customerFilter !== "all" ||
      supplierFilter !== "all" ||
      fulfillmentFilter !== "all" ||
      dateFrom ||
      dateTo,
  );

  const filteredOrders = useMemo(() => {
    let nextOrders = orders;

    switch (activeView) {
      case "needs_supplier":
        nextOrders = orders.filter((order) => order.supplierStatus !== "submitted");
        break;
      case "active":
        nextOrders = orders.filter((order) =>
          ["new", "processing", "shipped"].includes(order.fulfillmentStatus),
        );
        break;
      case "completed":
        nextOrders = orders.filter((order) => order.fulfillmentStatus === "delivered");
        break;
      default:
        nextOrders = orders;
    }

    const normalizedSearch = orderSearch.trim().toLowerCase();
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;

    return nextOrders.filter((order) => {
      const createdTime = new Date(order.createdAt).getTime();
      const customerName = `${order.customer.firstName} ${order.customer.lastName}`.trim();

      if (fromTime !== null && createdTime < fromTime) {
        return false;
      }

      if (toTime !== null && createdTime > toTime) {
        return false;
      }

      if (resellerFilter !== "all" && order.reseller.email !== resellerFilter) {
        return false;
      }

      if (customerFilter !== "all" && customerName !== customerFilter) {
        return false;
      }

      if (supplierFilter !== "all" && order.supplierStatus !== supplierFilter) {
        return false;
      }

      if (fulfillmentFilter !== "all" && order.fulfillmentStatus !== fulfillmentFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableText = [
        order.orderNumber,
        order.reseller.email,
        order.customer.email,
        order.customer.phone,
        order.customer.company,
        customerName,
        order.customer.suburb,
        order.customer.state,
        order.customer.postcode,
        order.supplierStatus,
        order.fulfillmentStatus,
        ...order.items.flatMap((item) => [
          item.code,
          item.supplierCode,
          item.manufacturer,
          item.description,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [
    activeView,
    customerFilter,
    dateFrom,
    dateTo,
    fulfillmentFilter,
    orderSearch,
    orders,
    resellerFilter,
    supplierFilter,
  ]);

  const clearOrderFilters = () => {
    setOrderSearch("");
    setResellerFilter("all");
    setCustomerFilter("all");
    setSupplierFilter("all");
    setFulfillmentFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrderIds((current) => ({
      ...current,
      [orderId]: !(current[orderId] ?? false),
    }));
  };

  const updateManualInvoiceDraft = (field: keyof ManualInvoiceDraft, value: string) => {
    setManualInvoiceDraft((current) => ({ ...current, [field]: value }));
    setManualInvoiceMessage(null);
  };

  const createManualOrderNumber = () => {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `INX-${datePart}-${randomPart}`;
  };

  const createManualInvoiceId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };

  const normalizeMoney = (value: number) => Math.round(value * 100) / 100;

  const createManualInvoice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setManualInvoiceSaving(true);
    setManualInvoiceMessage(null);

    const quantity = Math.max(1, Math.floor(Number(manualInvoiceDraft.quantity) || 1));
    const unitPrice = Number(manualInvoiceDraft.unitPrice);
    const shippingTotal = Math.max(0, Number(manualInvoiceDraft.shippingTotal) || 0);
    const itemDescription = manualInvoiceDraft.itemDescription.trim();
    const itemCode = manualInvoiceDraft.itemCode.trim() || "MANUAL";
    const customerEmail = manualInvoiceDraft.email.trim().toLowerCase();

    if (!customerEmail || !itemDescription || !Number.isFinite(unitPrice) || unitPrice < 0) {
      setManualInvoiceMessage({
        tone: "error",
        text: "Enter a customer email, item description, and valid unit price before creating the invoice.",
      });
      setManualInvoiceSaving(false);
      return;
    }

    const timestamp = new Date().toISOString();
    const orderNumber = createManualOrderNumber();
    const itemsSubtotal = normalizeMoney(unitPrice * quantity);
    const gstAmount = normalizeMoney(itemsSubtotal * 0.1);
    const totalKnownValue = normalizeMoney(itemsSubtotal + gstAmount + shippingTotal);
    const reseller: OrderReseller = {
      userId: session?.userId,
      email: session?.email || "admin@internext.com.au",
      role: "admin",
    };
    const item = {
      code: itemCode,
      manufacturer: manualInvoiceDraft.itemBrand.trim() || "Internext",
      description: itemDescription,
      price: normalizeMoney(unitPrice),
      priceText: "Ex GST",
      rrp: null,
      supplierCode: itemCode,
      qty: quantity,
    };
    const customer = {
      firstName: manualInvoiceDraft.firstName.trim(),
      lastName: manualInvoiceDraft.lastName.trim(),
      company: manualInvoiceDraft.company.trim(),
      email: customerEmail,
      phone: manualInvoiceDraft.phone.trim(),
      address1: manualInvoiceDraft.address1.trim(),
      address2: manualInvoiceDraft.address2.trim(),
      suburb: manualInvoiceDraft.suburb.trim(),
      state: manualInvoiceDraft.state.trim(),
      postcode: manualInvoiceDraft.postcode.trim(),
      country: manualInvoiceDraft.country.trim() || "Australia",
      notes: manualInvoiceDraft.notes.trim(),
    };
    const supplierPayload = {
      orderNumber,
      createdAt: timestamp,
      reseller: {
        businessName: "Internext",
        website: window.location.origin,
        portalUserEmail: reseller.email,
        portalUserRole: reseller.role,
      },
      customer,
      items: [
        {
          code: item.code,
          supplierCode: item.supplierCode,
          description: item.description,
          brand: item.manufacturer,
          quantity,
          unitPrice,
        },
      ],
      totals: {
        subtotal: itemsSubtotal,
        itemsSubtotal,
        gstAmount,
        shippingTotal,
        shippingName: shippingTotal > 0 ? "Manual shipping" : undefined,
        poaLines: 0,
        totalKnownValue,
      },
    };
    const manualOrder: OrderRecord = {
      id: createManualInvoiceId(),
      orderNumber,
      createdAt: timestamp,
      updatedAt: timestamp,
      reseller,
      customer,
      items: [item],
      subtotal: itemsSubtotal,
      itemsSubtotal,
      gstAmount,
      shippingTotal,
      shippingName: shippingTotal > 0 ? "Manual shipping" : undefined,
      poaLines: 0,
      totalKnownValue,
      paymentStatus: "paid",
      fulfillmentStatus: "new",
      supplierStatus: "queued",
      supplierMessage: "Manual invoice created in the admin portal.",
      supplierPayload,
    };

    const saved = await persistSharedOrder(manualOrder);
    if (!saved) {
      setManualInvoiceMessage({
        tone: "error",
        text: "Invoice could not be saved to Supabase. Check your admin session and environment variables.",
      });
      setManualInvoiceSaving(false);
      return;
    }

    setOrders((current) => [manualOrder, ...current.filter((order) => order.id !== manualOrder.id)]);
    setManualInvoiceDraft(emptyManualInvoiceDraft);
    setManualInvoiceOpen(false);
    setManualInvoiceMessage({
      tone: "success",
      text: `Invoice ${orderNumber} created and added to the order list.`,
    });
    await refreshOrders();
    setManualInvoiceSaving(false);
  };

  const removeInvoice = async (order: OrderRecord) => {
    const confirmed = window.confirm(
      `Remove invoice ${order.orderNumber}? This deletes it from Internext shared order storage and it will disappear for all admins.`,
    );
    if (!confirmed) {
      return;
    }

    await withOrderAction(order.id, async () => {
      const response = await fetch("/api/order-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notificationType: "remove_invoice", order }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.ok === false) {
        throw new Error(
          typeof payload.message === "string"
            ? payload.message
            : "Invoice could not be removed from shared storage.",
        );
      }

      removeOrder(order.id);
      setOrders((current) => current.filter((currentOrder) => currentOrder.id !== order.id));
    });
  };

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
      await refreshOrders();
    } finally {
      setActioningOrderId(null);
    }
  };

  const getShipmentForm = (order: OrderRecord): ShipmentFormState =>
    shipmentForms[order.id] ?? {
      trackingCarrier: order.trackingCarrier ?? "",
      trackingNumber: order.trackingNumber ?? "",
      trackingUrl: order.trackingUrl ?? "",
      expectedArrivalDate: order.expectedArrivalDate ?? "",
    };

  const updateShipmentForm = (
    order: OrderRecord,
    field: keyof ShipmentFormState,
    value: string,
  ) => {
    setShipmentForms((current) => ({
      ...current,
      [order.id]: {
        ...getShipmentForm(order),
        ...current[order.id],
        [field]: value,
      },
    }));
    setShipmentMessages((current) => {
      const next = { ...current };
      delete next[order.id];
      return next;
    });
  };

  const getOrderSerialDraft = (order: OrderRecord) =>
    serialDrafts[order.id] ?? order.serialNumbers ?? {};

  const getSerialValue = (
    order: OrderRecord,
    item: OrderRecord["items"][number],
    itemIndex: number,
    unitIndex: number,
  ) => {
    const key = getOrderItemSerialKey(item, itemIndex);
    return getOrderSerialDraft(order)[key]?.[unitIndex] ?? "";
  };

  const updateSerialDraft = (
    order: OrderRecord,
    item: OrderRecord["items"][number],
    itemIndex: number,
    unitIndex: number,
    value: string,
  ) => {
    const key = getOrderItemSerialKey(item, itemIndex);
    const unitCount = Math.max(1, item.qty || 1);

    setSerialDrafts((current) => {
      const orderSerials = current[order.id] ?? order.serialNumbers ?? {};
      const values = [...(orderSerials[key] ?? Array(unitCount).fill(""))];
      values[unitIndex] = value;

      return {
        ...current,
        [order.id]: {
          ...orderSerials,
          [key]: values,
        },
      };
    });

    setSerialMessages((current) => {
      const next = { ...current };
      delete next[order.id];
      return next;
    });
  };

  const saveSerialNumbers = async (order: OrderRecord) => {
    await withOrderAction(order.id, async () => {
      const serialNumbers = order.items.reduce<Record<string, string[]>>((acc, item, itemIndex) => {
        const key = getOrderItemSerialKey(item, itemIndex);
        const unitCount = Math.max(1, item.qty || 1);
        const draftValues = getOrderSerialDraft(order)[key] ?? [];
        acc[key] = Array.from({ length: unitCount }, (_, unitIndex) =>
          (draftValues[unitIndex] ?? "").trim(),
        );
        return acc;
      }, {});

      const updatedOrder = await updateSharedOrderSerialNumbers(order.id, serialNumbers);
      if (!updatedOrder) {
        throw new Error("Order serial numbers could not be saved.");
      }

      setSerialDrafts((current) => ({
        ...current,
        [order.id]: serialNumbers,
      }));
      setSerialMessages((current) => ({
        ...current,
        [order.id]: {
          tone: "success",
          text: "Serial numbers saved for this order.",
        },
      }));
    });
  };

  const sendShipmentEmail = async (order: OrderRecord) => {
    const response = await fetch("/api/order-notification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notificationType: "shipment", order }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.customerEmailSent === false) {
      throw new Error(
        typeof payload.customerEmailMessage === "string"
          ? payload.customerEmailMessage
          : typeof payload.message === "string"
            ? payload.message
            : "Shipment email workflow did not accept the request.",
      );
    }
  };

  const markFulfillment = async (orderId: string, status: FulfillmentStatus) => {
    await withOrderAction(orderId, async () => {
      await updateSharedOrderFulfillment(orderId, { fulfillmentStatus: status });
    });
  };

  const markShipped = async (order: OrderRecord) => {
    const shipmentForm = getShipmentForm(order);
    const trackingCarrier = shipmentForm.trackingCarrier.trim();
    const trackingNumber = shipmentForm.trackingNumber.trim();
    const trackingUrl = shipmentForm.trackingUrl.trim();
    const expectedArrivalDate = shipmentForm.expectedArrivalDate.trim();

    if (!trackingCarrier || !trackingNumber || !trackingUrl || !expectedArrivalDate) {
      setShipmentMessages((current) => ({
        ...current,
        [order.id]: {
          tone: "error",
          text: "Enter the carrier, tracking number, tracking link, and expected arrival date before marking this order as shipped.",
        },
      }));
      return;
    }

    await withOrderAction(order.id, async () => {
      const updatedOrder = await updateSharedOrderFulfillment(order.id, {
        fulfillmentStatus: "shipped",
        trackingCarrier,
        trackingNumber,
        trackingUrl,
        expectedArrivalDate,
      });

      if (!updatedOrder) {
        throw new Error("Order could not be updated.");
      }

      try {
        await sendShipmentEmail(updatedOrder);
        setShipmentMessages((current) => ({
          ...current,
          [order.id]: {
            tone: "success",
            text: `Marked shipped and emailed tracking details to ${updatedOrder.customer.email}.`,
          },
        }));
      } catch (error) {
        setShipmentMessages((current) => ({
          ...current,
          [order.id]: {
            tone: "error",
            text:
              error instanceof Error
                ? `Marked shipped, but the customer shipment email did not send: ${error.message}`
                : "Marked shipped, but the customer shipment email did not send.",
          },
        }));
      }
    });
  };

  const handleSignOut = async () => {
    await clearAuthSession();
    navigate("/login");
  };

  return (
    <Layout>
      <section className="relative overflow-hidden bg-gradient-hero py-8 md:py-10">
        <div className="absolute inset-0 opacity-20">
          <div className="h-full w-full bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:34px_34px]" />
        </div>
        <div className="container-wide relative space-y-5">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
            <div className="space-y-4">
              <div className="rounded-[2rem] border border-white/15 bg-white/6 p-6 shadow-elevated backdrop-blur md:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                  Reseller Operations
                </p>
                <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-[0.96] text-white md:text-[2.6rem]">
                  Supplier handoff and order visibility in one reseller workspace.
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-white md:text-[1.05rem]">
                  Use this portal to move between customer order review, supplier submission, and
                  fulfillment updates without jumping between disconnected tools.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button className="h-11 rounded-full px-5" asChild>
                    <Link to="/products">
                      Open Catalog <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 rounded-full border-white/20 bg-white/5 px-5 text-white hover:bg-white/10 hover:text-white"
                    asChild
                  >
                    <Link to="/portal">Portal Home</Link>
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Orders tracked",
                    value: summary.total,
                    note: "all logged orders",
                    icon: Boxes,
                  },
                  {
                    label: "Active fulfillment",
                    value: summary.open,
                    note: "still moving through workflow",
                    icon: Truck,
                  },
                  {
                    label: "Sent to supplier",
                    value: summary.submitted,
                    note: "already handed off",
                    icon: Workflow,
                  },
                  {
                    label: "Needs attention",
                    value: summary.needsSupplierAttention,
                    note: "awaiting supplier action",
                    icon: ShieldCheck,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1.5rem] border border-white/14 bg-white/7 p-4 shadow-card backdrop-blur"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <p className="text-3xl font-bold text-white">{item.value}</p>
                    </div>
                    <p className="mt-4 text-sm font-semibold text-white">{item.label}</p>
                    <p className="mt-1 text-sm leading-5 text-white">{item.note}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/15 bg-slate-950/35 p-6 text-white shadow-elevated backdrop-blur md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Workflow className="h-6 w-6" />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              </div>

              <p className="mt-5 text-lg font-semibold text-white">Portal Session</p>
              <p className="mt-2 text-sm leading-6 text-white/76">
                Signed in as <span className="font-medium text-white">{session?.email ?? "admin"}</span>.
              </p>

              <div className="mt-5 space-y-3">
                {[
                  {
                    icon: Boxes,
                    title: "Operational scope",
                    description: "Review orders and move fulfillment states from one portal view.",
                  },
                  {
                    icon: ShoppingCart,
                    title: "Commercial context",
                    description: "Jump back into product browsing, cart, and checkout when needed.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/12 bg-white/6 p-4"
                  >
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-white/78">{item.description}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-white/12 bg-white/6 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  Current focus
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-slate-950/20 px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/55">
                      Supplier action
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {summary.needsSupplierAttention}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-950/20 px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/55">
                      Active orders
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white">{summary.open}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/80">
                  {summary.needsSupplierAttention} order
                  {summary.needsSupplierAttention === 1 ? "" : "s"} currently need supplier action
                  and {summary.open} remain active in fulfillment.
                </p>
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
                Choose whether supplier submission stays manual in the portal or automatically sends
                after checkout through a webhook.
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
                    {summary.needsSupplierAttention} order
                    {summary.needsSupplierAttention === 1 ? "" : "s"} currently need supplier
                    action.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card md:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                    Operations Queue
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-foreground">
                    Order handling workspace
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                    Review customer detail, see what is waiting on supplier action, and move each
                    order through fulfillment without opening separate tools.
                  </p>
                </div>

                <Button variant="outline" size="sm" onClick={refreshOrders}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
              </div>

              {ordersError ? (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {ordersError}
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                {[
                  {
                    id: "all" as const,
                    label: "All orders",
                    count: orders.length,
                  },
                  {
                    id: "needs_supplier" as const,
                    label: "Needs supplier",
                    count: orders.filter((order) => order.supplierStatus !== "submitted").length,
                  },
                  {
                    id: "active" as const,
                    label: "Active fulfillment",
                    count: orders.filter((order) =>
                      ["new", "processing", "shipped"].includes(order.fulfillmentStatus),
                    ).length,
                  },
                  {
                    id: "completed" as const,
                    label: "Delivered",
                    count: orders.filter((order) => order.fulfillmentStatus === "delivered")
                      .length,
                  },
                ].map((view) => {
                  const isActive = activeView === view.id;

                  return (
                    <button
                      key={view.id}
                      type="button"
                      onClick={() => setActiveView(view.id)}
                      className={`inline-flex items-center gap-3 rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                        isActive
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border/70 bg-secondary/35 text-foreground hover:bg-secondary/60"
                      }`}
                    >
                      <span>{view.label}</span>
                      <span
                        className={`inline-flex min-w-7 items-center justify-center rounded-full px-2 py-0.5 text-xs ${
                          isActive
                            ? "bg-white/15 text-primary-foreground"
                            : "bg-background text-muted-foreground"
                        }`}
                      >
                        {view.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 rounded-2xl border border-border/60 bg-secondary/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Order filters</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Showing {filteredOrders.length} of {orders.length} order
                      {orders.length === 1 ? "" : "s"}.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearOrderFilters}
                    disabled={!hasOrderFilters}
                  >
                    Clear filters
                  </Button>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="xl:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Search
                    </label>
                    <Input
                      value={orderSearch}
                      onChange={(event) => setOrderSearch(event.target.value)}
                      placeholder="Order, customer, reseller, SKU, suburb..."
                      className="h-11 border-border/70 bg-background"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Date from
                    </label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(event) => setDateFrom(event.target.value)}
                      className="h-11 border-border/70 bg-background"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Date to
                    </label>
                    <Input
                      type="date"
                      value={dateTo}
                      min={dateFrom || undefined}
                      onChange={(event) => setDateTo(event.target.value)}
                      className="h-11 border-border/70 bg-background"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Reseller
                    </label>
                    <select
                      value={resellerFilter}
                      onChange={(event) => setResellerFilter(event.target.value)}
                      className="h-11 w-full rounded-xl border border-border/70 bg-background px-3 text-sm"
                    >
                      <option value="all">All resellers</option>
                      {resellerOptions.map((email) => (
                        <option key={email} value={email}>
                          {email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Customer
                    </label>
                    <select
                      value={customerFilter}
                      onChange={(event) => setCustomerFilter(event.target.value)}
                      className="h-11 w-full rounded-xl border border-border/70 bg-background px-3 text-sm"
                    >
                      <option value="all">All customers</option>
                      {customerOptions.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Supplier status
                    </label>
                    <select
                      value={supplierFilter}
                      onChange={(event) =>
                        setSupplierFilter(event.target.value as SupplierSubmissionStatus | "all")
                      }
                      className="h-11 w-full rounded-xl border border-border/70 bg-background px-3 text-sm"
                    >
                      <option value="all">All supplier statuses</option>
                      {(["queued", "submitted", "not_configured", "failed"] as const).map(
                        (status) => (
                          <option key={status} value={status}>
                            {formatStatusLabel(status)}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Fulfillment
                    </label>
                    <select
                      value={fulfillmentFilter}
                      onChange={(event) =>
                        setFulfillmentFilter(event.target.value as FulfillmentStatus | "all")
                      }
                      className="h-11 w-full rounded-xl border border-border/70 bg-background px-3 text-sm"
                    >
                      <option value="all">All fulfillment statuses</option>
                      {(["new", "processing", "shipped", "delivered", "cancelled"] as const).map(
                        (status) => (
                          <option key={status} value={status}>
                            {formatStatusLabel(status)}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-border/60 bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Manual invoice</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Create an Internext invoice and add it to the shared order list.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setManualInvoiceOpen((current) => !current)}
                    disabled={manualInvoiceSaving}
                  >
                    {manualInvoiceOpen ? "Close Invoice Form" : "Create Invoice"}
                  </Button>
                </div>

                {manualInvoiceMessage ? (
                  <p
                    className={`mt-4 rounded-lg px-3 py-2 text-sm ${
                      manualInvoiceMessage.tone === "success"
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-red-50 text-red-800"
                    }`}
                  >
                    {manualInvoiceMessage.text}
                  </p>
                ) : null}

                {manualInvoiceOpen ? (
                  <form onSubmit={createManualInvoice} className="mt-5 space-y-5">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">
                          First name
                        </label>
                        <Input
                          value={manualInvoiceDraft.firstName}
                          onChange={(event) =>
                            updateManualInvoiceDraft("firstName", event.target.value)
                          }
                          className="h-11 border-border/70 bg-secondary/20"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">
                          Last name
                        </label>
                        <Input
                          value={manualInvoiceDraft.lastName}
                          onChange={(event) =>
                            updateManualInvoiceDraft("lastName", event.target.value)
                          }
                          className="h-11 border-border/70 bg-secondary/20"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">
                          Email *
                        </label>
                        <Input
                          type="email"
                          value={manualInvoiceDraft.email}
                          onChange={(event) =>
                            updateManualInvoiceDraft("email", event.target.value)
                          }
                          className="h-11 border-border/70 bg-secondary/20"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">
                          Phone
                        </label>
                        <Input
                          value={manualInvoiceDraft.phone}
                          onChange={(event) =>
                            updateManualInvoiceDraft("phone", event.target.value)
                          }
                          className="h-11 border-border/70 bg-secondary/20"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-foreground">
                          Company
                        </label>
                        <Input
                          value={manualInvoiceDraft.company}
                          onChange={(event) =>
                            updateManualInvoiceDraft("company", event.target.value)
                          }
                          className="h-11 border-border/70 bg-secondary/20"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-foreground">
                          Address line 1
                        </label>
                        <Input
                          value={manualInvoiceDraft.address1}
                          onChange={(event) =>
                            updateManualInvoiceDraft("address1", event.target.value)
                          }
                          className="h-11 border-border/70 bg-secondary/20"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">
                          Address line 2
                        </label>
                        <Input
                          value={manualInvoiceDraft.address2}
                          onChange={(event) =>
                            updateManualInvoiceDraft("address2", event.target.value)
                          }
                          className="h-11 border-border/70 bg-secondary/20"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">
                          Suburb
                        </label>
                        <Input
                          value={manualInvoiceDraft.suburb}
                          onChange={(event) =>
                            updateManualInvoiceDraft("suburb", event.target.value)
                          }
                          className="h-11 border-border/70 bg-secondary/20"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">
                          State
                        </label>
                        <Input
                          value={manualInvoiceDraft.state}
                          onChange={(event) =>
                            updateManualInvoiceDraft("state", event.target.value)
                          }
                          className="h-11 border-border/70 bg-secondary/20"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">
                          Postcode
                        </label>
                        <Input
                          value={manualInvoiceDraft.postcode}
                          onChange={(event) =>
                            updateManualInvoiceDraft("postcode", event.target.value)
                          }
                          className="h-11 border-border/70 bg-secondary/20"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">
                          Item code
                        </label>
                        <Input
                          value={manualInvoiceDraft.itemCode}
                          onChange={(event) =>
                            updateManualInvoiceDraft("itemCode", event.target.value)
                          }
                          placeholder="SKU or reference"
                          className="h-11 border-border/70 bg-secondary/20"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">
                          Brand
                        </label>
                        <Input
                          value={manualInvoiceDraft.itemBrand}
                          onChange={(event) =>
                            updateManualInvoiceDraft("itemBrand", event.target.value)
                          }
                          className="h-11 border-border/70 bg-secondary/20"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">
                          Quantity
                        </label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={manualInvoiceDraft.quantity}
                          onChange={(event) =>
                            updateManualInvoiceDraft("quantity", event.target.value)
                          }
                          className="h-11 border-border/70 bg-secondary/20"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">
                          Unit price ex GST *
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={manualInvoiceDraft.unitPrice}
                          onChange={(event) =>
                            updateManualInvoiceDraft("unitPrice", event.target.value)
                          }
                          className="h-11 border-border/70 bg-secondary/20"
                          required
                        />
                      </div>
                      <div className="md:col-span-2 xl:col-span-3">
                        <label className="mb-2 block text-sm font-medium text-foreground">
                          Item description *
                        </label>
                        <Textarea
                          value={manualInvoiceDraft.itemDescription}
                          onChange={(event) =>
                            updateManualInvoiceDraft("itemDescription", event.target.value)
                          }
                          className="min-h-24 border-border/70 bg-secondary/20"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">
                          Shipping
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={manualInvoiceDraft.shippingTotal}
                          onChange={(event) =>
                            updateManualInvoiceDraft("shippingTotal", event.target.value)
                          }
                          className="h-11 border-border/70 bg-secondary/20"
                        />
                      </div>
                      <div className="md:col-span-2 xl:col-span-4">
                        <label className="mb-2 block text-sm font-medium text-foreground">
                          Notes
                        </label>
                        <Textarea
                          value={manualInvoiceDraft.notes}
                          onChange={(event) =>
                            updateManualInvoiceDraft("notes", event.target.value)
                          }
                          className="min-h-20 border-border/70 bg-secondary/20"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Button type="submit" disabled={manualInvoiceSaving}>
                        {manualInvoiceSaving ? "Creating..." : "Create Invoice"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setManualInvoiceDraft(emptyManualInvoiceDraft);
                          setManualInvoiceOpen(false);
                          setManualInvoiceMessage(null);
                        }}
                        disabled={manualInvoiceSaving}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : null}
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {queueMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-2xl border border-border/60 bg-secondary/25 px-4 py-4"
                  >
                    <p className="text-sm font-semibold text-foreground">{metric.label}</p>
                    <p className="mt-3 text-3xl font-semibold text-foreground">{metric.value}</p>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">{metric.note}</p>
                  </div>
                ))}
              </div>
            </div>

            {ordersLoading ? (
              <div className="rounded-2xl border border-border/60 bg-card p-6 text-muted-foreground shadow-card">
                Loading shared orders...
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-2xl border border-border/60 bg-card p-6 text-muted-foreground shadow-card">
                No orders yet.
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="rounded-2xl border border-border/60 bg-card p-6 text-muted-foreground shadow-card">
                No orders match the current view.
              </div>
            ) : (
              filteredOrders.map((order) => {
                const isExpanded = expandedOrderIds[order.id] ?? false;
                const customerName =
                  `${order.customer.firstName} ${order.customer.lastName}`.trim() ||
                  order.customer.email;

                return (
                <div
                  key={order.id}
                  className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-card shadow-card"
                >
                  <div className="border-b border-border/60 px-6 py-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            {order.orderNumber}
                          </h3>
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            Paid
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Created {new Date(order.createdAt).toLocaleString("en-AU")} · Updated{" "}
                          {new Date(order.updatedAt).toLocaleString("en-AU")}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {customerName} · {order.customer.email} · {order.items.length} line
                          {order.items.length === 1 ? "" : "s"} · {formatAud(order.totalKnownValue)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${supplierStatusClass[order.supplierStatus]}`}
                        >
                          Supplier: {formatStatusLabel(order.supplierStatus)}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${fulfillmentStatusClass[order.fulfillmentStatus]}`}
                        >
                          Fulfillment: {formatStatusLabel(order.fulfillmentStatus)}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => toggleOrderExpanded(order.id)}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? "Hide Details" : "View Details"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => removeInvoice(order)}
                          disabled={actioningOrderId === order.id}
                        >
                          {actioningOrderId === order.id ? "Removing..." : "Remove Invoice"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {isExpanded ? (
                  <div className="grid gap-6 px-6 py-6 xl:grid-cols-[minmax(0,1.5fr)_292px]">
                    <div className="space-y-5">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-border/60 bg-secondary/25 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                            Reseller
                          </p>
                          <p className="mt-3 break-all text-base font-semibold leading-6 text-foreground">
                            {order.reseller.email}
                          </p>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Role: {formatStatusLabel(order.reseller.role)}
                          </p>
                          <p className="mt-3 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                            {order.reseller.userId
                              ? `User ID ${order.reseller.userId.slice(0, 8)}...`
                              : "Legacy order without account ID"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-secondary/25 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                            Customer
                          </p>
                          <p className="mt-3 text-base font-semibold leading-6 text-foreground">
                            {order.customer.firstName} {order.customer.lastName}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {order.customer.company || "No company supplied"}
                          </p>
                          <p className="mt-3 break-all text-sm text-muted-foreground">
                            {order.customer.email}
                          </p>
                          <p className="text-sm text-muted-foreground">{order.customer.phone}</p>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-secondary/25 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                            Delivery
                          </p>
                          <p className="mt-3 text-sm leading-6 text-foreground">
                            {order.customer.address1}
                            {order.customer.address2 ? `, ${order.customer.address2}` : ""}
                            <br />
                            {order.customer.suburb}, {order.customer.state}{" "}
                            {order.customer.postcode}
                            <br />
                            {order.customer.country}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-secondary/25 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                            Commercial
                          </p>
                          <p className="mt-3 text-2xl font-semibold text-foreground">
                            {formatAud(order.totalKnownValue)}
                          </p>
                          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                            <p>Items: {formatAud(order.itemsSubtotal)}</p>
                            {order.gstAmount > 0 ? <p>GST: {formatAud(order.gstAmount)}</p> : null}
                            <p>Shipping: {formatAud(order.shippingTotal)}</p>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {order.items.length} item{order.items.length === 1 ? "" : "s"}
                            {order.poaLines > 0 ? ` · ${order.poaLines} POA line(s)` : ""}
                          </p>
                          <p className="mt-3 text-sm text-muted-foreground">
                            Supplier ref visible in payload and ready for handoff.
                          </p>
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">Order lines</p>
                            <p className="text-sm text-muted-foreground">
                              SKU, quantity, sell value, and unit serial numbers
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                              {order.items.length} line{order.items.length === 1 ? "" : "s"}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => saveSerialNumbers(order)}
                              disabled={actioningOrderId === order.id}
                            >
                              {actioningOrderId === order.id ? "Saving..." : "Save Serial Numbers"}
                            </Button>
                          </div>
                        </div>

                        <div className="divide-y divide-border/60">
                          {order.items.map((item, itemIndex) => (
                            <div
                              key={`${order.id}-${itemIndex}-${item.code}`}
                              className="px-4 py-4"
                            >
                              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_72px_120px]">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold leading-6 text-foreground">
                                    {item.description}
                                  </p>
                                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                                    {item.manufacturer} · {item.code}
                                    {item.supplierCode ? ` · Ref ${item.supplierCode}` : ""}
                                  </p>
                                </div>
                                <div className="text-sm text-muted-foreground md:text-right">
                                  Qty {item.qty}
                                </div>
                                <div className="text-sm font-medium text-foreground md:text-right">
                                  {item.price === null ? "POA" : formatAud(item.price * item.qty)}
                                </div>
                              </div>

                              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {Array.from({ length: Math.max(1, item.qty || 1) }, (_, unitIndex) => (
                                  <label
                                    key={`${order.id}-${itemIndex}-${unitIndex}`}
                                    className="space-y-1"
                                  >
                                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                      Serial number {item.qty > 1 ? unitIndex + 1 : ""}
                                    </span>
                                    <Input
                                      value={getSerialValue(order, item, itemIndex, unitIndex)}
                                      onChange={(event) =>
                                        updateSerialDraft(
                                          order,
                                          item,
                                          itemIndex,
                                          unitIndex,
                                          event.target.value,
                                        )
                                      }
                                      placeholder="Enter serial number"
                                    />
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        {serialMessages[order.id] ? (
                          <div className="border-t border-border/60 px-4 py-3">
                            <p
                              className={`rounded-lg px-3 py-2 text-sm ${
                                serialMessages[order.id].tone === "success"
                                  ? "bg-emerald-50 text-emerald-800"
                                  : "bg-red-50 text-red-800"
                              }`}
                            >
                              {serialMessages[order.id].text}
                            </p>
                          </div>
                        ) : null}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-border/60 bg-secondary/25 p-4">
                          <p className="text-sm font-semibold text-foreground">Supplier message</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {order.supplierMessage ||
                              "No supplier message recorded for this order yet."}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-secondary/25 p-4">
                          <p className="text-sm font-semibold text-foreground">Tracking</p>
                          {order.trackingNumber ? (
                            <div className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">
                              {order.trackingCarrier ? (
                                <p>
                                  Carrier:{" "}
                                  <span className="font-medium text-foreground">
                                    {order.trackingCarrier}
                                  </span>
                                </p>
                              ) : null}
                              <p>
                                Tracking:{" "}
                                <span className="font-medium text-foreground">
                                  {order.trackingNumber}
                                </span>
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
                              {order.expectedArrivalDate ? (
                                <p>
                                  Expected arrival:{" "}
                                  <span className="font-medium text-foreground">
                                    {new Date(order.expectedArrivalDate).toLocaleDateString("en-AU")}
                                  </span>
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              No tracking information has been added yet.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-2xl border border-border/60 bg-secondary/25 p-4">
                        <p className="text-sm font-semibold text-foreground">Workflow actions</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Enter shipment details before emailing the customer.
                        </p>

                        <div className="mt-4 space-y-3 rounded-xl border border-border/60 bg-background p-3">
                          <div>
                            <label
                              htmlFor={`carrier-${order.id}`}
                              className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                            >
                              Carrier
                            </label>
                            <Input
                              id={`carrier-${order.id}`}
                              value={getShipmentForm(order).trackingCarrier}
                              onChange={(event) =>
                                updateShipmentForm(order, "trackingCarrier", event.target.value)
                              }
                              placeholder="Australia Post, StarTrack, TNT..."
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`tracking-number-${order.id}`}
                              className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                            >
                              Tracking number
                            </label>
                            <Input
                              id={`tracking-number-${order.id}`}
                              value={getShipmentForm(order).trackingNumber}
                              onChange={(event) =>
                                updateShipmentForm(order, "trackingNumber", event.target.value)
                              }
                              placeholder="Enter tracking reference"
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`tracking-link-${order.id}`}
                              className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                            >
                              Tracking link
                            </label>
                            <Input
                              id={`tracking-link-${order.id}`}
                              type="url"
                              value={getShipmentForm(order).trackingUrl}
                              onChange={(event) =>
                                updateShipmentForm(order, "trackingUrl", event.target.value)
                              }
                              placeholder="https://..."
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`expected-arrival-${order.id}`}
                              className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                            >
                              Expected arrival date
                            </label>
                            <Input
                              id={`expected-arrival-${order.id}`}
                              type="date"
                              value={getShipmentForm(order).expectedArrivalDate}
                              onChange={(event) =>
                                updateShipmentForm(order, "expectedArrivalDate", event.target.value)
                              }
                              className="mt-2"
                            />
                          </div>
                          {shipmentMessages[order.id] ? (
                            <p
                              className={`rounded-lg px-3 py-2 text-sm ${
                                shipmentMessages[order.id].tone === "success"
                                  ? "bg-emerald-50 text-emerald-800"
                                  : "bg-red-50 text-red-800"
                              }`}
                            >
                              {shipmentMessages[order.id].text}
                            </p>
                          ) : null}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 xl:flex-col">
                          <Button
                            size="sm"
                            onClick={() => markShipped(order)}
                            disabled={actioningOrderId === order.id}
                            className="w-full justify-center"
                          >
                            {actioningOrderId === order.id ? "Saving..." : "Mark Shipped & Email"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markFulfillment(order.id, "delivered")}
                            disabled={actioningOrderId === order.id}
                            className="w-full justify-center"
                          >
                            Mark Delivered
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border/60 bg-secondary/25 p-4">
                        <p className="text-sm font-semibold text-foreground">Operational readout</p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                          <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                              Supplier state
                            </p>
                            <p className="mt-2 text-sm font-semibold text-foreground">
                              {formatStatusLabel(order.supplierStatus)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                              Fulfillment state
                            </p>
                            <p className="mt-2 text-sm font-semibold text-foreground">
                              {formatStatusLabel(order.fulfillmentStatus)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <details className="rounded-2xl border border-border/60 bg-background p-4">
                        <summary className="cursor-pointer text-sm font-semibold text-foreground">
                          View supplier payload
                        </summary>
                        <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-secondary p-3 text-xs">
                          {JSON.stringify(order.supplierPayload, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </div>
                  ) : null}
                </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default OrdersAdmin;
