type CheckoutLineItem = {
  code: string;
  description: string;
  manufacturer: string;
  qty: number;
  price: number | null;
};

type CheckoutCustomer = {
  firstName: string;
  lastName: string;
  email: string;
};

const readEnv = (key: string) => process.env[key]?.trim() || "";

export const getStripeSecretKey = () => readEnv("STRIPE_SECRET_KEY");

export const sendJson = (
  res: {
    statusCode?: number;
    setHeader: (name: string, value: string) => void;
    end: (chunk?: string) => void;
  },
  statusCode: number,
  body: unknown,
) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

export const parseJsonBody = <T extends Record<string, unknown>>(
  body: string | T | undefined,
): T | null => {
  if (!body) {
    return null;
  }

  if (typeof body === "string") {
    try {
      return JSON.parse(body) as T;
    } catch {
      return null;
    }
  }

  return body;
};

const formatLineItemName = (item: CheckoutLineItem) => {
  const brand = item.manufacturer?.trim();
  if (brand && !item.description.toLowerCase().includes(brand.toLowerCase())) {
    return `${brand} ${item.description}`.trim();
  }

  return item.description.trim();
};

export const validateCheckoutPayload = (
  customer: CheckoutCustomer | undefined,
  items: CheckoutLineItem[] | undefined,
) => {
  if (!customer?.firstName?.trim() || !customer?.lastName?.trim() || !customer?.email?.trim()) {
    return "Customer details are incomplete.";
  }

  if (!Array.isArray(items) || items.length === 0) {
    return "No priced items were supplied for checkout.";
  }

  if (items.some((item) => typeof item.qty !== "number" || item.qty <= 0)) {
    return "One or more line quantities are invalid.";
  }

  if (items.some((item) => item.price === null || item.price < 0)) {
    return "Online payment is only available for items with a fixed sell price.";
  }

  return null;
};

export const buildStripeCheckoutParams = (payload: {
  origin: string;
  customer: CheckoutCustomer;
  items: CheckoutLineItem[];
  resellerEmail?: string;
}) => {
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${payload.origin}/#/checkout?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${payload.origin}/#/checkout?checkout=cancelled`);
  params.set("billing_address_collection", "required");
  params.set("phone_number_collection[enabled]", "true");
  params.set("customer_email", payload.customer.email.trim());
  params.set("payment_intent_data[metadata][customer_email]", payload.customer.email.trim());
  params.set(
    "payment_intent_data[metadata][customer_name]",
    `${payload.customer.firstName.trim()} ${payload.customer.lastName.trim()}`.trim(),
  );

  if (payload.resellerEmail?.trim()) {
    params.set("payment_intent_data[metadata][reseller_email]", payload.resellerEmail.trim());
  }

  payload.items.forEach((item, index) => {
    const unitAmount = Math.round((item.price ?? 0) * 100);

    params.set(`line_items[${index}][quantity]`, String(item.qty));
    params.set(`line_items[${index}][price_data][currency]`, "aud");
    params.set(`line_items[${index}][price_data][unit_amount]`, String(unitAmount));
    params.set(
      `line_items[${index}][price_data][product_data][name]`,
      formatLineItemName(item),
    );
    params.set(`line_items[${index}][price_data][product_data][metadata][code]`, item.code);
  });

  return params;
};

export const createStripeCheckoutSession = async (params: URLSearchParams) => {
  const stripeSecretKey = getStripeSecretKey();
  if (!stripeSecretKey) {
    return {
      ok: false as const,
      message: "Stripe checkout is not configured on the server yet.",
    };
  }

  try {
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const payload = (await response.json()) as {
      url?: string;
      error?: { message?: string };
    };

    if (!response.ok || !payload.url) {
      return {
        ok: false as const,
        message: payload.error?.message || "Stripe could not create a checkout session.",
      };
    }

    return {
      ok: true as const,
      url: payload.url,
    };
  } catch {
    return {
      ok: false as const,
      message: "Unable to reach Stripe from the checkout service.",
    };
  }
};

export const retrieveStripeCheckoutSession = async (sessionId: string) => {
  const stripeSecretKey = getStripeSecretKey();
  if (!stripeSecretKey) {
    return {
      ok: false as const,
      message: "Stripe checkout is not configured on the server yet.",
    };
  }

  try {
    const response = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
        },
      },
    );

    const payload = (await response.json()) as {
      id?: string;
      payment_status?: string;
      status?: string;
      amount_total?: number | null;
      currency?: string | null;
      customer_details?: { email?: string | null } | null;
      error?: { message?: string };
    };

    if (!response.ok) {
      return {
        ok: false as const,
        message: payload.error?.message || "Stripe could not verify this checkout session.",
      };
    }

    if (payload.payment_status !== "paid") {
      return {
        ok: false as const,
        message: "Payment has not completed yet for this Stripe session.",
      };
    }

    return {
      ok: true as const,
      session: {
        id: payload.id || sessionId,
        paymentStatus: payload.payment_status || "unpaid",
        status: payload.status || "open",
        amountTotal: payload.amount_total ?? 0,
        currency: payload.currency || "aud",
        customerEmail: payload.customer_details?.email || "",
      },
    };
  } catch {
    return {
      ok: false as const,
      message: "Unable to reach Stripe from the checkout service.",
    };
  }
};
