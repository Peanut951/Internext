export const SITE_URL = "https://www.internext.com.au";

export type RouteSeoDefinition = {
  title: string;
  description: string;
  index: boolean;
};

export const STATIC_ROUTE_SEO: Record<string, RouteSeoDefinition> = {
  "/": {
    title: "Internext | Australian Technology Products and Distribution",
    description:
      "Shop business technology, communications, security, printing and audiovisual products from Internext Australia.",
    index: true,
  },
  "/products": {
    title: "Technology Products | Internext Australia",
    description:
      "Browse Internext's Australian catalogue of business technology, communications, security, print and audiovisual products.",
    index: true,
  },
  "/about": {
    title: "About Internext | Australian Technology Distribution",
    description:
      "Learn about Internext and our approach to supplying technology products to Australian businesses and resellers.",
    index: true,
  },
  "/about/why-partner": {
    title: "Why Work With Internext | Technology Distribution Australia",
    description:
      "See how Internext supports Australian resellers with technology sourcing, ordering and fulfilment.",
    index: true,
  },
  "/about/customers": {
    title: "Who Internext Supports | Australian Technology Customers",
    description:
      "Explore the industries and customer segments Internext supports with technology products and distribution services.",
    index: true,
  },
  "/services": {
    title: "Technical Services | Internext Australia",
    description:
      "Explore Internext technical services for audiovisual, security, networking and communications deployments.",
    index: true,
  },
  "/services/installation": {
    title: "Technology Installation Services | Internext Australia",
    description:
      "Request professional installation for audiovisual, security, networking and communications technology.",
    index: true,
  },
  "/support/faq": {
    title: "Frequently Asked Questions | Internext Support",
    description:
      "Find answers about ordering, accounts, payments, products, delivery and support from Internext Australia.",
    index: true,
  },
  "/support/shipping": {
    title: "Shipping and Delivery | Internext Australia",
    description:
      "Read Internext shipping information for Australian technology product orders, including bulky freight enquiries.",
    index: true,
  },
  "/support/warranty": {
    title: "Product Warranty Information | Internext Australia",
    description:
      "Read warranty information for technology products purchased through Internext Australia.",
    index: true,
  },
  "/support/returns": {
    title: "Returns and Refunds Policy | Internext Australia",
    description:
      "Read the Internext returns and refunds policy for technology products purchased in Australia.",
    index: true,
  },
  "/support/payment-security": {
    title: "Payment Security | Internext Australia",
    description:
      "Learn how Internext protects payment information and processes secure online technology orders.",
    index: true,
  },
  "/support/consumer-guarantees": {
    title: "Consumer Guarantees | Internext Australia",
    description:
      "Read how Australian Consumer Law guarantees apply to eligible purchases from Internext.",
    index: true,
  },
  "/privacy": {
    title: "Privacy Policy | Internext Australia",
    description: "Read how Internext collects, uses, stores and protects personal information.",
    index: true,
  },
  "/terms": {
    title: "Terms and Conditions | Internext Australia",
    description:
      "Read the terms and conditions that apply when using Internext and purchasing technology products.",
    index: true,
  },
  "/contact": {
    title: "Contact Internext | Technology Products Australia",
    description:
      "Contact Internext about product sourcing, orders, reseller enquiries and technology requirements.",
    index: true,
  },
};

export const NOINDEX_PATHS = new Set([
  "/products/search",
  "/cart",
  "/checkout",
  "/portal",
  "/portal/orders",
  "/admin/orders",
  "/services/request",
  "/login",
  "/signup",
  "/login/register",
  "/about/team",
]);

const CATEGORY_TITLE_OVERRIDES: Record<string, string> = {
  "3d-filament": "3D Filament",
  "3d-printers": "3D Printers",
  "a3-printers": "A3 Printers",
  "a3-scanners": "A3 Scanners",
  "a4-printers": "A4 Printers",
  "a4-scanners": "A4 Scanners",
  "ip-cameras": "IP Cameras",
  "ip-communications": "IP Communications",
  "ip-surveillance": "IP Surveillance",
  "nvrs-recorders": "NVRs and Recorders",
  "tvs-panels": "TVs and Commercial Panels",
  "uc-accessories": "UC Accessories",
  "ups-power": "UPS and Power",
  voip: "VoIP Phones",
};

const getCategoryTitle = (slug: string) =>
  CATEGORY_TITLE_OVERRIDES[slug] ||
  slug
    .split("-")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");

export const getRouteSeo = (pathname: string): RouteSeoDefinition => {
  const staticRoute = STATIC_ROUTE_SEO[pathname];
  if (staticRoute) {
    return staticRoute;
  }

  if (NOINDEX_PATHS.has(pathname)) {
    return {
      title: "Internext",
      description: "Internext account and ordering page.",
      index: false,
    };
  }

  const categoryMatch = pathname.match(/^\/products\/([^/]+)$/);
  if (categoryMatch) {
    const categoryTitle = getCategoryTitle(categoryMatch[1]);
    return {
      title: `${categoryTitle} | Internext Australia`,
      description: `Browse ${categoryTitle} available from Internext Australia with verified supplier pricing and availability.`,
      index: true,
    };
  }

  return {
    title: "Page Not Found | Internext",
    description: "The requested Internext page could not be found.",
    index: false,
  };
};
