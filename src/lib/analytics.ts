const GOOGLE_ANALYTICS_ID = (import.meta.env.VITE_GOOGLE_ANALYTICS_ID as string | undefined)?.trim() || "";
const MICROSOFT_CLARITY_ID = (import.meta.env.VITE_MICROSOFT_CLARITY_ID as string | undefined)?.trim() || "";

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

export const initAnalytics = () => {
  if (typeof window === "undefined") {
    return;
  }

  if (GOOGLE_ANALYTICS_ID) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = (...args: unknown[]) => window.dataLayer?.push(args);
    window.gtag("js", new Date());
    window.gtag("config", GOOGLE_ANALYTICS_ID, {
      send_page_view: false,
    });
    appendScript(
      "internext-google-analytics",
      `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GOOGLE_ANALYTICS_ID)}`,
    );
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

  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
};
