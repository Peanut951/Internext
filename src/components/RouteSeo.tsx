import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getRouteSeo, SITE_URL } from "@/lib/routeSeo";

const setMeta = (selector: string, attribute: "name" | "property", key: string, value: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", value);
};

const setCanonical = (href: string | null) => {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!href) {
    existing?.remove();
    return;
  }

  const element = existing || document.createElement("link");
  element.setAttribute("rel", "canonical");
  element.setAttribute("href", href);
  if (!existing) {
    document.head.appendChild(element);
  }
};

const RouteSeo = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (/^\/products\/item\/[^/]+$/.test(pathname)) {
      return;
    }

    document.getElementById("internext-product-json-ld")?.remove();
    const seo = getRouteSeo(pathname);
    const canonical = seo.index ? `${SITE_URL}${pathname === "/" ? "/" : pathname}` : null;

    document.title = seo.title;
    setMeta('meta[name="description"]', "name", "description", seo.description);
    setMeta(
      'meta[name="robots"]',
      "name",
      "robots",
      seo.index ? "index, follow" : "noindex, nofollow",
    );
    setMeta('meta[property="og:title"]', "property", "og:title", seo.title);
    setMeta('meta[property="og:description"]', "property", "og:description", seo.description);
    setMeta('meta[property="og:type"]', "property", "og:type", "website");
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", seo.title);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", seo.description);
    setCanonical(canonical);

    const ogUrl = document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (canonical) {
      setMeta('meta[property="og:url"]', "property", "og:url", canonical);
    } else {
      ogUrl?.remove();
    }
  }, [pathname]);

  return null;
};

export default RouteSeo;
