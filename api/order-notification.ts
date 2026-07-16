import {
  buildStripeCheckoutParams,
  createStripeCheckoutSession,
  getRequestOrigin,
  parseJsonBody,
  sendJson,
} from "./checkout/_shared.js";
import { getSessionFromRequest } from "./auth/_shared.js";

type RequestBody = {
  order?: Record<string, unknown>;
  notificationType?:
    | "paid_order"
    | "shipment"
    | "store_order"
    | "sync_xero_inventory"
    | "remove_invoice"
    | "send_payment_invoice"
    | "create_xero_invoice"
    | "remove_xero_invoice";
  origin?: string;
  sync?: {
    offset?: number;
    limit?: number;
  };
};

const readEnv = (key: string) => process.env[key]?.trim() || "";
const WEBHOOK_TIMEOUT_MS = 20000;
const ORDERS_TABLE = "orders";
const MARKETING_CONTACTS_TABLE = "marketing_contacts";
const XERO_INVENTORY_ITEMS_TABLE = "xero_inventory_items";
const XERO_SALES_INVOICE_LINES_TABLE = "xero_sales_invoice_lines";
const DEFAULT_XERO_SALES_ACCOUNT_CODE = "200";
const DEFAULT_XERO_SHIPPING_ACCOUNT_CODE = "200";
const DEFAULT_XERO_TAX_TYPE = "OUTPUT";
const DEFAULT_XERO_INVOICE_STATUS = "DRAFT";
const DEFAULT_XERO_CURRENCY = "AUD";

const formatAud = (value: unknown) =>
  typeof value === "number"
    ? value.toLocaleString("en-AU", { style: "currency", currency: "AUD" })
    : "$0.00";

const getNumber = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);
const getString = (value: unknown) => (typeof value === "string" ? value : "");
const GST_RATE = 0.1;
const GST_MULTIPLIER = 1 + GST_RATE;
const normalizeMoney = (value: number) => Math.round(value * 100) / 100;

const splitLineAmount = (unitPrice: number, qty: number, priceText?: string) => {
  const lineAmount = unitPrice * qty;

  if (/\bex\s*gst\b/i.test(priceText || "")) {
    const net = lineAmount;
    const gst = net * GST_RATE;
    return {
      unitNet: unitPrice,
      net,
      gst,
      gross: net + gst,
    };
  }

  const gross = lineAmount;
  const net = gross / GST_MULTIPLIER;
  return {
    unitNet: unitPrice / GST_MULTIPLIER,
    net,
    gst: gross - net,
    gross,
  };
};

const splitIncGstAmount = (grossAmount: number) => {
  const gross = Math.max(0, grossAmount);
  const net = gross / GST_MULTIPLIER;
  return {
    net,
    gst: gross - net,
    gross,
  };
};

const getSupabaseOrdersConfig = () => {
  const supabaseUrl = readEnv("SUPABASE_URL") || readEnv("VITE_SUPABASE_URL");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY") || readEnv("SERVICE_ROLE_SECRET_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return {
    supabaseUrl: supabaseUrl.replace(/\/$/, ""),
    serviceRoleKey,
  };
};

const getOrderField = (order: Record<string, unknown>, key: string) => {
  const value = order[key];
  return typeof value === "string" ? value.trim() : "";
};

const getNestedString = (source: unknown, key: string) => {
  if (!source || typeof source !== "object") {
    return "";
  }

  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
};

const getNestedBoolean = (source: unknown, key: string) => {
  if (!source || typeof source !== "object") {
    return false;
  }

  return (source as Record<string, unknown>)[key] === true;
};

const normalizeMarketingRole = (value: string) => {
  const role = value.trim().toLowerCase();
  if (role === "reseller") {
    return "reseller";
  }
  if (role === "guest") {
    return "guest";
  }
  return "user";
};

const upsertSharedOrder = async (order: Record<string, unknown>) => {
  const config = getSupabaseOrdersConfig();
  if (!config) {
    return {
      ok: false,
      status: 0,
      message: "Supabase order storage is not configured.",
    };
  }

  const id = getOrderField(order, "id") || getOrderField(order, "orderNumber");
  if (!id) {
    return {
      ok: false,
      status: 400,
      message: "Order id is required.",
    };
  }

  const reseller = order.reseller && typeof order.reseller === "object" ? order.reseller : {};
  const customer = order.customer && typeof order.customer === "object" ? order.customer : {};
  const createdAt = getOrderField(order, "createdAt") || new Date().toISOString();
  const updatedAt = getOrderField(order, "updatedAt") || new Date().toISOString();

  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/${ORDERS_TABLE}?on_conflict=id`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        id,
        order_number: getOrderField(order, "orderNumber"),
        reseller_email: getNestedString(reseller, "email").toLowerCase(),
        reseller_user_id: getNestedString(reseller, "userId"),
        customer_email: getNestedString(customer, "email").toLowerCase(),
        fulfillment_status: getOrderField(order, "fulfillmentStatus"),
        supplier_status: getOrderField(order, "supplierStatus"),
        order_data: order,
        created_at: createdAt,
        updated_at: updatedAt,
      }),
    },
  );

  return {
    ok: response.ok,
    status: response.status,
    message: response.ok
      ? "Order saved to shared storage."
      : `Supabase order storage returned HTTP ${response.status}.`,
  };
};

const upsertMarketingContactFromOrder = async (order: Record<string, unknown>) => {
  const config = getSupabaseOrdersConfig();
  if (!config) {
    return {
      ok: false,
      status: 0,
      message: "Supabase marketing contact storage is not configured.",
    };
  }

  const customer = order.customer && typeof order.customer === "object" ? order.customer : {};
  const reseller = order.reseller && typeof order.reseller === "object" ? order.reseller : {};
  const email = getNestedString(customer, "email").toLowerCase();
  if (!email) {
    return {
      ok: false,
      status: 400,
      message: "Customer email is required for marketing contact storage.",
    };
  }

  const now = new Date().toISOString();
  const createdAt = getOrderField(order, "createdAt") || now;
  const role = normalizeMarketingRole(getNestedString(reseller, "role"));
  const marketingConsent = getNestedBoolean(customer, "marketingOptIn");

  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/${MARKETING_CONTACTS_TABLE}?on_conflict=email`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        email,
        role,
        first_name: getNestedString(customer, "firstName"),
        last_name: getNestedString(customer, "lastName"),
        company: getNestedString(customer, "company"),
        phone: getNestedString(customer, "phone"),
        marketing_consent: marketingConsent,
        source: role === "guest" ? "guest_checkout" : "checkout",
        last_order_number: getOrderField(order, "orderNumber"),
        last_order_at: createdAt,
        updated_at: now,
      }),
    },
  );

  return {
    ok: response.ok,
    status: response.status,
    message: response.ok
      ? "Marketing contact saved."
      : `Supabase marketing contact storage returned HTTP ${response.status}.`,
  };
};

const fetchSharedOrders = async (req: { headers?: { cookie?: string } }) => {
  const session = getSessionFromRequest(req);
  if (!session) {
    return {
      status: 401,
      body: { message: "Sign in is required to view orders." },
    };
  }

  const config = getSupabaseOrdersConfig();
  if (!config) {
    return {
      status: 500,
      body: { message: "Supabase order storage is not configured." },
    };
  }

  const url = new URL(`${config.supabaseUrl}/rest/v1/${ORDERS_TABLE}`);
  url.searchParams.set("select", "order_data");
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", "1000");

  if (session.role !== "admin") {
    const normalizedEmail = session.email.trim().toLowerCase();
    url.searchParams.set(
      "or",
      `(reseller_user_id.eq.${session.userId},reseller_email.eq.${normalizedEmail},customer_email.eq.${normalizedEmail})`,
    );
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return {
      status: response.status,
      body: { message: `Supabase order storage returned HTTP ${response.status}.` },
    };
  }

  const rows = (await response.json()) as Array<{ order_data?: unknown }>;
  return {
    status: 200,
    body: {
      orders: rows
        .map((row) => row.order_data)
        .filter((order): order is Record<string, unknown> => Boolean(order && typeof order === "object")),
    },
  };
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatOrderDate = (value: unknown) => {
  const date = new Date(getString(value));
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const buildOrderEmailSummary = (order: Record<string, unknown>) => {
  const items = Array.isArray(order.items) ? order.items : [];
  let calculatedItemsSubtotal = 0;
  let calculatedItemsGst = 0;
  const lines = items.map((item) => {
    const line = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const quantity = getNumber(line.qty);
    const unitPrice = typeof line.price === "number" ? line.price : null;
    const lineTotals = unitPrice === null
      ? null
      : splitLineAmount(unitPrice, quantity, String(line.priceText || ""));

    if (lineTotals) {
      calculatedItemsSubtotal += lineTotals.net;
      calculatedItemsGst += lineTotals.gst;
    }

    return {
      code: line.code || "",
      description: line.description || "",
      quantity,
      unitPrice: lineTotals?.unitNet ?? null,
      unitPriceText: lineTotals ? formatAud(normalizeMoney(lineTotals.unitNet)) : "POA",
      lineTotal: lineTotals?.net ?? null,
      lineTotalText: lineTotals ? formatAud(normalizeMoney(lineTotals.net)) : "POA",
      priceBasis: unitPrice === null ? "" : "Ex GST",
    };
  });
  const calculatedSubtotal = normalizeMoney(calculatedItemsSubtotal);
  const itemsSubtotal = calculatedSubtotal || getNumber(order.itemsSubtotal ?? order.subtotal);
  const grossShippingTotal = getNumber(order.shippingTotal);
  const shippingBreakdown = splitIncGstAmount(grossShippingTotal);
  const shippingTotal = normalizeMoney(shippingBreakdown.net);
  const calculatedTotalKnownValue = normalizeMoney(
    itemsSubtotal + calculatedItemsGst + shippingBreakdown.gross,
  );
  const totalKnownValue = getNumber(order.totalKnownValue) || calculatedTotalKnownValue;
  const gstAmount = normalizeMoney(totalKnownValue - itemsSubtotal - shippingTotal);

  return {
    orderNumber: order.orderNumber || "",
    itemsSubtotal,
    itemsSubtotalText: formatAud(itemsSubtotal),
    gstAmount,
    gstAmountText: formatAud(gstAmount),
    shippingTotal,
    shippingTotalText: formatAud(shippingTotal),
    totalKnownValue,
    totalKnownValueText: formatAud(totalKnownValue),
    lineCount: items.length,
    lines,
  };
};

const toIsoDateOnly = (value: unknown) => {
  const date = new Date(getString(value) || Date.now());
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
};

const addDaysIsoDateOnly = (value: unknown, days: number) => {
  const date = new Date(getString(value) || Date.now());
  if (Number.isNaN(date.getTime())) {
    date.setTime(Date.now());
  }
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const getCustomerDisplayName = (customer: Record<string, unknown>) =>
  [
    getString(customer.company),
    [customer.firstName, customer.lastName].map(getString).filter(Boolean).join(" "),
    getString(customer.email),
  ]
    .map((value) => value.trim())
    .find(Boolean) || "Internext Customer";

const getXeroItemCode = (value: unknown) => {
  const code = getString(value).replace(/\s+/g, " ").trim();
  return code ? code.slice(0, 30) : "";
};

const getCustomerAddressParts = (customer: Record<string, unknown>) => ({
  po_address_line1: getString(customer.address1),
  po_address_line2: getString(customer.address2),
  po_address_line3: "",
  po_address_line4: "",
  po_city: getString(customer.suburb),
  po_region: getString(customer.state),
  po_postal_code: getString(customer.postcode),
  po_country: getString(customer.country) || "Australia",
});

const buildXeroSalesInvoiceRows = (
  order: Record<string, unknown>,
  summary = buildOrderEmailSummary(order),
) => {
  const customer = order.customer && typeof order.customer === "object"
    ? order.customer as Record<string, unknown>
    : {};
  const orderId = getString(order.id) || getString(order.orderNumber);
  const orderNumber = getString(order.orderNumber) || orderId || "Internext order";
  const invoiceDate = toIsoDateOnly(order.createdAt);
  const dueDate = addDaysIsoDateOnly(order.createdAt, 0);
  const contactName = getCustomerDisplayName(customer);
  const addressParts = getCustomerAddressParts(customer);
  const salesAccountCode = readEnv("XERO_SALES_ACCOUNT_CODE") || DEFAULT_XERO_SALES_ACCOUNT_CODE;
  const shippingAccountCode = readEnv("XERO_SHIPPING_ACCOUNT_CODE") || DEFAULT_XERO_SHIPPING_ACCOUNT_CODE;
  const taxType = readEnv("XERO_GST_TAX_TYPE") || DEFAULT_XERO_TAX_TYPE;
  const currency = readEnv("XERO_CURRENCY") || DEFAULT_XERO_CURRENCY;
  const brandingTheme = readEnv("XERO_BRANDING_THEME");

  const baseRow = {
    order_id: orderId || orderNumber,
    order_number: orderNumber,
    contact_name: contactName,
    email_address: getString(customer.email),
    ...addressParts,
    invoice_number: orderNumber,
    reference: orderNumber,
    invoice_date: invoiceDate,
    due_date: dueDate,
    discount: null,
    tax_type: taxType,
    tracking_name1: "",
    tracking_option1: "",
    tracking_name2: "",
    tracking_option2: "",
    currency,
    branding_theme: brandingTheme,
    source_order: order,
    updated_at: new Date().toISOString(),
  };

  const itemRows = summary.lines
    .filter((line) => typeof line.unitPrice === "number" && line.quantity > 0)
    .map((line, index) => ({
      ...baseRow,
      line_index: index,
      inventory_item_code: getXeroItemCode(line.code),
      description: String(line.description || line.code || "Internext product").slice(0, 4000),
      quantity: line.quantity,
      unit_amount: normalizeMoney(line.unitPrice ?? 0),
      account_code: salesAccountCode,
    }));

  if (summary.shippingTotal > 0) {
    itemRows.push({
      ...baseRow,
      line_index: itemRows.length,
      inventory_item_code: "SHIPPING",
      description: "Shipping and handling",
      quantity: 1,
      unit_amount: normalizeMoney(summary.shippingTotal),
      account_code: shippingAccountCode,
    });
  }

  return itemRows;
};

const buildSalesInvoiceTemplateRows = (
  order: Record<string, unknown>,
  summary = buildOrderEmailSummary(order),
) =>
  buildXeroSalesInvoiceRows(order, summary).map((row) => ({
    "*ContactName": row.contact_name,
    EmailAddress: row.email_address,
    POAddressLine1: row.po_address_line1,
    POAddressLine2: row.po_address_line2,
    POAddressLine3: row.po_address_line3,
    POAddressLine4: row.po_address_line4,
    POCity: row.po_city,
    PORegion: row.po_region,
    POPostalCode: row.po_postal_code,
    POCountry: row.po_country,
    "*InvoiceNumber": row.invoice_number,
    Reference: row.reference,
    "*InvoiceDate": row.invoice_date,
    "*DueDate": row.due_date,
    InventoryItemCode: row.inventory_item_code,
    "*Description": row.description,
    "*Quantity": row.quantity,
    "*UnitAmount": row.unit_amount,
    Discount: row.discount,
    "*AccountCode": row.account_code,
    "*TaxType": row.tax_type,
    TrackingName1: row.tracking_name1,
    TrackingOption1: row.tracking_option1,
    TrackingName2: row.tracking_name2,
    TrackingOption2: row.tracking_option2,
    Currency: row.currency,
    BrandingTheme: row.branding_theme,
  }));

const buildXeroInventoryItemRowsFromOrder = (
  order: Record<string, unknown>,
  summary = buildOrderEmailSummary(order),
) => {
  const salesAccountCode = readEnv("XERO_SALES_ACCOUNT_CODE") || DEFAULT_XERO_SALES_ACCOUNT_CODE;
  const purchaseAccountCode = readEnv("XERO_PURCHASES_ACCOUNT_CODE") || "";
  const salesTaxRate = readEnv("XERO_SALES_TAX_RATE") || DEFAULT_XERO_TAX_TYPE;
  const purchasesTaxRate = readEnv("XERO_PURCHASES_TAX_RATE") || "";
  const inventoryAssetAccount = readEnv("XERO_INVENTORY_ASSET_ACCOUNT_CODE") || "";
  const costOfGoodsSoldAccount = readEnv("XERO_COGS_ACCOUNT_CODE") || "";
  const now = new Date().toISOString();

  const rows = summary.lines
    .filter((line) => typeof line.unitPrice === "number" && line.quantity > 0)
    .map((line) => {
      const itemCode = getXeroItemCode(line.code);
      const description = String(line.description || line.code || "Internext product").slice(0, 4000);

      return {
        item_code: itemCode,
        item_name: description.slice(0, 255),
        purchases_description: description,
        purchases_unit_price: null,
        purchases_account: purchaseAccountCode,
        purchases_tax_rate: purchasesTaxRate,
        sales_description: description,
        sales_unit_price: normalizeMoney(line.unitPrice ?? 0),
        sales_account: salesAccountCode,
        sales_tax_rate: salesTaxRate,
        inventory_asset_account: inventoryAssetAccount,
        cost_of_goods_sold_account: costOfGoodsSoldAccount,
        source: "paid_order",
        product_data: line,
        updated_at: now,
      };
    })
    .filter((row) => row.item_code);

  if (summary.shippingTotal > 0) {
    rows.push({
      item_code: "SHIPPING",
      item_name: "Shipping and handling",
      purchases_description: "Shipping and handling",
      purchases_unit_price: null,
      purchases_account: purchaseAccountCode,
      purchases_tax_rate: purchasesTaxRate,
      sales_description: "Shipping and handling",
      sales_unit_price: normalizeMoney(summary.shippingTotal),
      sales_account: readEnv("XERO_SHIPPING_ACCOUNT_CODE") || DEFAULT_XERO_SHIPPING_ACCOUNT_CODE,
      sales_tax_rate: salesTaxRate,
      inventory_asset_account: inventoryAssetAccount,
      cost_of_goods_sold_account: costOfGoodsSoldAccount,
      source: "paid_order",
      product_data: { orderNumber: getString(order.orderNumber) },
      updated_at: now,
    });
  }

  return rows;
};

const getNullableNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getProductItemCode = (product: Record<string, unknown>) =>
  getXeroItemCode(getString(product.code) || getString(product.supplierCode));

const getProductExGstPrice = (product: Record<string, unknown>) => {
  const price = getNullableNumber(product.price);
  if (price === null) {
    return null;
  }

  return /\bex\s*gst\b/i.test(getString(product.priceText))
    ? normalizeMoney(price)
    : normalizeMoney(price / GST_MULTIPLIER);
};

const getProductDescription = (product: Record<string, unknown>) =>
  (
    getString(product.longDescription) ||
    getString(product.description) ||
    getString(product.name) ||
    getString(product.code) ||
    "Internext product"
  )
    .trim()
    .slice(0, 4000);

const getProductName = (product: Record<string, unknown>) =>
  (getString(product.description) || getString(product.name) || getString(product.code) || "Internext product")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 255);

const readCatalogJsonArray = async (relativePath: string, host = "") => {
  try {
    const [{ readFile }, path] = await Promise.all([
      import("node:fs/promises"),
      import("node:path"),
    ]);
    const filePath = path.join(process.cwd(), relativePath);
    const parsed = JSON.parse(await readFile(filePath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    if (!host) {
      return [];
    }

    const publicPath = relativePath.replace(/^public[\\/]/, "").replace(/\\/g, "/");
    const response = await fetch(`https://${host}/${publicPath}`);
    if (!response.ok) {
      return [];
    }

    const parsed = await response.json().catch(() => []);
    return Array.isArray(parsed) ? parsed : [];
  }
};

const loadInventorySyncProducts = async (host = "") => {
  const [catalogProducts, leaderProducts] = await Promise.all([
    readCatalogJsonArray("public/data/catalog-products.json", host),
    readCatalogJsonArray("public/data/leader-products.json", host),
  ]);
  const productsByCode = new Map<string, Record<string, unknown>>();

  for (const rawProduct of [...catalogProducts, ...leaderProducts]) {
    if (!rawProduct || typeof rawProduct !== "object") {
      continue;
    }

    const product = rawProduct as Record<string, unknown>;
    const code = getProductItemCode(product);
    if (!code) {
      continue;
    }

    const existing = productsByCode.get(code);
    if (!existing || (existing.price == null && product.price != null)) {
      productsByCode.set(code, product);
    }
  }

  return Array.from(productsByCode.values()).sort((a, b) =>
    getProductItemCode(a).localeCompare(getProductItemCode(b)),
  );
};

const buildXeroInventoryItemRowsFromProducts = (products: Array<Record<string, unknown>>) => {
  const salesAccountCode = readEnv("XERO_SALES_ACCOUNT_CODE") || DEFAULT_XERO_SALES_ACCOUNT_CODE;
  const purchaseAccountCode = readEnv("XERO_PURCHASES_ACCOUNT_CODE") || "";
  const salesTaxRate = readEnv("XERO_SALES_TAX_RATE") || DEFAULT_XERO_TAX_TYPE;
  const purchasesTaxRate = readEnv("XERO_PURCHASES_TAX_RATE") || "";
  const inventoryAssetAccount = readEnv("XERO_INVENTORY_ASSET_ACCOUNT_CODE") || "";
  const costOfGoodsSoldAccount = readEnv("XERO_COGS_ACCOUNT_CODE") || "";
  const now = new Date().toISOString();

  return products
    .map((product) => {
      const itemCode = getProductItemCode(product);
      const description = getProductDescription(product);

      return {
        item_code: itemCode,
        item_name: getProductName(product),
        purchases_description: description,
        purchases_unit_price: getNullableNumber(product.supplierPrice ?? product.leaderDealerBuyEx ?? product.alloysPrice),
        purchases_account: purchaseAccountCode,
        purchases_tax_rate: purchasesTaxRate,
        sales_description: description,
        sales_unit_price: getProductExGstPrice(product),
        sales_account: salesAccountCode,
        sales_tax_rate: salesTaxRate,
        inventory_asset_account: inventoryAssetAccount,
        cost_of_goods_sold_account: costOfGoodsSoldAccount,
        source: getString(product.source) || (product.leaderCategory ? "leader" : "catalog_sync"),
        product_data: product,
        updated_at: now,
      };
    })
    .filter((row) => row.item_code);
};

const upsertSupabaseRows = async (
  table: string,
  onConflict: string,
  rows: Array<Record<string, unknown>>,
  emptyMessage: string,
) => {
  const config = getSupabaseOrdersConfig();
  if (!config) {
    return {
      ok: false,
      status: 0,
      message: "Supabase storage is not configured.",
    };
  }

  if (rows.length === 0) {
    return {
      ok: true,
      status: 204,
      message: emptyMessage,
    };
  }

  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    },
  );

  const errorText = response.ok ? "" : await response.text().catch(() => "");

  return {
    ok: response.ok,
    status: response.status,
    message: response.ok
      ? `${rows.length} row${rows.length === 1 ? "" : "s"} saved to ${table}.`
      : `Supabase ${table} storage returned HTTP ${response.status}${errorText ? `: ${errorText}` : ""}.`,
  };
};

const upsertXeroInventoryItemsFromOrder = async (
  order: Record<string, unknown>,
  summary = buildOrderEmailSummary(order),
) =>
  upsertSupabaseRows(
    XERO_INVENTORY_ITEMS_TABLE,
    "item_code",
    buildXeroInventoryItemRowsFromOrder(order, summary),
    "No inventory items were available to save.",
  );

const upsertXeroSalesInvoiceRowsFromOrder = async (
  order: Record<string, unknown>,
  summary = buildOrderEmailSummary(order),
) =>
  upsertSupabaseRows(
    XERO_SALES_INVOICE_LINES_TABLE,
    "order_id,line_index",
    buildXeroSalesInvoiceRows(order, summary),
    "No invoice rows were available to save.",
  );

const deleteXeroSalesInvoiceRowsForOrder = async (order: Record<string, unknown>) => {
  const config = getSupabaseOrdersConfig();
  if (!config) {
    return {
      ok: false,
      status: 0,
      message: "Supabase storage is not configured.",
    };
  }

  const orderId = getOrderField(order, "id") || getOrderField(order, "orderNumber");
  if (!orderId) {
    return {
      ok: false,
      status: 400,
      message: "Order id is required to remove invoice rows.",
    };
  }

  const url = new URL(`${config.supabaseUrl}/rest/v1/${XERO_SALES_INVOICE_LINES_TABLE}`);
  url.searchParams.set("order_id", `eq.${orderId}`);

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      Prefer: "return=minimal",
    },
  });
  const errorText = response.ok ? "" : await response.text().catch(() => "");

  return {
    ok: response.ok,
    status: response.status,
    message: response.ok
      ? "Invoice rows removed from Xero sales invoice storage."
      : `Supabase invoice row deletion returned HTTP ${response.status}${errorText ? `: ${errorText}` : ""}.`,
  };
};

const deleteSharedOrderForOrder = async (order: Record<string, unknown>) => {
  const config = getSupabaseOrdersConfig();
  if (!config) {
    return {
      ok: false,
      status: 0,
      message: "Supabase order storage is not configured.",
    };
  }

  const orderId = getOrderField(order, "id") || getOrderField(order, "orderNumber");
  if (!orderId) {
    return {
      ok: false,
      status: 400,
      message: "Order id is required to remove an invoice.",
    };
  }

  const url = new URL(`${config.supabaseUrl}/rest/v1/${ORDERS_TABLE}`);
  url.searchParams.set("id", `eq.${orderId}`);

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      Prefer: "return=minimal",
    },
  });
  const errorText = response.ok ? "" : await response.text().catch(() => "");

  return {
    ok: response.ok,
    status: response.status,
    message: response.ok
      ? "Invoice removed from shared order storage."
      : `Supabase order deletion returned HTTP ${response.status}${errorText ? `: ${errorText}` : ""}.`,
  };
};

const syncXeroInventoryBatch = async (
  sync: RequestBody["sync"] = {},
  host = "",
) => {
  const allProducts = await loadInventorySyncProducts(host);
  const offset = Math.max(0, Math.floor(Number(sync?.offset) || 0));
  const limit = Math.min(1000, Math.max(50, Math.floor(Number(sync?.limit) || 500)));
  const batchProducts = allProducts.slice(offset, offset + limit);
  const rows = buildXeroInventoryItemRowsFromProducts(batchProducts);
  const response = await upsertSupabaseRows(
    XERO_INVENTORY_ITEMS_TABLE,
    "item_code",
    rows,
    "No inventory items were available to save.",
  );
  const nextOffset = offset + batchProducts.length;

  return {
    ok: response.ok,
    status: response.ok ? 200 : 502,
    body: {
      ok: response.ok,
      total: allProducts.length,
      offset,
      limit,
      synced: rows.length,
      nextOffset,
      done: nextOffset >= allProducts.length,
      message: response.message,
    },
  };
};

const buildXeroInvoicePayload = (order: Record<string, unknown>) => {
  const summary = buildOrderEmailSummary(order);
  const csvRows = buildXeroSalesInvoiceRows(order, summary);
  const salesInvoiceTemplateRows = buildSalesInvoiceTemplateRows(order, summary);
  const customer = order.customer && typeof order.customer === "object"
    ? order.customer as Record<string, unknown>
    : {};
  const orderNumber = getString(order.orderNumber) || getString(order.id) || "Internext order";
  const salesAccountCode = readEnv("XERO_SALES_ACCOUNT_CODE") || DEFAULT_XERO_SALES_ACCOUNT_CODE;
  const shippingAccountCode = readEnv("XERO_SHIPPING_ACCOUNT_CODE") || DEFAULT_XERO_SHIPPING_ACCOUNT_CODE;
  const taxType = readEnv("XERO_GST_TAX_TYPE") || DEFAULT_XERO_TAX_TYPE;
  const invoiceStatus = readEnv("XERO_INVOICE_STATUS") || DEFAULT_XERO_INVOICE_STATUS;
  const invoiceDate = toIsoDateOnly(order.createdAt);
  const dueDate = addDaysIsoDateOnly(order.createdAt, 0);
  const deliveryAddress = [
    customer.address1,
    customer.address2,
    [customer.suburb, customer.state, customer.postcode].map(getString).filter(Boolean).join(" "),
    customer.country,
  ]
    .map(getString)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");

  const itemLines = summary.lines
    .filter((line) => typeof line.unitPrice === "number" && line.quantity > 0)
    .map((line) => ({
      description: String(line.description || line.code || "Internext product").slice(0, 4000),
      quantity: line.quantity,
      unitAmount: normalizeMoney(line.unitPrice ?? 0),
      accountCode: salesAccountCode,
      taxType,
      itemCode: String(line.code || "").slice(0, 30),
      reference: line.code || "",
    }));

  const shippingLine = summary.shippingTotal > 0
    ? [{
        description: "Shipping and handling",
        quantity: 1,
        unitAmount: normalizeMoney(summary.shippingTotal),
        accountCode: shippingAccountCode,
        taxType,
        itemCode: "SHIPPING",
        reference: orderNumber,
      }]
    : [];

  return {
    type: "xero_sales_invoice",
    submittedAt: new Date().toISOString(),
    source: "internext-checkout",
    orderNumber,
    csvTemplate: "SalesInvoiceTemplate.csv",
    csvRows,
    salesInvoiceTemplate: {
      fileName: "SalesInvoiceTemplate.csv",
      headers: [
        "*ContactName",
        "EmailAddress",
        "POAddressLine1",
        "POAddressLine2",
        "POAddressLine3",
        "POAddressLine4",
        "POCity",
        "PORegion",
        "POPostalCode",
        "POCountry",
        "*InvoiceNumber",
        "Reference",
        "*InvoiceDate",
        "*DueDate",
        "InventoryItemCode",
        "*Description",
        "*Quantity",
        "*UnitAmount",
        "Discount",
        "*AccountCode",
        "*TaxType",
        "TrackingName1",
        "TrackingOption1",
        "TrackingName2",
        "TrackingOption2",
        "Currency",
        "BrandingTheme",
      ],
      rows: salesInvoiceTemplateRows,
    },
    invoice: {
      type: "ACCREC",
      status: invoiceStatus,
      lineAmountTypes: "Exclusive",
      currencyCode: "AUD",
      date: invoiceDate,
      dueDate,
      invoiceNumber: orderNumber,
      reference: orderNumber,
      contact: {
        name: getCustomerDisplayName(customer),
        emailAddress: getString(customer.email),
        firstName: getString(customer.firstName),
        lastName: getString(customer.lastName),
      },
      lineItems: [...itemLines, ...shippingLine],
    },
    totals: {
      subtotalExGst: summary.itemsSubtotal,
      shippingExGst: summary.shippingTotal,
      gst: summary.gstAmount,
      totalIncGst: summary.totalKnownValue,
    },
    customer: {
      name: getCustomerDisplayName(customer),
      email: getString(customer.email),
      phone: getString(customer.phone),
      company: getString(customer.company),
      deliveryAddress,
    },
    order: {
      id: order.id || "",
      orderNumber,
      createdAt: order.createdAt || "",
      reseller: order.reseller || {},
      items: order.items || [],
      shipping: order.shipping || {},
    },
  };
};

const buildCustomerConfirmationEmail = (order: Record<string, unknown>) => {
  const summary = buildOrderEmailSummary(order);
  const customer = order.customer && typeof order.customer === "object"
    ? order.customer as Record<string, unknown>
    : {};
  const orderNumber = getString(order.orderNumber) || "your order";
  const customerName = [customer.firstName, customer.lastName]
    .map(getString)
    .filter(Boolean)
    .join(" ")
    .trim() || "there";
  const customerEmail = getString(customer.email).trim();
  const shippingAddress = [
    customer.address1,
    customer.address2,
    [customer.suburb, customer.state, customer.postcode].map(getString).filter(Boolean).join(" "),
    customer.country,
  ]
    .map(getString)
    .map((part) => part.trim())
    .filter(Boolean);

  const itemRows = summary.lines
    .map((line) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;word-break:break-word;overflow-wrap:anywhere;">
          <div style="font-weight:700;color:#111827;word-break:break-word;overflow-wrap:anywhere;">${escapeHtml(line.description)}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px;">Code: ${escapeHtml(line.code)}</div>
        </td>
        <td align="center" style="padding:14px 10px;border-bottom:1px solid #e5e7eb;color:#111827;">${escapeHtml(line.quantity)}</td>
        <td align="right" style="padding:14px 10px;border-bottom:1px solid #e5e7eb;color:#111827;">${escapeHtml(line.unitPriceText)} ${escapeHtml(line.priceBasis)}</td>
        <td align="right" style="padding:14px 0;border-bottom:1px solid #e5e7eb;font-weight:700;color:#111827;">${escapeHtml(line.lineTotalText)}</td>
      </tr>`)
    .join("");

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:#1f2937;padding:28px 32px;">
                <div style="font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#7dd3fc;font-weight:700;">Internext</div>
                <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;color:#ffffff;">Order confirmation</h1>
                <p style="margin:10px 0 0;color:#d1d5db;font-size:15px;">Thanks ${escapeHtml(customerName)}, we have received your order.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                  <tr>
                    <td style="padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">
                      <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;font-weight:700;">Order number</div>
                      <div style="margin-top:6px;font-size:18px;font-weight:800;color:#111827;">${escapeHtml(orderNumber)}</div>
                    </td>
                    <td width="16"></td>
                    <td style="padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">
                      <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;font-weight:700;">Order date</div>
                      <div style="margin-top:6px;font-size:18px;font-weight:800;color:#111827;">${escapeHtml(formatOrderDate(order.createdAt))}</div>
                    </td>
                  </tr>
                </table>

                <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Items ordered</h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <thead>
                    <tr>
                      <th align="left" style="padding:0 0 10px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Item</th>
                      <th align="center" style="padding:0 10px 10px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Qty</th>
                      <th align="right" style="padding:0 10px 10px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Unit price ex GST</th>
                      <th align="right" style="padding:0 0 10px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Line total ex GST</th>
                    </tr>
                  </thead>
                  <tbody>${itemRows}</tbody>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;">
                  <tr>
                    <td style="vertical-align:top;padding-right:20px;">
                      <h2 style="margin:0 0 10px;font-size:18px;color:#111827;">Delivery details</h2>
                      <p style="margin:0;color:#4b5563;line-height:1.6;">
                        ${shippingAddress.map(escapeHtml).join("<br>")}
                      </p>
                    </td>
                    <td width="260" style="vertical-align:top;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:14px;">
                        <tr>
                          <td style="padding:6px 0;color:#4b5563;">Items subtotal ex GST</td>
                          <td align="right" style="padding:6px 0;color:#111827;font-weight:700;">${escapeHtml(summary.itemsSubtotalText)}</td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;color:#4b5563;">GST</td>
                          <td align="right" style="padding:6px 0;color:#111827;font-weight:700;">${escapeHtml(summary.gstAmountText)}</td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;color:#4b5563;">Shipping ex GST</td>
                          <td align="right" style="padding:6px 0;color:#111827;font-weight:700;">${escapeHtml(summary.shippingTotalText)}</td>
                        </tr>
                        <tr>
                          <td style="padding:12px 0 4px;border-top:1px solid #e5e7eb;color:#111827;font-weight:800;">Total paid</td>
                          <td align="right" style="padding:12px 0 4px;border-top:1px solid #e5e7eb;color:#111827;font-size:18px;font-weight:900;">${escapeHtml(summary.totalKnownValueText)}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <p style="margin:26px 0 0;color:#4b5563;line-height:1.6;">
                  We will email you again when your order status changes or tracking details are available.
                  For questions, call 1300 U R NEXT (1300 876 398).
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `Internext order confirmation`,
    `Order: ${orderNumber}`,
    `Date: ${formatOrderDate(order.createdAt)}`,
    ``,
    `Hi ${customerName}, we have received your order.`,
    ``,
    ...summary.lines.map((line) =>
      `${line.quantity} x ${line.description} (${line.code}) - ${line.lineTotalText}`,
    ),
    ``,
    `Items subtotal ex GST: ${summary.itemsSubtotalText}`,
    `GST: ${summary.gstAmountText}`,
    `Shipping ex GST: ${summary.shippingTotalText}`,
    `Total paid: ${summary.totalKnownValueText}`,
    ``,
    `Delivery address:`,
    ...shippingAddress,
    ``,
    `For questions, call 1300 U R NEXT (1300 876 398).`,
  ].join("\n");

  return {
    to: customerEmail,
    subject: `Internext order confirmation ${orderNumber}`,
    html,
    text,
  };
};

const buildPaymentInvoiceEmail = (order: Record<string, unknown>, paymentUrl: string) => {
  const summary = buildOrderEmailSummary(order);
  const customer = order.customer && typeof order.customer === "object"
    ? order.customer as Record<string, unknown>
    : {};
  const orderNumber = getString(order.orderNumber) || "your invoice";
  const customerName = [customer.firstName, customer.lastName]
    .map(getString)
    .filter(Boolean)
    .join(" ")
    .trim() || "there";
  const customerEmail = getString(customer.email).trim();
  const shippingAddress = [
    customer.address1,
    customer.address2,
    [customer.suburb, customer.state, customer.postcode].map(getString).filter(Boolean).join(" "),
    customer.country,
  ]
    .map(getString)
    .map((part) => part.trim())
    .filter(Boolean);

  const itemRows = summary.lines
    .map((line) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;">
          <div style="font-weight:700;color:#111827;">${escapeHtml(line.description)}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px;">Code: ${escapeHtml(line.code)}</div>
        </td>
        <td align="center" style="padding:14px 10px;border-bottom:1px solid #e5e7eb;color:#111827;">${escapeHtml(line.quantity)}</td>
        <td align="right" style="padding:14px 10px;border-bottom:1px solid #e5e7eb;color:#111827;">${escapeHtml(line.unitPriceText)} ${escapeHtml(line.priceBasis)}</td>
        <td align="right" style="padding:14px 0;border-bottom:1px solid #e5e7eb;font-weight:700;color:#111827;">${escapeHtml(line.lineTotalText)}</td>
      </tr>`)
    .join("");

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:720px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:#1f2937;padding:28px 32px;">
                <div style="font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#7dd3fc;font-weight:700;">Internext</div>
                <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;color:#ffffff;">Payment request</h1>
                <p style="margin:10px 0 0;color:#d1d5db;font-size:15px;">Hi ${escapeHtml(customerName)}, your Internext order is ready for secure payment.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;">
                <p style="margin:0 0 20px;color:#4b5563;line-height:1.6;">
                  Please use the secure Stripe payment link below to complete payment. Your order will be marked as paid in Internext only after Stripe confirms payment.
                </p>
                <p style="margin:0 0 28px;">
                  <a href="${escapeHtml(paymentUrl)}" style="display:inline-block;background:#1f2937;color:#ffffff;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:10px;">Pay invoice securely</a>
                </p>

                <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Items ordered</h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;table-layout:fixed;">
                  <thead>
                    <tr>
                      <th align="left" width="52%" style="padding:0 0 10px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Item</th>
                      <th align="center" width="12%" style="padding:0 8px 10px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Qty</th>
                      <th align="right" width="18%" style="padding:0 8px 10px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Unit</th>
                      <th align="right" width="18%" style="padding:0 0 10px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Total</th>
                    </tr>
                  </thead>
                  <tbody>${itemRows}</tbody>
                </table>

                <h2 style="margin:24px 0 10px;font-size:18px;color:#111827;">Delivery details</h2>
                <p style="margin:0 0 20px;color:#4b5563;line-height:1.6;">
                  ${shippingAddress.map(escapeHtml).join("<br>") || "No delivery address supplied"}
                </p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:14px;">
                  <tr>
                    <td style="padding:6px 0;color:#4b5563;">Items subtotal ex GST</td>
                    <td align="right" style="padding:6px 0;color:#111827;font-weight:700;">${escapeHtml(summary.itemsSubtotalText)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#4b5563;">GST</td>
                    <td align="right" style="padding:6px 0;color:#111827;font-weight:700;">${escapeHtml(summary.gstAmountText)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#4b5563;">Shipping ex GST</td>
                    <td align="right" style="padding:6px 0;color:#111827;font-weight:700;">${escapeHtml(summary.shippingTotalText)}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 0 4px;border-top:1px solid #e5e7eb;color:#111827;font-weight:800;">Total due</td>
                    <td align="right" style="padding:12px 0 4px;border-top:1px solid #e5e7eb;color:#111827;font-size:18px;font-weight:900;">${escapeHtml(summary.totalKnownValueText)}</td>
                  </tr>
                </table>

                <p style="margin:26px 0 0;color:#4b5563;line-height:1.6;">
                  If the button does not open, paste this link into your browser:<br>
                  <a href="${escapeHtml(paymentUrl)}" style="color:#2563eb;">${escapeHtml(paymentUrl)}</a>
                </p>
                <p style="margin:16px 0 0;color:#4b5563;line-height:1.6;">
                  For questions, call 1300 U R NEXT (1300 876 398).
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `Internext payment request`,
    `Total due: ${summary.totalKnownValueText}`,
    "",
    `Hi ${customerName}, your Internext order is ready for secure payment.`,
    `Pay securely: ${paymentUrl}`,
    "",
    "Items ordered:",
    ...summary.lines.map((line) =>
      `${line.quantity} x ${line.description} (${line.code}) - ${line.lineTotalText}`,
    ),
    "",
    `Items subtotal ex GST: ${summary.itemsSubtotalText}`,
    `GST: ${summary.gstAmountText}`,
    `Shipping ex GST: ${summary.shippingTotalText}`,
    `Total due: ${summary.totalKnownValueText}`,
    "",
    "Delivery address:",
    ...(shippingAddress.length ? shippingAddress : ["No delivery address supplied"]),
    "",
    "For questions, call 1300 U R NEXT (1300 876 398).",
  ].join("\n");

  return {
    to: customerEmail,
    subject: `Internext payment request`,
    html,
    text,
  };
};

const buildPaymentInvoiceCheckoutItems = (order: Record<string, unknown>) => {
  const items = Array.isArray(order.items) ? order.items : [];
  return items.map((item) => {
    const line = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      code: getString(line.code) || getString(line.supplierCode) || "ITEM",
      description: getString(line.description) || getString(line.code) || "Internext invoice item",
      manufacturer: getString(line.manufacturer) || getString(line.brand) || "Internext",
      qty: Math.max(1, Math.floor(getNumber(line.qty) || 1)),
      price: typeof line.price === "number" ? line.price : null,
      priceText: getString(line.priceText) || "Ex GST",
    };
  });
};

const buildAdminPaidOrderEmail = (order: Record<string, unknown>) => {
  const summary = buildOrderEmailSummary(order);
  const customer = order.customer && typeof order.customer === "object"
    ? order.customer as Record<string, unknown>
    : {};
  const reseller = order.reseller && typeof order.reseller === "object"
    ? order.reseller as Record<string, unknown>
    : {};
  const orderNumber = getString(order.orderNumber) || "Internext order";
  const customerName = [customer.firstName, customer.lastName]
    .map(getString)
    .filter(Boolean)
    .join(" ")
    .trim() || getString(customer.email) || "Customer";
  const resellerEmail = getString(reseller.email) || getString(customer.email);
  const resellerRole = getString(reseller.role) || "guest";
  const shippingAddress = [
    customer.address1,
    customer.address2,
    [customer.suburb, customer.state, customer.postcode].map(getString).filter(Boolean).join(" "),
    customer.country,
  ]
    .map(getString)
    .map((part) => part.trim())
    .filter(Boolean);

  const itemRows = summary.lines
    .map((line) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;">
          <div style="font-weight:700;color:#111827;">${escapeHtml(line.description || line.code)}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px;">Code: ${escapeHtml(line.code)}</div>
        </td>
        <td align="center" style="padding:14px 10px;border-bottom:1px solid #e5e7eb;color:#111827;">${escapeHtml(line.quantity)}</td>
        <td align="right" style="padding:14px 10px;border-bottom:1px solid #e5e7eb;color:#111827;">${escapeHtml(line.unitPriceText)} ${escapeHtml(line.priceBasis)}</td>
        <td align="right" style="padding:14px 0;border-bottom:1px solid #e5e7eb;font-weight:700;color:#111827;">${escapeHtml(line.lineTotalText)}</td>
      </tr>`)
    .join("");

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:760px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:#1f2937;padding:28px 32px;">
                <div style="font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#7dd3fc;font-weight:700;">Internext Orders</div>
                <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;color:#ffffff;">New paid order received</h1>
                <p style="margin:10px 0 0;color:#d1d5db;font-size:15px;">${escapeHtml(orderNumber)} has been paid and saved in Internext.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                  <tr>
                    <td style="padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">
                      <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;font-weight:700;">Order number</div>
                      <div style="margin-top:6px;font-size:18px;font-weight:800;color:#111827;">${escapeHtml(orderNumber)}</div>
                    </td>
                    <td width="16"></td>
                    <td style="padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">
                      <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;font-weight:700;">Order date</div>
                      <div style="margin-top:6px;font-size:18px;font-weight:800;color:#111827;">${escapeHtml(formatOrderDate(order.createdAt))}</div>
                    </td>
                  </tr>
                </table>

                <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Products paid for</h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <thead>
                    <tr>
                      <th align="left" style="padding:0 0 10px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Item</th>
                      <th align="center" style="padding:0 10px 10px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Qty</th>
                      <th align="right" style="padding:0 10px 10px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Unit ex GST</th>
                      <th align="right" style="padding:0 0 10px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Line ex GST</th>
                    </tr>
                  </thead>
                  <tbody>${itemRows}</tbody>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;">
                  <tr>
                    <td style="vertical-align:top;padding-right:20px;">
                      <h2 style="margin:0 0 10px;font-size:18px;color:#111827;">Customer</h2>
                      <p style="margin:0;color:#4b5563;line-height:1.7;">
                        <strong style="color:#111827;">${escapeHtml(customerName)}</strong><br>
                        ${escapeHtml(getString(customer.company))}${getString(customer.company) ? "<br>" : ""}
                        ${escapeHtml(getString(customer.email))}<br>
                        ${escapeHtml(getString(customer.phone))}
                      </p>
                      <h2 style="margin:22px 0 10px;font-size:18px;color:#111827;">Delivery address</h2>
                      <p style="margin:0;color:#4b5563;line-height:1.7;">${shippingAddress.map(escapeHtml).join("<br>") || "No delivery address supplied"}</p>
                    </td>
                    <td width="280" style="vertical-align:top;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:14px;">
                        <tr>
                          <td style="padding:6px 0;color:#4b5563;">Items subtotal ex GST</td>
                          <td align="right" style="padding:6px 0;color:#111827;font-weight:700;">${escapeHtml(summary.itemsSubtotalText)}</td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;color:#4b5563;">Shipping ex GST</td>
                          <td align="right" style="padding:6px 0;color:#111827;font-weight:700;">${escapeHtml(summary.shippingTotalText)}</td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;color:#4b5563;">GST</td>
                          <td align="right" style="padding:6px 0;color:#111827;font-weight:700;">${escapeHtml(summary.gstAmountText)}</td>
                        </tr>
                        <tr>
                          <td style="padding:12px 0 4px;border-top:1px solid #e5e7eb;color:#111827;font-weight:800;">Total paid</td>
                          <td align="right" style="padding:12px 0 4px;border-top:1px solid #e5e7eb;color:#111827;font-size:18px;font-weight:900;">${escapeHtml(summary.totalKnownValueText)}</td>
                        </tr>
                      </table>
                      <p style="margin:14px 0 0;color:#6b7280;font-size:12px;line-height:1.5;">
                        Account: ${escapeHtml(resellerEmail || "Not supplied")}<br>
                        Role: ${escapeHtml(resellerRole)}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `New paid Internext order - ${orderNumber}`,
    `Order date: ${formatOrderDate(order.createdAt)}`,
    "",
    "Products paid for:",
    ...summary.lines.map((line) =>
      `- ${line.quantity} x ${line.description || line.code} (${line.code}) - ${line.lineTotalText} ex GST`,
    ),
    "",
    `Items subtotal ex GST: ${summary.itemsSubtotalText}`,
    `Shipping ex GST: ${summary.shippingTotalText}`,
    `GST: ${summary.gstAmountText}`,
    `Total paid: ${summary.totalKnownValueText}`,
    "",
    `Customer: ${customerName}`,
    `Customer email: ${getString(customer.email)}`,
    `Phone: ${getString(customer.phone)}`,
    `Company: ${getString(customer.company)}`,
    "",
    "Delivery address:",
    ...(shippingAddress.length ? shippingAddress : ["No delivery address supplied"]),
    "",
    `Account: ${resellerEmail}`,
    `Role: ${resellerRole}`,
  ].join("\n");

  return {
    to:
      readEnv("ORDER_NOTIFICATION_EMAIL") ||
      readEnv("ADMIN_ORDER_EMAIL") ||
      readEnv("ADMIN_EMAIL") ||
      "orders@internext.com.au",
    subject: `New Paid Internext Order - ${orderNumber}`,
    html,
    text,
  };
};

const buildCustomerShipmentEmail = (order: Record<string, unknown>) => {
  const customer = order.customer && typeof order.customer === "object"
    ? order.customer as Record<string, unknown>
    : {};
  const orderNumber = getString(order.orderNumber) || "your order";
  const customerName = [customer.firstName, customer.lastName]
    .map(getString)
    .filter(Boolean)
    .join(" ")
    .trim() || "there";
  const customerEmail = getString(customer.email).trim();
  const carrier = getString(order.trackingCarrier).trim();
  const trackingNumber = getString(order.trackingNumber).trim();
  const trackingUrl = getString(order.trackingUrl).trim();
  const expectedArrivalDate =
    formatOrderDate(order.expectedArrivalDate) ||
    getString(order.expectedArrivalDate).trim() ||
    "To be confirmed";
  const items = Array.isArray(order.items) ? order.items : [];

  const itemRows = items
    .map((item) => {
      const line = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:700;">${escapeHtml(line.description)}</td>
          <td align="right" style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#4b5563;">Qty ${escapeHtml(line.qty)}</td>
        </tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:#1f2937;padding:28px 32px;">
                <div style="font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#7dd3fc;font-weight:700;">Internext</div>
                <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;color:#ffffff;">Your order has shipped</h1>
                <p style="margin:10px 0 0;color:#d1d5db;font-size:15px;">Hi ${escapeHtml(customerName)}, your Internext order is now on its way.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                  <tr>
                    <td style="padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">
                      <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;font-weight:700;">Order number</div>
                      <div style="margin-top:6px;font-size:18px;font-weight:800;color:#111827;">${escapeHtml(orderNumber)}</div>
                    </td>
                    <td width="16"></td>
                    <td style="padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">
                      <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;font-weight:700;">Expected arrival</div>
                      <div style="margin-top:6px;font-size:18px;font-weight:800;color:#111827;">${escapeHtml(expectedArrivalDate)}</div>
                    </td>
                  </tr>
                </table>

                <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Tracking details</h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:14px;margin-bottom:24px;">
                  <tr>
                    <td style="padding:8px 0;color:#4b5563;">Carrier</td>
                    <td align="right" style="padding:8px 0;color:#111827;font-weight:700;">${escapeHtml(carrier)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#4b5563;">Tracking number</td>
                    <td align="right" style="padding:8px 0;color:#111827;font-weight:700;">${escapeHtml(trackingNumber)}</td>
                  </tr>
                </table>

                <p style="margin:0 0 22px;color:#4b5563;line-height:1.6;">
                  You can use the tracking link below to follow the delivery progress with ${escapeHtml(carrier)}.
                </p>
                <p style="margin:0 0 26px;">
                  <a href="${escapeHtml(trackingUrl)}" style="display:inline-block;background:#1f2937;color:#ffffff;text-decoration:none;border-radius:10px;padding:13px 18px;font-weight:700;">Track your order</a>
                </p>

                ${itemRows ? `
                  <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Items in this shipment</h2>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                    <tbody>${itemRows}</tbody>
                  </table>` : ""}

                <p style="margin:26px 0 0;color:#4b5563;line-height:1.6;">
                  For delivery questions, call 1300 U R NEXT (1300 876 398).
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    "Your Internext order has shipped",
    `Order: ${orderNumber}`,
    `Carrier: ${carrier}`,
    `Tracking number: ${trackingNumber}`,
    `Tracking link: ${trackingUrl}`,
    `Expected arrival: ${expectedArrivalDate}`,
    "",
    "Items:",
    ...items.map((item) => {
      const line = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return `- ${getString(line.description)} x ${line.qty ?? ""}`;
    }),
    "",
    "For delivery questions, call 1300 U R NEXT (1300 876 398).",
  ].join("\n");

  return {
    to: customerEmail,
    subject: `Your Internext order has shipped - ${orderNumber}`,
    html,
    text,
  };
};

const postJsonWebhook = async (url: string, payload: unknown) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    return {
      ok: response.ok,
      status: response.status,
      message: response.ok
        ? "Workflow accepted the request."
        : `Workflow returned HTTP ${response.status}.`,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message:
        error instanceof Error && error.name === "AbortError"
          ? `Workflow did not respond within ${WEBHOOK_TIMEOUT_MS / 1000} seconds.`
          : error instanceof Error
            ? error.message
            : "Unable to reach workflow.",
    };
  } finally {
    clearTimeout(timeout);
  }
};

export default async function handler(
  req: {
    method?: string;
    body?: string | RequestBody;
    headers?: { cookie?: string; host?: string; "user-agent"?: string };
  },
  res: {
    statusCode?: number;
    setHeader: (name: string, value: string) => void;
    end: (chunk?: string) => void;
  },
) {
  if (req.method === "GET") {
    const result = await fetchSharedOrders(req);
    return sendJson(res, result.status, result.body);
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { message: "Method not allowed." });
  }

  const body = parseJsonBody<RequestBody>(req.body);

  const adminWebhookUrl = readEnv("POWER_AUTOMATE_ORDER_WEBHOOK_URL");
  const customerWebhookUrl = readEnv("POWER_AUTOMATE_CUSTOMER_ORDER_WEBHOOK_URL");
  const xeroInvoiceWebhookUrl = readEnv("POWER_AUTOMATE_XERO_INVOICE_WEBHOOK_URL");

  if (body?.notificationType === "sync_xero_inventory") {
    const session = getSessionFromRequest(req);
    if (session?.role !== "admin") {
      return sendJson(res, 403, { message: "Admin access is required to sync Xero inventory items." });
    }

    const result = await syncXeroInventoryBatch(body.sync, req.headers?.host || "");
    return sendJson(res, result.status, result.body);
  }

  if (!body?.order) {
    return sendJson(res, 400, { message: "An order payload is required." });
  }

  if (body.notificationType === "send_payment_invoice") {
    const session = getSessionFromRequest(req);
    if (session?.role !== "admin") {
      return sendJson(res, 403, { message: "Admin access is required to create and send invoices." });
    }

    if (!customerWebhookUrl) {
      return sendJson(res, 500, { message: "Customer order email webhook is not configured." });
    }

    const orderId = getOrderField(body.order, "id") || getOrderField(body.order, "orderNumber");
    const orderNumber = getOrderField(body.order, "orderNumber");
    const customer = body.order.customer && typeof body.order.customer === "object"
      ? body.order.customer as Record<string, unknown>
      : {};
    const customerEmail = getNestedString(customer, "email");
    const checkoutItems = buildPaymentInvoiceCheckoutItems(body.order);
    const payableItems = checkoutItems.filter((item) => item.price !== null && item.price >= 0);

    if (!orderId || !orderNumber) {
      return sendJson(res, 400, { message: "Invoice id and invoice number are required." });
    }

    if (!customerEmail) {
      return sendJson(res, 400, { message: "Customer email address was not provided." });
    }

    if (payableItems.length === 0) {
      return sendJson(res, 400, { message: "At least one fixed-price invoice item is required." });
    }

    const origin = getRequestOrigin(req.headers, body.origin || "");
    const checkoutParams = buildStripeCheckoutParams({
      origin,
      orderNumber,
      customer: {
        firstName: getNestedString(customer, "firstName") || getNestedString(customer, "company") || "Internext",
        lastName: getNestedString(customer, "lastName") || "Customer",
        email: customerEmail,
        phone: getNestedString(customer, "phone"),
        company: getNestedString(customer, "company"),
      },
      items: payableItems,
      resellerEmail: session.email,
      shipping:
        getNumber(body.order.shippingTotal) > 0
          ? {
              name: getString(body.order.shippingName) || "Shipping",
              price: getNumber(body.order.shippingTotal),
            }
          : undefined,
      successUrl: `${origin}/checkout?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/checkout?checkout=cancelled`,
    });
    checkoutParams.set("metadata[internext_payment_type]", "admin_invoice");
    checkoutParams.set("metadata[invoice_order_id]", orderId);
    checkoutParams.set("payment_intent_data[metadata][internext_payment_type]", "admin_invoice");
    checkoutParams.set("payment_intent_data[metadata][invoice_order_id]", orderId);

    const stripeSession = await createStripeCheckoutSession(checkoutParams);
    if (!stripeSession.ok) {
      return sendJson(res, 502, { message: stripeSession.message });
    }

    const now = new Date().toISOString();
    const orderForStorage = {
      ...body.order,
      paymentStatus: "awaiting_payment",
      updatedAt: now,
      stripeCheckoutSessionId: stripeSession.id,
      stripePaymentUrl: stripeSession.url,
    };
    const customerEmailPayload = buildPaymentInvoiceEmail(orderForStorage, stripeSession.url);

    const [storageResponse, marketingContactResponse, customerResponse] = await Promise.all([
      upsertSharedOrder(orderForStorage),
      upsertMarketingContactFromOrder(orderForStorage),
      postJsonWebhook(customerWebhookUrl, {
        type: "customer_payment_invoice",
        submittedAt: now,
        source: "internext-admin",
        host: req.headers?.host || "",
        userAgent: req.headers?.["user-agent"] || "",
        orderNumber,
        paymentUrl: stripeSession.url,
        to: customerEmailPayload.to,
        subject: customerEmailPayload.subject,
        html: customerEmailPayload.html,
        text: customerEmailPayload.text,
        customerEmail: customerEmailPayload,
        order: orderForStorage,
      }),
    ]);

    return sendJson(res, customerResponse.ok ? 200 : 502, {
      ok: customerResponse.ok,
      order: orderForStorage,
      paymentUrl: stripeSession.url,
      stripeSessionId: stripeSession.id,
      sharedOrderSaved: storageResponse.ok,
      sharedOrderStatus: storageResponse.status,
      sharedOrderMessage: storageResponse.message,
      marketingContactSaved: marketingContactResponse.ok,
      marketingContactStatus: marketingContactResponse.status,
      marketingContactMessage: marketingContactResponse.message,
      customerEmailSent: customerResponse.ok,
      customerEmailStatus: customerResponse.status,
      customerEmailTo: customerEmailPayload.to,
      customerEmailMessage: customerResponse.ok
        ? "Customer payment invoice workflow accepted the request."
        : `Customer payment invoice workflow failed: ${customerResponse.message}`,
      message: customerResponse.ok
        ? `Invoice ${orderNumber} was emailed with a Stripe payment link.`
        : customerResponse.message,
    });
  }

  if (body.notificationType === "remove_invoice") {
    const session = getSessionFromRequest(req);
    if (session?.role !== "admin") {
      return sendJson(res, 403, { message: "Admin access is required to remove invoices." });
    }

    const [orderDeleteResponse, invoiceRowsDeleteResponse] = await Promise.all([
      deleteSharedOrderForOrder(body.order),
      deleteXeroSalesInvoiceRowsForOrder(body.order),
    ]);
    const ok = orderDeleteResponse.ok && invoiceRowsDeleteResponse.ok;

    return sendJson(res, ok ? 200 : 502, {
      ok,
      invoiceRemoved: orderDeleteResponse.ok,
      invoiceRemoveStatus: orderDeleteResponse.status,
      invoiceRemoveMessage: orderDeleteResponse.message,
      xeroInvoiceRowsRemoved: invoiceRowsDeleteResponse.ok,
      xeroInvoiceRowsStatus: invoiceRowsDeleteResponse.status,
      xeroInvoiceRowsMessage: invoiceRowsDeleteResponse.message,
      message: ok
        ? "Invoice removed from Internext order storage."
        : orderDeleteResponse.ok
          ? invoiceRowsDeleteResponse.message
          : orderDeleteResponse.message,
    });
  }

  if (body.notificationType === "create_xero_invoice") {
    const session = getSessionFromRequest(req);
    if (session?.role !== "admin") {
      return sendJson(res, 403, { message: "Admin access is required to create invoice rows." });
    }

    const emailSummary = buildOrderEmailSummary(body.order);
    const xeroInvoicePayload = buildXeroInvoicePayload(body.order);
    const orderForStorage = {
      ...body.order,
      updatedAt: new Date().toISOString(),
      xeroSalesInvoiceTemplate: "SalesInvoiceTemplate.csv",
      xeroSalesInvoiceRows: xeroInvoicePayload.csvRows,
      salesInvoiceTemplate: xeroInvoicePayload.salesInvoiceTemplate,
    };
    const [storageResponse, inventoryItemsResponse, invoiceRowsResponse] = await Promise.all([
      upsertSharedOrder(orderForStorage),
      upsertXeroInventoryItemsFromOrder(body.order, emailSummary),
      upsertXeroSalesInvoiceRowsFromOrder(body.order, emailSummary),
    ]);

    return sendJson(res, invoiceRowsResponse.ok ? 200 : 502, {
      ok: invoiceRowsResponse.ok,
      sharedOrderSaved: storageResponse.ok,
      sharedOrderStatus: storageResponse.status,
      sharedOrderMessage: storageResponse.message,
      xeroInventoryItemsSaved: inventoryItemsResponse.ok,
      xeroInventoryItemsStatus: inventoryItemsResponse.status,
      xeroInventoryItemsMessage: inventoryItemsResponse.message,
      xeroInvoiceRowsSaved: invoiceRowsResponse.ok,
      xeroInvoiceRowsStatus: invoiceRowsResponse.status,
      xeroInvoiceRowsMessage: invoiceRowsResponse.message,
      rowCount: xeroInvoicePayload.csvRows.length,
      message: invoiceRowsResponse.ok
        ? `Created ${xeroInvoicePayload.csvRows.length} invoice row${xeroInvoicePayload.csvRows.length === 1 ? "" : "s"} for ${emailSummary.orderNumber}.`
        : invoiceRowsResponse.message,
    });
  }

  if (body.notificationType === "remove_xero_invoice") {
    const session = getSessionFromRequest(req);
    if (session?.role !== "admin") {
      return sendJson(res, 403, { message: "Admin access is required to remove invoice rows." });
    }

    const orderForStorage = {
      ...body.order,
      updatedAt: new Date().toISOString(),
    };
    delete orderForStorage.xeroSalesInvoiceRows;
    delete orderForStorage.xeroSalesInvoiceTemplate;
    delete orderForStorage.salesInvoiceTemplate;
    const [deleteResponse, storageResponse] = await Promise.all([
      deleteXeroSalesInvoiceRowsForOrder(body.order),
      upsertSharedOrder(orderForStorage),
    ]);

    return sendJson(res, deleteResponse.ok ? 200 : 502, {
      ok: deleteResponse.ok,
      xeroInvoiceRowsRemoved: deleteResponse.ok,
      xeroInvoiceRowsStatus: deleteResponse.status,
      xeroInvoiceRowsMessage: deleteResponse.message,
      sharedOrderSaved: storageResponse.ok,
      sharedOrderStatus: storageResponse.status,
      sharedOrderMessage: storageResponse.message,
      message: deleteResponse.ok ? "Invoice rows removed for this order." : deleteResponse.message,
    });
  }

  if (body.notificationType === "store_order") {
    const session = getSessionFromRequest(req);
    if (session?.role !== "admin") {
      return sendJson(res, 403, { message: "Admin access is required to update shared orders." });
    }

    const [storageResponse, marketingContactResponse] = await Promise.all([
      upsertSharedOrder(body.order),
      upsertMarketingContactFromOrder(body.order),
    ]);
    return sendJson(res, storageResponse.ok ? 200 : 502, {
      ok: storageResponse.ok,
      sharedOrderSaved: storageResponse.ok,
      sharedOrderStatus: storageResponse.status,
      sharedOrderMessage: storageResponse.message,
      marketingContactSaved: marketingContactResponse.ok,
      marketingContactStatus: marketingContactResponse.status,
      marketingContactMessage: marketingContactResponse.message,
    });
  }

  if (body.notificationType === "shipment") {
    const session = getSessionFromRequest(req);
    if (session?.role !== "admin") {
      return sendJson(res, 403, { message: "Admin access is required to send shipment emails." });
    }

    if (!customerWebhookUrl) {
      return sendJson(res, 500, { message: "Customer order email webhook is not configured." });
    }

    const customerEmail = buildCustomerShipmentEmail(body.order);
    if (!customerEmail.to) {
      return sendJson(res, 400, { message: "Customer email address was not provided." });
    }

    const [storageResponse, marketingContactResponse, customerResponse] = await Promise.all([
      upsertSharedOrder(body.order),
      upsertMarketingContactFromOrder(body.order),
      postJsonWebhook(customerWebhookUrl, {
      type: "customer_order_shipped",
      submittedAt: new Date().toISOString(),
      source: "internext-admin",
      host: req.headers?.host || "",
      userAgent: req.headers?.["user-agent"] || "",
      orderNumber: body.order.orderNumber || "",
      to: customerEmail.to,
      subject: customerEmail.subject,
      html: customerEmail.html,
      text: customerEmail.text,
      customerEmail,
      order: body.order,
      }),
    ]);

    return sendJson(res, customerResponse.ok ? 200 : 502, {
      ok: customerResponse.ok,
      customerEmailSent: customerResponse.ok,
      customerEmailStatus: customerResponse.status,
      customerEmailTo: customerEmail.to,
      sharedOrderSaved: storageResponse.ok,
      sharedOrderStatus: storageResponse.status,
      sharedOrderMessage: storageResponse.message,
      marketingContactSaved: marketingContactResponse.ok,
      marketingContactStatus: marketingContactResponse.status,
      marketingContactMessage: marketingContactResponse.message,
      customerEmailMessage: customerResponse.ok
        ? "Customer shipment workflow accepted the request."
        : `Customer shipment workflow failed: ${customerResponse.message}`,
    });
  }

  if (!adminWebhookUrl && !customerWebhookUrl && !xeroInvoiceWebhookUrl) {
    return sendJson(res, 500, { message: "Order notification webhooks are not configured." });
  }

  try {
    const emailSummary = buildOrderEmailSummary(body.order);
    const customerEmail = buildCustomerConfirmationEmail(body.order);
    const adminEmail = buildAdminPaidOrderEmail(body.order);
    const xeroInvoicePayload = buildXeroInvoicePayload(body.order);
    const orderForStorage = {
      ...body.order,
      xeroSalesInvoiceTemplate: "SalesInvoiceTemplate.csv",
      xeroSalesInvoiceRows: xeroInvoicePayload.csvRows,
      salesInvoiceTemplate: xeroInvoicePayload.salesInvoiceTemplate,
    };
    const [storageResponse, marketingContactResponse, inventoryItemsResponse, invoiceRowsResponse] = await Promise.all([
      upsertSharedOrder(orderForStorage),
      upsertMarketingContactFromOrder(body.order),
      upsertXeroInventoryItemsFromOrder(body.order, emailSummary),
      upsertXeroSalesInvoiceRowsFromOrder(body.order, emailSummary),
    ]);
    const adminPayload = {
      type: "paid_order",
      submittedAt: new Date().toISOString(),
      source: "internext-checkout",
      host: req.headers?.host || "",
      userAgent: req.headers?.["user-agent"] || "",
      orderNumber: emailSummary.orderNumber,
      to: adminEmail.to,
      subject: adminEmail.subject,
      html: adminEmail.html,
      text: adminEmail.text,
      adminEmail,
      order: {
        ...orderForStorage,
        emailSummary,
      },
    };
    const customerPayload = {
      type: "customer_order_confirmation",
      submittedAt: new Date().toISOString(),
      source: "internext-checkout",
      orderNumber: emailSummary.orderNumber,
      to: customerEmail.to,
      subject: customerEmail.subject,
      html: customerEmail.html,
      text: customerEmail.text,
      customerEmail,
    };

    const [adminResponse, customerResponse, xeroInvoiceResponse] = await Promise.all([
      adminWebhookUrl
        ? postJsonWebhook(adminWebhookUrl, adminPayload)
        : Promise.resolve({
            ok: false,
            status: 0,
            message: "Admin order email webhook is not configured.",
          }),
      customerWebhookUrl && customerEmail.to
        ? postJsonWebhook(customerWebhookUrl, customerPayload)
        : Promise.resolve({
            ok: false,
            status: 0,
            message: !customerWebhookUrl
              ? "Customer order email webhook is not configured."
              : "Customer email address was not provided.",
          }),
      xeroInvoiceWebhookUrl
        ? postJsonWebhook(xeroInvoiceWebhookUrl, xeroInvoicePayload)
        : Promise.resolve({
            ok: false,
            status: 0,
            message: "Xero invoice webhook is not configured.",
          }),
    ]);

    return sendJson(res, 200, {
      ok: true,
      adminEmailSent: adminResponse.ok,
      adminEmailStatus: adminResponse.status,
      adminEmailMessage: adminResponse.ok
        ? "Admin order email workflow accepted the request."
        : `Admin order email workflow failed: ${adminResponse.message}`,
      customerEmailSent: customerResponse.ok,
      customerEmailStatus: customerResponse.status,
      customerEmailTo: customerEmail.to,
      sharedOrderSaved: storageResponse.ok,
      sharedOrderStatus: storageResponse.status,
      sharedOrderMessage: storageResponse.message,
      marketingContactSaved: marketingContactResponse.ok,
      marketingContactStatus: marketingContactResponse.status,
      marketingContactMessage: marketingContactResponse.message,
      xeroInventoryItemsSaved: inventoryItemsResponse.ok,
      xeroInventoryItemsStatus: inventoryItemsResponse.status,
      xeroInventoryItemsMessage: inventoryItemsResponse.message,
      xeroInvoiceRowsSaved: invoiceRowsResponse.ok,
      xeroInvoiceRowsStatus: invoiceRowsResponse.status,
      xeroInvoiceRowsMessage: invoiceRowsResponse.message,
      customerEmailMessage: customerResponse.ok
        ? "Customer confirmation workflow accepted the request."
        : `Customer confirmation workflow failed: ${customerResponse.message}`,
      xeroInvoiceSent: xeroInvoiceResponse.ok,
      xeroInvoiceStatus: xeroInvoiceResponse.status,
      xeroInvoiceMessage: xeroInvoiceResponse.ok
        ? "Xero invoice workflow accepted the request."
        : `Xero invoice workflow failed: ${xeroInvoiceResponse.message}`,
    });
  } catch {
    return sendJson(res, 502, { message: "Unable to reach the order email workflow." });
  }
}
