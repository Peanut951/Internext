export type CatalogProductLite = {
  code: string;
  manufacturer: string;
  description: string;
  longDescription?: string;
  price: number | null;
  priceText?: string;
  rrp: number | null;
  rrpText?: string;
  imageUrl?: string;
  imageUrls?: string[];
  supplierCode?: string;
};

export type CartItem = CatalogProductLite & { qty: number };

export type CheckoutCustomer = {
  firstName: string;
  lastName: string;
  company?: string;
  email: string;
  phone: string;
  address1: string;
  address2?: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  notes?: string;
};

export type OrderReseller = {
  userId?: string;
  email: string;
  role: "reseller" | "admin" | "guest";
};

export type SupplierIntegrationSettings = {
  mode: "manual" | "webhook";
  webhookUrl: string;
  authHeaderName?: string;
  authHeaderValue?: string;
};

export type SupplierSubmissionStatus =
  | "not_configured"
  | "queued"
  | "submitted"
  | "failed";

export type FulfillmentStatus =
  | "new"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type SupplierOrderPayload = {
  orderNumber: string;
  createdAt: string;
  reseller: {
    businessName: string;
    website: string;
    portalUserEmail?: string;
    portalUserRole?: OrderReseller["role"];
  };
  customer: CheckoutCustomer;
  items: Array<{
    code: string;
    supplierCode?: string;
    description: string;
    brand: string;
    quantity: number;
    unitPrice: number | null;
  }>;
  totals: {
    subtotal: number;
    poaLines: number;
    totalKnownValue: number;
  };
};

export type OrderRecord = {
  id: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
  reseller: OrderReseller;
  customer: CheckoutCustomer;
  items: CartItem[];
  subtotal: number;
  poaLines: number;
  totalKnownValue: number;
  paymentStatus: "paid";
  fulfillmentStatus: FulfillmentStatus;
  trackingNumber?: string;
  trackingUrl?: string;
  supplierStatus: SupplierSubmissionStatus;
  supplierSubmittedAt?: string;
  supplierMessage?: string;
  supplierPayload: SupplierOrderPayload;
};

const CART_STORAGE_KEY = "internext-cart";
const ORDERS_STORAGE_KEY = "internext-orders";
const INTEGRATION_STORAGE_KEY = "internext-supplier-integration";

const DEFAULT_INTEGRATION_SETTINGS: SupplierIntegrationSettings = {
  mode: "manual",
  webhookUrl: "",
  authHeaderName: "",
  authHeaderValue: "",
};

const readJson = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
};

const normalizeOrderRecord = (order: Omit<OrderRecord, "reseller"> & { reseller?: OrderReseller }) => ({
  ...order,
  reseller: order.reseller ?? {
    email: order.customer.email,
    role: "guest" as const,
  },
});

const nowIso = () => new Date().toISOString();

const generateOrderNumber = () => {
  const datePart = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `INX-${datePart}-${randomPart}`;
};

const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const calculateTotals = (items: CartItem[]) => {
  return items.reduce(
    (acc, item) => {
      if (item.price === null) {
        return { ...acc, poaLines: acc.poaLines + item.qty };
      }
      const lineValue = item.price * item.qty;
      return {
        ...acc,
        subtotal: acc.subtotal + lineValue,
        totalKnownValue: acc.totalKnownValue + lineValue,
      };
    },
    { subtotal: 0, poaLines: 0, totalKnownValue: 0 },
  );
};

const buildSupplierPayload = (
  orderNumber: string,
  createdAt: string,
  reseller: OrderReseller,
  customer: CheckoutCustomer,
  items: CartItem[],
  totals: ReturnType<typeof calculateTotals>,
): SupplierOrderPayload => {
  return {
    orderNumber,
    createdAt,
    reseller: {
      businessName: "Internext",
      website: typeof window === "undefined" ? "https://internext.com.au" : window.location.origin,
      portalUserEmail: reseller.email,
      portalUserRole: reseller.role,
    },
    customer,
    items: items.map((item) => ({
      code: item.code,
      supplierCode: item.supplierCode,
      description: item.description,
      brand: item.manufacturer,
      quantity: item.qty,
      unitPrice: item.price,
    })),
    totals,
  };
};

const submitToWebhook = async (
  payload: SupplierOrderPayload,
  settings: SupplierIntegrationSettings,
): Promise<{ status: SupplierSubmissionStatus; message: string }> => {
  const target = settings.webhookUrl.trim();

  if (!target) {
    return {
      status: "not_configured",
      message: "No supplier webhook configured. Order queued for manual submission.",
    };
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10000);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (settings.authHeaderName?.trim() && settings.authHeaderValue?.trim()) {
      headers[settings.authHeaderName.trim()] = settings.authHeaderValue.trim();
    }

    const response = await fetch(target, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        status: "failed",
        message: `Supplier endpoint returned ${response.status}. Order kept for retry.`,
      };
    }

    return {
      status: "submitted",
      message: "Order sent to supplier successfully.",
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        status: "failed",
        message: "Supplier request timed out. Order kept for retry.",
      };
    }

    return {
      status: "failed",
      message:
        error instanceof Error
          ? `Supplier request failed: ${error.message}`
          : "Supplier request failed. Order kept for retry.",
    };
  } finally {
    window.clearTimeout(timeout);
  }
};

export const getCartItems = () => readJson<CartItem[]>(CART_STORAGE_KEY, []);

export const saveCartItems = (items: CartItem[]) => writeJson(CART_STORAGE_KEY, items);

export const clearCartItems = () => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(CART_STORAGE_KEY);
};

export const getOrders = () =>
  readJson<Array<Omit<OrderRecord, "reseller"> & { reseller?: OrderReseller }>>(
    ORDERS_STORAGE_KEY,
    [],
  ).map(normalizeOrderRecord);

const saveOrders = (orders: OrderRecord[]) => writeJson(ORDERS_STORAGE_KEY, orders);

export const getSupplierIntegrationSettings = () => {
  return {
    ...DEFAULT_INTEGRATION_SETTINGS,
    ...readJson<SupplierIntegrationSettings>(
      INTEGRATION_STORAGE_KEY,
      DEFAULT_INTEGRATION_SETTINGS,
    ),
  };
};

export const saveSupplierIntegrationSettings = (settings: SupplierIntegrationSettings) => {
  writeJson(INTEGRATION_STORAGE_KEY, settings);
};

export const placeOrder = async (
  customer: CheckoutCustomer,
  reseller?: OrderReseller,
): Promise<OrderRecord> => {
  const items = getCartItems();
  if (items.length === 0) {
    throw new Error("Cart is empty.");
  }

  const timestamp = nowIso();
  const orderNumber = generateOrderNumber();
  const totals = calculateTotals(items);
  const orderReseller: OrderReseller = reseller ?? {
    email: customer.email,
    role: "guest",
  };
  const payload = buildSupplierPayload(orderNumber, timestamp, orderReseller, customer, items, totals);

  const settings = getSupplierIntegrationSettings();
  const submission =
    settings.mode === "webhook"
      ? await submitToWebhook(payload, settings)
      : {
          status: "queued" as const,
          message: "Manual supplier mode enabled. Submit this order from admin dashboard.",
        };

  const order: OrderRecord = {
    id: generateId(),
    orderNumber,
    createdAt: timestamp,
    updatedAt: timestamp,
    reseller: orderReseller,
    customer,
    items,
    subtotal: totals.subtotal,
    poaLines: totals.poaLines,
    totalKnownValue: totals.totalKnownValue,
    paymentStatus: "paid",
    fulfillmentStatus: "new",
    supplierStatus: submission.status,
    supplierSubmittedAt: submission.status === "submitted" ? timestamp : undefined,
    supplierMessage: submission.message,
    supplierPayload: payload,
  };

  const orders = getOrders();
  saveOrders([order, ...orders]);
  clearCartItems();

  return order;
};

export const retrySupplierSubmission = async (orderId: string) => {
  const orders = getOrders();
  const settings = getSupplierIntegrationSettings();

  const nextOrders = await Promise.all(
    orders.map(async (order) => {
      if (order.id !== orderId) {
        return order;
      }

      if (settings.mode !== "webhook") {
        return {
          ...order,
          supplierStatus: "queued" as SupplierSubmissionStatus,
          supplierMessage: "Manual supplier mode enabled. No webhook submission attempted.",
          updatedAt: nowIso(),
        };
      }

      const submission = await submitToWebhook(order.supplierPayload, settings);
      return {
        ...order,
        supplierStatus: submission.status,
        supplierMessage: submission.message,
        supplierSubmittedAt: submission.status === "submitted" ? nowIso() : order.supplierSubmittedAt,
        updatedAt: nowIso(),
      };
    }),
  );

  saveOrders(nextOrders);
  return nextOrders.find((order) => order.id === orderId) ?? null;
};

export const updateOrderFulfillment = (
  orderId: string,
  payload: {
    fulfillmentStatus: FulfillmentStatus;
    trackingNumber?: string;
    trackingUrl?: string;
  },
) => {
  const orders = getOrders();
  const nextOrders = orders.map((order) => {
    if (order.id !== orderId) {
      return order;
    }

    return {
      ...order,
      fulfillmentStatus: payload.fulfillmentStatus,
      trackingNumber: payload.trackingNumber ?? order.trackingNumber,
      trackingUrl: payload.trackingUrl ?? order.trackingUrl,
      updatedAt: nowIso(),
    };
  });

  saveOrders(nextOrders);
  return nextOrders.find((order) => order.id === orderId) ?? null;
};

export const formatAud = (amount: number) =>
  amount.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
