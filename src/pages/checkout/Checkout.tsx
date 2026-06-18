import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import PortalNav from "@/components/auth/PortalNav";
import {
  CartItem,
  CheckoutCustomer,
  OrderRecord,
  OrderReseller,
  formatAud,
  getCartItems,
  placeOrder,
  saveCartItems,
} from "@/lib/orderManagement";
import { getOptionalProductImage, handleProductImageError } from "@/lib/productImages";
import { loadCatalogProducts } from "@/lib/liveCatalog";
import { formatStoredPrice, formatStoredTotal } from "@/lib/pricing";
import { ArrowLeft, CheckCircle2, AlertTriangle, LockKeyhole, MailCheck, ShieldCheck, Truck } from "lucide-react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { trackPurchase } from "@/lib/analytics";

const defaultCustomer: CheckoutCustomer = {
  firstName: "",
  lastName: "",
  company: "",
  email: "",
  phone: "",
  address1: "",
  address2: "",
  suburb: "",
  state: "",
  postcode: "",
  country: "Australia",
  notes: "",
};

type AddressLookupResult = {
  place_id: number;
  formatted: string;
  address_line1?: string;
  address_line2?: string;
  housenumber?: string;
  street?: string;
  suburb?: string;
  city?: string;
  state?: string;
  state_code?: string;
  postcode?: string;
  country?: string;
  address?: {
    postcode?: string;
    country?: string;
  };
};

const getLineOneFromLookup = (result: AddressLookupResult) => {
  const addressLine1 = result.address_line1?.trim();
  if (addressLine1) {
    return addressLine1;
  }

  const houseNumber = result.housenumber?.trim();
  const road = result.street?.trim();

  if (houseNumber && road) {
    return `${houseNumber} ${road}`;
  }

  return road || result.formatted.split(",")[0]?.trim() || "";
};

const getSuburbFromLookup = (result: AddressLookupResult) =>
  result.suburb?.trim() ||
  result.city?.trim() ||
  "";

const getFormattedParts = (result: AddressLookupResult) =>
  result.formatted
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

const getAddressLineTwoFromLookup = (result: AddressLookupResult, suburb: string) => {
  const addressLine2 = result.address_line2?.trim();
  if (addressLine2) {
    return addressLine2;
  }

  const parts = getFormattedParts(result);
  const lineOne = getLineOneFromLookup(result).toLowerCase();
  const suburbLower = suburb.toLowerCase();

  return (
    parts.find((part) => {
      const normalized = part.toLowerCase();
      return normalized !== lineOne && normalized !== suburbLower;
    }) || ""
  );
};

const getStateFromLookup = (result: AddressLookupResult) => {
  const stateCode = result.state_code?.trim();
  if (stateCode) {
    return stateCode.toUpperCase();
  }

  const state = result.state?.trim();
  if (!state) {
    return "";
  }

  const stateMap: Record<string, string> = {
    "New South Wales": "NSW",
    Victoria: "VIC",
    Queensland: "QLD",
    Tasmania: "TAS",
    "South Australia": "SA",
    "Western Australia": "WA",
    "Northern Territory": "NT",
    "Australian Capital Territory": "ACT",
  };

  return stateMap[state] || state;
};

const GEOAPIFY_API_KEY = (import.meta.env.VITE_GEOAPIFY_API_KEY as string | undefined)?.trim() || "";

const CHECKOUT_DRAFT_STORAGE_KEY = "internext-checkout-draft";
const HANDLED_PAYMENT_SESSIONS_STORAGE_KEY = "internext-paid-checkout-sessions";
const ORDER_NOTIFICATION_TIMEOUT_MS = 6000;

type CheckoutDraft = {
  customer: CheckoutCustomer;
  reseller?: OrderReseller;
  items: CartItem[];
  shipping?: {
    name: string;
    price: number;
  };
};

type OrderNotificationResult = {
  customerEmailSent?: boolean;
  customerEmailStatus?: number;
  customerEmailTo?: string;
  customerEmailMessage?: string;
};

type ShippingQuote = {
  service: {
    code: string;
    name: string;
    price: number;
    priceText: string;
  };
  parcel: {
    weightKg: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
  };
};

const getShippingQuoteKey = (
  postcode: string,
  country: string,
  items: CartItem[],
) =>
  JSON.stringify({
    postcode: postcode.trim(),
    country: country.trim().toLowerCase(),
    items: items
      .map((item) => ({
        code: item.code,
        qty: item.qty,
        weightKg: item.weightKg ?? null,
        heightCm: item.heightCm ?? null,
        widthCm: item.widthCm ?? null,
        depthCm: item.depthCm ?? null,
      }))
      .sort((a, b) => a.code.localeCompare(b.code)),
  });

declare global {
  interface Window {
    renderOptIn?: () => void;
    gapi?: {
      load: (api: string, callback: () => void) => void;
      surveyoptin?: {
        render: (options: {
          merchant_id: number;
          order_id: string;
          email: string;
          delivery_country: string;
          estimated_delivery_date: string;
          products?: Array<{ gtin: string }>;
        }) => void;
      };
    };
  }
}

const readCheckoutDraft = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CheckoutDraft) : null;
  } catch {
    return null;
  }
};

const saveCheckoutDraft = (draft: CheckoutDraft) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CHECKOUT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
};

const clearCheckoutDraft = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
};

const getHandledSessions = () => {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const raw = window.localStorage.getItem(HANDLED_PAYMENT_SESSIONS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

const markSessionHandled = (sessionId: string) => {
  if (typeof window === "undefined") {
    return;
  }

  const existing = new Set(getHandledSessions());
  existing.add(sessionId);
  window.localStorage.setItem(
    HANDLED_PAYMENT_SESSIONS_STORAGE_KEY,
    JSON.stringify(Array.from(existing)),
  );
};

const mergeLiveShippingMeasurements = async (items: CartItem[]) => {
  if (items.length === 0) {
    return items;
  }

  const liveProducts = await loadCatalogProducts();
  const liveByCode = new Map(
    liveProducts.flatMap((product) =>
      [product.code, product.supplierCode]
        .map((value) => value?.trim().toLowerCase())
        .filter((value): value is string => Boolean(value))
        .map((key) => [key, product] as const),
    ),
  );

  return items.map((item) => {
    const live = [item.code, item.supplierCode]
      .map((value) => value?.trim().toLowerCase())
      .filter((value): value is string => Boolean(value))
      .map((key) => liveByCode.get(key))
      .find(Boolean);

    if (!live) {
      return item;
    }

    return {
      ...item,
      availabilityText: live.availabilityText,
      etaDate: live.etaDate,
      etaStatus: live.etaStatus,
      stockQuantity: live.stockQuantity,
      weightKg: live.weightKg,
      heightCm: live.heightCm,
      widthCm: live.widthCm,
      depthCm: live.depthCm,
    };
  });
};

const getOutOfStockEtaMessage = (item: CartItem) => {
  const etaDate = item.etaDate?.trim();
  if (etaDate) {
    return `Out of stock. ETA: ${etaDate}`;
  }

  const etaStatus = item.etaStatus?.trim();
  if (etaStatus && !/^(check availability|in stock)$/i.test(etaStatus)) {
    if (/^contact us/i.test(etaStatus)) {
      return etaStatus;
    }

    return `Out of stock. ETA: ${etaStatus}`;
  }

  return "Out of stock. For ETA please call 1300 567 835.";
};

const GOOGLE_CUSTOMER_REVIEWS_MERCHANT_ID = 5802034641;

const getGoogleReviewDeliveryDate = (createdAt: string) => {
  const baseDate = new Date(createdAt);
  const deliveryDate = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
  deliveryDate.setDate(deliveryDate.getDate() + 7);
  return deliveryDate.toISOString().slice(0, 10);
};

const GoogleCustomerReviewsOptIn = ({ order }: { order: OrderRecord }) => {
  useEffect(() => {
    if (!order.customer.email || !order.orderNumber) {
      return;
    }

    const renderOptIn = () => {
      window.gapi?.load("surveyoptin", () => {
        window.gapi?.surveyoptin?.render({
          merchant_id: GOOGLE_CUSTOMER_REVIEWS_MERCHANT_ID,
          order_id: order.orderNumber,
          email: order.customer.email,
          delivery_country: "AU",
          estimated_delivery_date: getGoogleReviewDeliveryDate(order.createdAt),
        });
      });
    };

    window.renderOptIn = renderOptIn;

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src^="https://apis.google.com/js/platform.js"]',
    );

    if (existingScript) {
      renderOptIn();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/platform.js?onload=renderOptIn";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      if (window.renderOptIn === renderOptIn) {
        delete window.renderOptIn;
      }
    };
  }, [order.createdAt, order.customer.email, order.orderNumber]);

  return null;
};

const sendOrderNotification = async (order: OrderRecord) => {
  let notificationMessage = "Payment received and order recorded.";
  let notificationTimeout: number | undefined;

  try {
    const notificationController = new AbortController();
    notificationTimeout = window.setTimeout(
      () => notificationController.abort(),
      ORDER_NOTIFICATION_TIMEOUT_MS,
    );
    const notificationResponse = await fetch("/api/order-notification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: notificationController.signal,
      body: JSON.stringify({
        order,
      }),
    });
    window.clearTimeout(notificationTimeout);
    const notificationPayload = (await notificationResponse.json()) as OrderNotificationResult & {
      message?: string;
    };

    if (notificationPayload.customerEmailSent) {
      notificationMessage = `Payment received and order recorded. Confirmation email sent to ${notificationPayload.customerEmailTo || order.customer.email}.`;
    } else if (notificationPayload.customerEmailMessage) {
      notificationMessage = `Payment received and order recorded. Customer confirmation email was not sent: ${notificationPayload.customerEmailMessage}`;
    } else if (!notificationResponse.ok) {
      notificationMessage = `Payment received and order recorded. Order notification failed: ${notificationPayload.message || "Unable to contact email workflow."}`;
    }
  } catch (notificationError) {
    notificationMessage =
      notificationError instanceof Error && notificationError.name === "AbortError"
        ? "Payment received and order recorded. Email workflows are still being processed."
        : "Payment received and order recorded. Customer confirmation email could not be checked.";
  } finally {
    if (notificationTimeout) {
      window.clearTimeout(notificationTimeout);
    }
  }

  return notificationMessage;
};

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CheckoutCustomer>(defaultCustomer);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<OrderRecord | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressLookupResult[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressLookupMessage, setAddressLookupMessage] = useState<string | null>(null);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [selectedAddressLabel, setSelectedAddressLabel] = useState<string | null>(null);
  const [paymentStateMessage, setPaymentStateMessage] = useState<string | null>(null);
  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null);
  const [shippingQuoteKey, setShippingQuoteKey] = useState<string | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const { session } = useAuthSession();

  useEffect(() => {
    const storedItems = getCartItems();
    setCartItems(storedItems);

    let isActive = true;
    void mergeLiveShippingMeasurements(storedItems)
      .then((updatedItems) => {
        if (!isActive) {
          return;
        }

        setCartItems(updatedItems);
        saveCartItems(updatedItems);
      })
      .catch(() => {
        // Keep checkout usable if the live catalogue refresh fails.
      });

    const draft = readCheckoutDraft();
    if (draft?.customer) {
      setCustomer((prev) => ({ ...prev, ...draft.customer }));
    }

    return () => {
      isActive = false;
    };
  }, []);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const checkoutState = searchParams.get("checkout");
  const checkoutSessionId = searchParams.get("session_id");

  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      if (item.price === null) {
        return sum;
      }
      return sum + item.price * item.qty;
    }, 0);
  }, [cartItems]);

  const gstAmount = useMemo(() => {
    return Math.round(
      cartItems.reduce((sum, item) => {
        if (item.price === null || !/\bex\s*gst\b/i.test(item.priceText || "")) {
          return sum;
        }
        return sum + item.price * item.qty * 0.1;
      }, 0) * 100,
    ) / 100;
  }, [cartItems]);

  const currentShippingQuoteKey = useMemo(
    () => getShippingQuoteKey(customer.postcode, customer.country, cartItems),
    [cartItems, customer.country, customer.postcode],
  );
  const activeShippingQuote =
    shippingQuoteKey === currentShippingQuoteKey ? shippingQuote : null;
  const hasAustralianPostcode = /^\d{4}$/.test(customer.postcode.trim());
  const requiresShippingQuote =
    cartItems.length > 0 &&
    customer.country.trim().toLowerCase() === "australia";
  const isShippingReady =
    !requiresShippingQuote || (hasAustralianPostcode && Boolean(activeShippingQuote));
  const shippingTotal = activeShippingQuote?.service.price || 0;

  const poaLines = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.price === null ? item.qty : 0), 0);
  }, [cartItems]);

  const hasUnpricedItems = poaLines > 0;
  const unavailableItems = useMemo(
    () => cartItems.filter((item) => typeof item.stockQuantity === "number" && item.stockQuantity <= 0),
    [cartItems],
  );
  const stockLimitedItems = useMemo(
    () =>
      cartItems.filter(
        (item) =>
          typeof item.stockQuantity === "number" &&
          item.stockQuantity > 0 &&
          item.qty > item.stockQuantity,
      ),
    [cartItems],
  );
  const hasStockBlockingItems = unavailableItems.length > 0 || stockLimitedItems.length > 0;

  const orderTotal = useMemo(
    () => subtotal + gstAmount + shippingTotal,
    [gstAmount, shippingTotal, subtotal],
  );

  useEffect(() => {
    const query = customer.address1.trim();

    if (!GEOAPIFY_API_KEY) {
      setAddressSuggestions([]);
      setAddressLoading(false);
      setAddressLookupMessage(null);
      return;
    }

    if (query.length < 5 || query === selectedAddressLabel) {
      setAddressSuggestions([]);
      setAddressLoading(false);
      setAddressLookupMessage(null);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setAddressLoading(true);
      setAddressLookupMessage(null);

      try {
        const params = new URLSearchParams({
          format: "json",
          limit: "7",
          filter: "countrycode:au",
          text: query,
          lang: "en",
          apiKey: GEOAPIFY_API_KEY,
        });

        const response = await fetch(
          `https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
            },
          },
        );

        if (!response.ok) {
          throw new Error("Address lookup is currently unavailable.");
        }

        const payload = (await response.json()) as { results?: AddressLookupResult[] };
        const results = payload.results ?? [];
        setAddressSuggestions(results);
        setShowAddressSuggestions(true);
        setAddressLookupMessage(results.length === 0 ? "No matching addresses found." : null);
      } catch (lookupError) {
        if (lookupError instanceof Error && lookupError.name === "AbortError") {
          return;
        }

        setAddressSuggestions([]);
        setAddressLookupMessage(
          lookupError instanceof Error
            ? lookupError.message
            : "Address lookup is currently unavailable.",
        );
      } finally {
        setAddressLoading(false);
      }
    }, 1100);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [customer.address1, selectedAddressLabel]);

  useEffect(() => {
    const postcode = customer.postcode.trim();
    const isAustralianAddress = customer.country.trim().toLowerCase() === "australia";

    if (!/^\d{4}$/.test(postcode) || !isAustralianAddress || cartItems.length === 0) {
      setShippingQuote(null);
      setShippingQuoteKey(null);
      setShippingError(null);
      setShippingLoading(false);
      return;
    }

    let isActive = true;
    const controller = new AbortController();
    const quoteKey = getShippingQuoteKey(postcode, customer.country, cartItems);

    setShippingQuote(null);
    setShippingQuoteKey(null);
    setShippingError(null);
    setShippingLoading(true);

    const quoteShipping = async () => {
      try {
        const response = await fetch("/api/shipping/quote", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            destinationPostcode: postcode,
            items: cartItems.map((item) => ({
              code: item.code,
              manufacturer: item.manufacturer,
              description: item.description,
              longDescription: item.longDescription,
              qty: item.qty,
              weightKg: item.weightKg,
              heightCm: item.heightCm,
              widthCm: item.widthCm,
              depthCm: item.depthCm,
            })),
          }),
        });

        const payload = (await response.json()) as ShippingQuote & { message?: string };
        if (!response.ok) {
          throw new Error(payload.message || "Unable to calculate shipping.");
        }

        if (isActive) {
          setShippingQuote(payload);
          setShippingQuoteKey(quoteKey);
        }
      } catch (quoteError) {
        if (!isActive || (quoteError instanceof Error && quoteError.name === "AbortError")) {
          return;
        }

        setShippingQuote(null);
        setShippingQuoteKey(null);
        setShippingError(
          quoteError instanceof Error ? quoteError.message : "Unable to calculate shipping.",
        );
      } finally {
        if (isActive) {
          setShippingLoading(false);
        }
      }
    };

    const timeout = window.setTimeout(() => {
      void quoteShipping();
    }, 500);

    return () => {
      isActive = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [cartItems, customer.country, customer.postcode]);

  useEffect(() => {
    if (checkoutState === "cancelled") {
      setPaymentStateMessage("Payment was cancelled. Your checkout details are still here if you want to try again.");
    } else {
      setPaymentStateMessage(null);
    }
  }, [checkoutState]);

  useEffect(() => {
    if (checkoutState !== "success" || !checkoutSessionId || confirmingPayment || placedOrder) {
      return;
    }

    if (getHandledSessions().includes(checkoutSessionId)) {
      setPaymentStateMessage("This payment was already confirmed on this device.");
      navigate("/checkout", { replace: true });
      return;
    }

    const draft = readCheckoutDraft();
    if (!draft) {
      setError("Payment completed, but the local checkout draft is missing. Contact us with your payment receipt.");
      return;
    }

    let isActive = true;

    const finalizePaidCheckout = async () => {
      setConfirmingPayment(true);
      setError(null);
      setPaymentStateMessage("Finalising your paid order...");

      try {
        const confirmResponse = await fetch("/api/checkout/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId: checkoutSessionId }),
        });

        const confirmPayload = (await confirmResponse.json()) as { message?: string };
        if (!confirmResponse.ok) {
          throw new Error(confirmPayload.message || "Unable to verify the Stripe payment.");
        }

        saveCartItems(draft.items);
        setCartItems(draft.items);

        const order = await placeOrder(draft.customer, draft.reseller, draft.shipping);

        if (!isActive) {
          return;
        }

        markSessionHandled(checkoutSessionId);
        clearCheckoutDraft();
        setPlacedOrder(order);
        setCartItems([]);
        trackPurchase({
          transactionId: order.orderNumber,
          value: order.totalKnownValue,
          shipping: order.shippingTotal,
          tax: order.gstAmount,
          items: order.items.map((item) => ({
            item_id: item.code,
            item_name: item.description,
            item_brand: item.manufacturer,
            price: item.price || 0,
            quantity: item.qty,
          })),
        });
        setPaymentStateMessage("Payment received and order recorded. Sending confirmation emails...");
        navigate("/checkout", { replace: true });
        void sendOrderNotification(order).then((notificationMessage) => {
          setPaymentStateMessage(notificationMessage);
        });
      } catch (finalizeError) {
        if (!isActive) {
          return;
        }

        setError(
          finalizeError instanceof Error
            ? finalizeError.message
            : "Payment completed, but we could not record the order.",
        );
        setPaymentStateMessage(null);
      } finally {
        if (isActive) {
          setConfirmingPayment(false);
        }
      }
    };

    void finalizePaidCheckout();

    return () => {
      isActive = false;
    };
  }, [checkoutSessionId, checkoutState, confirmingPayment, navigate, placedOrder]);

  const applyAddressSuggestion = (result: AddressLookupResult) => {
    const address1 = getLineOneFromLookup(result);
    const suburb = getSuburbFromLookup(result);
    const address2 = getAddressLineTwoFromLookup(result, suburb);
    const state = getStateFromLookup(result);
    const postcode = result.address?.postcode?.trim() || "";
    const country = result.address?.country?.trim() || "Australia";

    setCustomer((prev) => ({
      ...prev,
      address1,
      address2: address2 || prev.address2,
      suburb: suburb || prev.suburb,
      state: state || prev.state,
      postcode: postcode || prev.postcode,
      country,
    }));
    setSelectedAddressLabel(address1);
    setShowAddressSuggestions(false);
    setAddressSuggestions([]);
    setAddressLookupMessage(null);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setPaymentStateMessage(null);

    if (cartItems.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (hasUnpricedItems) {
      setError("Online payment is only available for priced items. Remove any POA items before checkout.");
      return;
    }

    if (unavailableItems.length > 0) {
      setError(
        `Remove out-of-stock item(s) before payment: ${unavailableItems
          .map((item) => item.code)
          .join(", ")}.`,
      );
      return;
    }

    if (stockLimitedItems.length > 0) {
      setError(
        `Reduce quantity before payment: ${stockLimitedItems
          .map((item) => `${item.code} has ${item.stockQuantity} available`)
          .join(", ")}.`,
      );
      return;
    }

    if (requiresShippingQuote && !hasAustralianPostcode) {
      setError("Enter a valid 4-digit Australian postcode before payment.");
      return;
    }

    if (requiresShippingQuote && (shippingLoading || !activeShippingQuote)) {
      setError("Wait for the latest shipping total to finish calculating before payment.");
      return;
    }

    setSubmitting(true);
    try {
      const reseller: OrderReseller | undefined = session
        ? {
            userId: session.userId,
            email: session.email,
            role: session.role,
          }
        : undefined;

      saveCheckoutDraft({
        customer,
        reseller,
        items: cartItems,
        shipping:
          activeShippingQuote && activeShippingQuote.service.price > 0
            ? {
                name: activeShippingQuote.service.name,
                price: activeShippingQuote.service.price,
              }
            : undefined,
      });
      const response = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          origin: window.location.origin,
          resellerEmail: reseller?.email,
          customer: {
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            phone: customer.phone,
            company: customer.company,
          },
          items: cartItems.map((item) => ({
            code: item.code,
            description: item.description,
            manufacturer: item.manufacturer,
            qty: item.qty,
            price: item.price,
            priceText: item.priceText,
          })),
          shipping:
            activeShippingQuote && activeShippingQuote.service.price > 0
              ? {
                  name: activeShippingQuote.service.name,
                  price: activeShippingQuote.service.price,
                }
              : undefined,
        }),
      });

      const payload = (await response.json()) as { message?: string; url?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.message || "Unable to start secure payment.");
      }

      window.location.assign(payload.url);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to start secure payment.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <section className="bg-gradient-hero py-14 md:py-20">
        <div className="container-wide">
          <Link
            to="/cart"
            className="inline-flex items-center gap-2 text-sm text-primary-foreground/80 hover:text-primary-foreground mb-5"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Cart
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-3">Checkout</h1>
          <p className="text-primary-foreground/80 max-w-2xl">
            Complete customer details, take secure payment, and then route the paid order into your
            supplier workflow.
          </p>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="mb-8">
            <PortalNav />
          </div>
          {placedOrder ? (
            <div className="max-w-3xl bg-card border border-border/50 rounded-2xl p-8 shadow-card">
              <GoogleCustomerReviewsOptIn order={placedOrder} />
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle2 className="h-6 w-6 text-accent mt-0.5" />
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Order Placed</h2>
                  <p className="text-muted-foreground">
                    Order number: {placedOrder.orderNumber}. A confirmation email is sent to {placedOrder.customer.email}.
                  </p>
                </div>
              </div>

              <div className="mb-6 rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-foreground">
                <p className="font-semibold">What happens next</p>
                <p className="mt-1 text-muted-foreground">
                  Internext has recorded the paid order, confirmed the item and shipping totals, and will progress fulfilment using the delivery details supplied at checkout.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-sm mb-6">
                <div className="bg-secondary rounded-lg p-4">
                  <p className="text-muted-foreground mb-1">Supplier Submission</p>
                  <p className="font-semibold text-foreground">{placedOrder.supplierStatus}</p>
                  <p className="text-xs text-muted-foreground mt-1">{placedOrder.supplierMessage}</p>
                </div>
                <div className="bg-secondary rounded-lg p-4">
                  <p className="text-muted-foreground mb-1">Order Total</p>
                  <p className="font-semibold text-foreground">{formatAud(placedOrder.totalKnownValue)}</p>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <p>Items: {formatAud(placedOrder.itemsSubtotal)}</p>
                    {placedOrder.gstAmount > 0 ? <p>GST: {formatAud(placedOrder.gstAmount)}</p> : null}
                    <p>Shipping: {formatAud(placedOrder.shippingTotal)}</p>
                  </div>
                  {placedOrder.poaLines > 0 ? (
                    <p className="text-xs text-muted-foreground mt-1">{placedOrder.poaLines} POA line(s)</p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link to="/products">Continue Shopping</Link>
                </Button>
                {session?.role === "admin" ? (
                  <Button asChild variant="outline">
                    <Link to="/admin/orders">Open Admin Orders</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
              <form
                onSubmit={onSubmit}
                className="bg-card rounded-2xl p-7 shadow-card border border-border/50 space-y-5"
              >
                <h2 className="text-2xl font-bold text-foreground">Customer Details</h2>

                <div className="grid gap-3 rounded-xl border border-border/60 bg-secondary/25 p-4 text-sm text-muted-foreground md:grid-cols-3">
                  <div className="flex items-start gap-2">
                    <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>Payment is processed securely through Stripe.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Truck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>Freight is calculated from your postcode and cart dimensions.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>Order confirmation is sent to the customer email.</span>
                  </div>
                </div>

                {paymentStateMessage ? (
                  <div className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-foreground">
                    {paymentStateMessage}
                  </div>
                ) : null}

                {!session ? (
                  <div className="rounded-lg border border-border/60 bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Continue as guest</p>
                    <p className="mt-1">
                      You can complete this purchase without an account. Sign in first if you want
                      this order saved to your User Portal.
                    </p>
                  </div>
                ) : null}

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">First Name *</label>
                    <Input
                      required
                      value={customer.firstName}
                      onChange={(event) =>
                        setCustomer((prev) => ({ ...prev, firstName: event.target.value }))
                      }
                      className="bg-secondary border-0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Last Name *</label>
                    <Input
                      required
                      value={customer.lastName}
                      onChange={(event) =>
                        setCustomer((prev) => ({ ...prev, lastName: event.target.value }))
                      }
                      className="bg-secondary border-0"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Company</label>
                    <Input
                      value={customer.company}
                      onChange={(event) =>
                        setCustomer((prev) => ({ ...prev, company: event.target.value }))
                      }
                      className="bg-secondary border-0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <Input
                      type="email"
                      required
                      value={customer.email}
                      onChange={(event) =>
                        setCustomer((prev) => ({ ...prev, email: event.target.value }))
                      }
                      className="bg-secondary border-0"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone *</label>
                    <Input
                      required
                      value={customer.phone}
                      onChange={(event) =>
                        setCustomer((prev) => ({ ...prev, phone: event.target.value }))
                      }
                      className="bg-secondary border-0"
                      autoComplete="tel"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Country *</label>
                    <Input
                      required
                      value={customer.country}
                      onChange={(event) =>
                        setCustomer((prev) => ({ ...prev, country: event.target.value }))
                      }
                      className="bg-secondary border-0"
                      autoComplete="country-name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Address Line 1 *</label>
                  <div className="relative">
                    <Input
                      required
                      value={customer.address1}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setSelectedAddressLabel(null);
                        setCustomer((prev) => ({ ...prev, address1: nextValue }));
                        setShowAddressSuggestions(true);
                      }}
                      onFocus={() => {
                        if (addressSuggestions.length > 0 || addressLookupMessage) {
                          setShowAddressSuggestions(true);
                        }
                      }}
                      className="bg-secondary border-0"
                      autoComplete="address-line1"
                    />

                    {showAddressSuggestions &&
                    (customer.address1.trim().length >= 5 || addressLoading) ? (
                      <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-20 overflow-hidden rounded-xl border border-border/60 bg-card shadow-elevated">
                        {addressLoading ? (
                          <div className="px-4 py-3 text-sm text-muted-foreground">
                            Looking up addresses...
                          </div>
                        ) : null}

                        {!addressLoading && addressSuggestions.length > 0 ? (
                          <div className="max-h-72 overflow-auto py-2">
                            {addressSuggestions.map((result) => (
                              <button
                                key={result.place_id}
                                type="button"
                                onClick={() => applyAddressSuggestion(result)}
                                className="block w-full px-4 py-3 text-left transition hover:bg-secondary/55"
                              >
                                <p className="text-sm font-medium text-foreground">
                                  {getLineOneFromLookup(result)}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                  {result.formatted}
                                </p>
                              </button>
                            ))}
                          </div>
                        ) : null}

                        {!addressLoading && addressLookupMessage ? (
                          <div className="border-t border-border/60 px-4 py-3 text-sm text-muted-foreground">
                            {addressLookupMessage}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Address Line 2</label>
                  <Input
                    value={customer.address2}
                    onChange={(event) =>
                      setCustomer((prev) => ({ ...prev, address2: event.target.value }))
                    }
                    className="bg-secondary border-0"
                    autoComplete="address-line2"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Suburb *</label>
                    <Input
                      required
                      value={customer.suburb}
                      onChange={(event) =>
                        setCustomer((prev) => ({ ...prev, suburb: event.target.value }))
                      }
                      className="bg-secondary border-0"
                      autoComplete="address-level2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">State *</label>
                    <Input
                      required
                      value={customer.state}
                      onChange={(event) =>
                        setCustomer((prev) => ({ ...prev, state: event.target.value }))
                      }
                      className="bg-secondary border-0"
                      autoComplete="address-level1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Postcode *</label>
                    <Input
                      required
                      value={customer.postcode}
                      onChange={(event) =>
                        setCustomer((prev) => ({ ...prev, postcode: event.target.value }))
                      }
                      className="bg-secondary border-0"
                      autoComplete="postal-code"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Delivery Notes</label>
                  <Textarea
                    value={customer.notes}
                    onChange={(event) =>
                      setCustomer((prev) => ({ ...prev, notes: event.target.value }))
                    }
                    className="bg-secondary border-0"
                    rows={4}
                  />
                </div>

                {error ? (
                  <div className="rounded-lg bg-destructive/10 text-destructive text-sm p-3">
                    {error}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  className="w-full md:w-auto"
                  disabled={
                    submitting ||
                    confirmingPayment ||
                    shippingLoading ||
                    !isShippingReady ||
                    cartItems.length === 0 ||
                    hasStockBlockingItems
                  }
                >
                  {confirmingPayment
                    ? "Finalising Payment..."
                    : submitting
                      ? "Redirecting to Payment..."
                      : shippingLoading
                        ? "Calculating Shipping..."
                        : "Pay Securely"}
                </Button>
              </form>

              <aside className="bg-card rounded-2xl p-6 shadow-card border border-border/50 h-fit xl:sticky xl:top-24">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Order Summary</h3>
                  <Link to="/cart" className="text-xs text-accent hover:underline">
                    Edit cart
                  </Link>
                </div>

                {cartItems.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-start gap-2 mb-4">
                      <AlertTriangle className="h-4 w-4 mt-0.5" />
                      <p>Your cart is empty.</p>
                    </div>
                    <Link to="/cart" className="text-accent hover:underline">
                      Return to cart
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 max-h-[460px] overflow-auto pr-1">
                      {cartItems.map((item) => {
                        const productImage = getOptionalProductImage(item);
                        const isUnavailable = typeof item.stockQuantity === "number" && item.stockQuantity <= 0;
                        const exceedsAvailable =
                          typeof item.stockQuantity === "number" &&
                          item.stockQuantity > 0 &&
                          item.qty > item.stockQuantity;

                        return (
                        <div
                          key={item.code}
                          className={`border rounded-lg p-3 ${
                            isUnavailable || exceedsAvailable
                              ? "border-destructive/40 bg-destructive/5"
                              : "border-border/60"
                          }`}
                        >
                          <div className="flex gap-3">
                            {productImage ? (
                              <img
                                src={productImage}
                                alt={item.description}
                                onError={handleProductImageError}
                                className="h-16 w-16 rounded-md border border-border/50 bg-white object-contain"
                              />
                            ) : null}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground break-words">{item.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.code} · Qty {item.qty}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatStoredPrice(item.price, item.priceText) ?? "POA"}
                              </p>
                              {typeof item.stockQuantity === "number" ? (
                                <p
                                  className={`mt-1 text-xs ${
                                    isUnavailable || exceedsAvailable
                                      ? "text-destructive"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {isUnavailable
                                    ? getOutOfStockEtaMessage(item)
                                    : exceedsAvailable
                                      ? `Only ${item.stockQuantity.toLocaleString("en-AU")} available`
                                      : `${item.stockQuantity.toLocaleString("en-AU")} available`}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>

                    <div className="border-t border-border mt-4 pt-4 text-sm">
                      <p className="flex items-center justify-between mb-2">
                        <span className="text-muted-foreground">Items subtotal</span>
                        <span className="font-semibold text-foreground">{formatStoredTotal(subtotal, cartItems)}</span>
                      </p>
                      {gstAmount > 0 ? (
                        <p className="flex items-center justify-between mb-2">
                          <span className="text-muted-foreground">GST</span>
                          <span className="font-semibold text-foreground">{formatAud(gstAmount)}</span>
                        </p>
                      ) : null}
                      <p className="flex items-center justify-between mb-2">
                        <span className="text-muted-foreground">Shipping</span>
                        <span className="font-semibold text-foreground">
                          {shippingLoading
                            ? "Calculating..."
                            : activeShippingQuote
                              ? activeShippingQuote.service.priceText
                              : "Enter postcode"}
                        </span>
                      </p>
                      {shippingError ? (
                        <p className="mb-2 text-xs text-destructive">{shippingError}</p>
                      ) : null}
                      <p className="flex items-center justify-between border-t border-border pt-3 font-semibold">
                        <span className="text-foreground">Estimated total</span>
                        <span className="text-foreground">{formatAud(orderTotal)}</span>
                      </p>
                      {poaLines > 0 ? (
                        <p className="text-xs text-muted-foreground">{poaLines} POA line(s) excluded from subtotal.</p>
                      ) : null}
                      {hasUnpricedItems ? (
                        <p className="mt-2 text-xs text-destructive">
                          Remove POA items before online payment. They cannot be charged through card checkout.
                        </p>
                      ) : null}
                      {unavailableItems.length > 0 ? (
                        <p className="mt-2 text-xs text-destructive">
                          Remove out-of-stock item(s) before payment.
                        </p>
                      ) : null}
                      {stockLimitedItems.length > 0 ? (
                        <p className="mt-2 text-xs text-destructive">
                          Reduce item quantities to match available stock before payment.
                        </p>
                      ) : null}
                      <div className="mt-4 space-y-2 rounded-xl border border-border/60 bg-secondary/25 p-3 text-xs text-muted-foreground">
                        <div className="flex items-start gap-2">
                          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                          <span>GST, item totals, and shipping are recorded separately in the order.</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                          <span>Card details are entered on Stripe, not stored by Internext.</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </aside>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Checkout;
