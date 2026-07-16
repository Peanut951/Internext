export type CatalogProductLite = {
  code: string;
  manufacturer: string;
  description: string;
  longDescription?: string;
  price: number | null;
  priceText?: string;
  resellerPrice?: number | null;
  resellerPriceText?: string;
  rrp: number | null;
  rrpText?: string;
  imageUrl?: string;
  imageUrls?: string[];
  supplierCode?: string;
  gtin?: string;
  ean?: string;
  upc?: string;
  barcode?: string;
  availabilityText?: string;
  etaDate?: string;
  etaStatus?: string;
  stockQuantity?: number;
  weightKg?: number | null;
  heightCm?: number | null;
  widthCm?: number | null;
  depthCm?: number | null;
};

export type CartItem = CatalogProductLite & { qty: number };
export type OrderSerialNumbers = Record<string, string[]>;

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
  marketingOptIn?: boolean;
};

export type OrderReseller = {
  userId?: string;
  email: string;
  role: "user" | "reseller" | "admin" | "guest";
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
    itemsSubtotal: number;
    gstAmount: number;
    shippingTotal: number;
    shippingName?: string;
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
  itemsSubtotal: number;
  gstAmount: number;
  shippingTotal: number;
  shippingName?: string;
  poaLines: number;
  totalKnownValue: number;
  paymentStatus: "paid";
  fulfillmentStatus: FulfillmentStatus;
  trackingCarrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  expectedArrivalDate?: string;
  serialNumbers?: OrderSerialNumbers;
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
    return false;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    if (key === CART_STORAGE_KEY) {
      window.dispatchEvent(new Event("internext-cart-updated"));
    }
    return true;
  } catch {
    return false;
  }
};

export const toCartProduct = <T extends CatalogProductLite>(product: T): CatalogProductLite => {
  const imageUrls = Array.isArray(product.imageUrls)
    ? product.imageUrls.filter((url): url is string => Boolean(url)).slice(0, 1)
    : undefined;

  return {
    code: product.code,
    manufacturer: product.manufacturer,
    description: product.description,
    longDescription: product.longDescription,
    price: product.price,
    priceText: product.priceText,
    resellerPrice: product.resellerPrice,
    resellerPriceText: product.resellerPriceText,
    rrp: product.rrp,
    rrpText: product.rrpText,
    imageUrl: product.imageUrl || imageUrls?.[0],
    imageUrls,
    supplierCode: product.supplierCode,
    gtin: product.gtin,
    ean: product.ean,
    upc: product.upc,
    barcode: product.barcode,
    availabilityText: product.availabilityText,
    etaDate: product.etaDate,
    etaStatus: product.etaStatus,
    stockQuantity: product.stockQuantity,
    weightKg: product.weightKg,
    heightCm: product.heightCm,
    widthCm: product.widthCm,
    depthCm: product.depthCm,
  };
};

type OrderTotals = {
  itemsSubtotal: number;
  subtotal: number;
  gstAmount: number;
  shippingTotal: number;
  shippingName?: string;
  poaLines: number;
  totalKnownValue: number;
};

type OrderShippingInput = {
  name?: string;
  price?: number;
};

const isExGstItem = (item: Pick<CartItem, "priceText">) => /\bex\s*gst\b/i.test(item.priceText || "");

const normalizeMoney = (value: number) => Math.round(value * 100) / 100;

const calculateTotals = (items: CartItem[], shipping?: OrderShippingInput): OrderTotals => {
  const itemTotals = items.reduce(
    (acc, item) => {
      if (item.price === null) {
        return { ...acc, poaLines: acc.poaLines + item.qty };
      }

      const lineValue = item.price * item.qty;
      const lineGst = isExGstItem(item) ? lineValue * 0.1 : 0;

      return {
        ...acc,
        itemsSubtotal: acc.itemsSubtotal + lineValue,
        gstAmount: acc.gstAmount + lineGst,
      };
    },
    { itemsSubtotal: 0, gstAmount: 0, poaLines: 0 },
  );

  const shippingTotal = Math.max(0, shipping?.price || 0);
  const gstAmount = normalizeMoney(itemTotals.gstAmount);
  const itemsSubtotal = normalizeMoney(itemTotals.itemsSubtotal);
  const normalizedShipping = normalizeMoney(shippingTotal);

  return {
    itemsSubtotal,
    subtotal: itemsSubtotal,
    gstAmount,
    shippingTotal: normalizedShipping,
    shippingName: shipping?.name,
    poaLines: itemTotals.poaLines,
    totalKnownValue: normalizeMoney(itemsSubtotal + gstAmount + normalizedShipping),
  };
};

const normalizeOrderRecord = (order: Omit<OrderRecord, "reseller"> & Partial<OrderRecord> & { reseller?: OrderReseller }) => {
  const itemsSubtotal = order.itemsSubtotal ?? order.subtotal ?? 0;
  const gstAmount = order.gstAmount ?? 0;
  const shippingTotal = order.shippingTotal ?? 0;

  return {
    ...order,
    reseller: order.reseller ?? {
      email: order.customer.email,
      role: "guest" as const,
    },
    itemsSubtotal,
    subtotal: order.subtotal ?? itemsSubtotal,
    gstAmount,
    shippingTotal,
    totalKnownValue: order.totalKnownValue ?? normalizeMoney(itemsSubtotal + gstAmount + shippingTotal),
    serialNumbers: order.serialNumbers ?? {},
    supplierPayload: {
      ...order.supplierPayload,
      totals: {
        itemsSubtotal,
        subtotal: order.subtotal ?? itemsSubtotal,
        gstAmount,
        shippingTotal,
        shippingName: order.shippingName,
        poaLines: order.poaLines ?? 0,
        totalKnownValue: order.totalKnownValue ?? normalizeMoney(itemsSubtotal + gstAmount + shippingTotal),
        ...(order.supplierPayload?.totals || {}),
      },
    },
  } as OrderRecord;
};

export const getOrderItemSerialKey = (
  item: Pick<CartItem, "code" | "supplierCode">,
  itemIndex: number,
) => `${itemIndex}:${item.code}:${item.supplierCode ?? ""}`;

const nowIso = () => new Date().toISOString();

export const generateOrderNumber = () => {
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
  try {
    window.localStorage.removeItem(CART_STORAGE_KEY);
    window.dispatchEvent(new Event("internext-cart-updated"));
  } catch {
    // Keep checkout cleanup non-fatal if storage is unavailable.
  }
};

export const getOrders = () =>
  readJson<Array<Omit<OrderRecord, "reseller"> & { reseller?: OrderReseller }>>(
    ORDERS_STORAGE_KEY,
    [],
  ).map(normalizeOrderRecord);

export const getOrdersForReseller = (reseller: Pick<OrderReseller, "userId" | "email">) => {
  const normalizedEmail = reseller.email.trim().toLowerCase();

  return getOrders().filter((order) => {
    if (reseller.userId && order.reseller.userId) {
      return order.reseller.userId === reseller.userId;
    }

    return order.reseller.email.trim().toLowerCase() === normalizedEmail;
  });
};

const saveOrders = (orders: OrderRecord[]) => writeJson(ORDERS_STORAGE_KEY, orders);

const mergeOrderLists = (primary: OrderRecord[], secondary: OrderRecord[]) => {
  const seen = new Set<string>();
  return [...primary, ...secondary]
    .filter((order) => {
      const key = order.id || order.orderNumber;
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
};

export const mergeOrdersIntoLocalStore = (orders: OrderRecord[]) => {
  const normalizedOrders = orders.map(normalizeOrderRecord);
  const mergedOrders = mergeOrderLists(normalizedOrders, getOrders());
  saveOrders(mergedOrders);
  return mergedOrders;
};

type SharedOrdersFetchOptions = {
  fallbackToLocal?: boolean;
  mergeWithLocal?: boolean;
};

type SharedOrdersFetchResult = {
  ok: boolean;
  orders: OrderRecord[];
  message?: string;
  status?: number;
};

export const fetchSharedOrdersResult = async ({
  fallbackToLocal = true,
  mergeWithLocal = true,
}: SharedOrdersFetchOptions = {}): Promise<SharedOrdersFetchResult> => {
  if (typeof window === "undefined") {
    return { ok: true, orders: [] };
  }

  try {
    const response = await fetch("/api/order-notification", {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    const payload = (await response.json().catch(() => ({}))) as {
      orders?: OrderRecord[];
      message?: string;
    };
    if (!response.ok || !Array.isArray(payload.orders)) {
      return {
        ok: false,
        orders: fallbackToLocal ? getOrders() : [],
        status: response.status,
        message: payload.message || "Unable to load shared orders.",
      };
    }

    const normalizedOrders = payload.orders.map(normalizeOrderRecord);
    const orders = mergeWithLocal ? mergeOrderLists(normalizedOrders, getOrders()) : normalizedOrders;
    saveOrders(orders);

    return { ok: true, orders };
  } catch {
    return {
      ok: false,
      orders: fallbackToLocal ? getOrders() : [],
      message: "Unable to reach the shared order service.",
    };
  }
};

export const fetchSharedOrders = async () => {
  const result = await fetchSharedOrdersResult();
  return result.orders;
};

export const persistSharedOrder = async (order: OrderRecord) => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const response = await fetch("/api/order-notification", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ notificationType: "store_order", order }),
    });

    return response.ok;
  } catch {
    return false;
  }
};

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
  shipping?: OrderShippingInput,
  options?: { orderNumber?: string },
): Promise<OrderRecord> => {
  const items = getCartItems();
  if (items.length === 0) {
    throw new Error("Cart is empty.");
  }

  const timestamp = nowIso();
  const orderNumber = options?.orderNumber?.trim() || generateOrderNumber();
  const totals = calculateTotals(items, shipping);
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
    itemsSubtotal: totals.itemsSubtotal,
    gstAmount: totals.gstAmount,
    shippingTotal: totals.shippingTotal,
    shippingName: totals.shippingName,
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
    trackingCarrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    expectedArrivalDate?: string;
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
      trackingCarrier: payload.trackingCarrier ?? order.trackingCarrier,
      trackingNumber: payload.trackingNumber ?? order.trackingNumber,
      trackingUrl: payload.trackingUrl ?? order.trackingUrl,
      expectedArrivalDate: payload.expectedArrivalDate ?? order.expectedArrivalDate,
      updatedAt: nowIso(),
    };
  });

  saveOrders(nextOrders);
  return nextOrders.find((order) => order.id === orderId) ?? null;
};

export const updateOrderSerialNumbers = (
  orderId: string,
  serialNumbers: OrderSerialNumbers,
) => {
  const orders = getOrders();
  const nextOrders = orders.map((order) => {
    if (order.id !== orderId) {
      return order;
    }

    return {
      ...order,
      serialNumbers,
      updatedAt: nowIso(),
    };
  });

  saveOrders(nextOrders);
  return nextOrders.find((order) => order.id === orderId) ?? null;
};

export const removeOrder = (orderId: string) => {
  const nextOrders = getOrders().filter((order) => order.id !== orderId);
  saveOrders(nextOrders);
  return nextOrders;
};

export const updateSharedOrderFulfillment = async (
  orderId: string,
  payload: {
    fulfillmentStatus: FulfillmentStatus;
    trackingCarrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    expectedArrivalDate?: string;
  },
) => {
  const updatedOrder = updateOrderFulfillment(orderId, payload);
  if (updatedOrder) {
    await persistSharedOrder(updatedOrder);
  }
  return updatedOrder;
};

export const updateSharedOrderSerialNumbers = async (
  orderId: string,
  serialNumbers: OrderSerialNumbers,
) => {
  const updatedOrder = updateOrderSerialNumbers(orderId, serialNumbers);
  if (updatedOrder) {
    await persistSharedOrder(updatedOrder);
  }
  return updatedOrder;
};

export const formatAud = (amount: number) =>
  amount.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
