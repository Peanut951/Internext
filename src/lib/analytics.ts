const DEFAULT_GOOGLE_ANALYTICS_ID = "G-45E9SWHH1N";
const GOOGLE_ANALYTICS_ID =
  (import.meta.env.VITE_GOOGLE_ANALYTICS_ID as string | undefined)?.trim() || DEFAULT_GOOGLE_ANALYTICS_ID;
const MICROSOFT_CLARITY_ID = (import.meta.env.VITE_MICROSOFT_CLARITY_ID as string | undefined)?.trim() || "";
let initialStaticPageViewSkipped = false;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    clarity?: ((...args: unknown[]) => void) & { q?: unknown[] };
  }
}

const appendScript = (id: string, src: string, async = true) => {
  if (typeof document === "undefined" || document.getElementById(id)) {
    return;
  }

  const script = document.createElement("script");
  script.id = id;
  script.src = src;
  script.async = async;
  document.head.appendChild(script);
};

const hasStaticGoogleTag = () =>
  typeof document !== "undefined" &&
  Boolean(document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}"]`));

export const initAnalytics = () => {
  if (typeof window === "undefined") {
    return;
  }

  if (GOOGLE_ANALYTICS_ID) {
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
      window.gtag = (...args: unknown[]) => window.dataLayer?.push(args);
      window.gtag("js", new Date());
      window.gtag("config", GOOGLE_ANALYTICS_ID, {
        send_page_view: false,
      });
    }

    if (!hasStaticGoogleTag()) {
      appendScript(
        "internext-google-analytics",
        `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GOOGLE_ANALYTICS_ID)}`,
      );
    }
  }

  if (MICROSOFT_CLARITY_ID) {
    const clarity = ((...args: unknown[]) => {
      clarity.q = clarity.q || [];
      clarity.q.push(args);
    }) as ((...args: unknown[]) => void) & { q?: unknown[] };

    window.clarity = clarity;
    appendScript(
      "internext-microsoft-clarity",
      `https://www.clarity.ms/tag/${encodeURIComponent(MICROSOFT_CLARITY_ID)}`,
    );
  }
};

export const trackPageView = (path: string) => {
  if (typeof window === "undefined" || !GOOGLE_ANALYTICS_ID || !window.gtag) {
    return;
  }

  if (!initialStaticPageViewSkipped && hasStaticGoogleTag()) {
    initialStaticPageViewSkipped = true;
    return;
  }

  try {
    window.gtag("event", "page_view", {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
    });
  } catch {
    // Analytics should never interrupt browsing.
  }
};

const trackEvent = (eventName: string, params: Record<string, unknown> = {}) => {
  if (typeof window === "undefined" || !GOOGLE_ANALYTICS_ID || !window.gtag) {
    return;
  }

  try {
    window.gtag("event", eventName, {
      currency: "AUD",
      ...params,
    });
  } catch {
    // Analytics should never interrupt shopping actions.
  }
};

type AnalyticsItem = {
  item_id: string;
  item_name: string;
  item_brand?: string;
  price?: number;
  quantity?: number;
};

export const trackAddToCart = (item: AnalyticsItem & { value?: number }) => {
  trackEvent("add_to_cart", {
    value: item.value ?? (item.price || 0) * (item.quantity || 1),
    items: [item],
  });
};

export const trackCheckoutStarted = (params: { value: number; items: AnalyticsItem[] }) => {
  trackEvent("begin_checkout", params);
};

export const trackPurchase = (params: {
  transactionId: string;
  value: number;
  shipping: number;
  tax: number;
  items: AnalyticsItem[];
}) => {
  trackEvent("purchase", {
    transaction_id: params.transactionId,
    value: params.value,
    shipping: params.shipping,
    tax: params.tax,
    items: params.items,
  });
};

export const trackContactFormSubmitted = (enquiryType: string) => {
  trackEvent("generate_lead", {
    form_name: "contact",
    enquiry_type: enquiryType || "unspecified",
  });
};
