export const SITE_URL = "https://www.internext.com.au";

export const INDEXABLE_ROUTES = [
  {
    path: "/",
    title: "Internext | Australian Technology Products and Distribution",
    description:
      "Shop business technology, communications, security, printing and audiovisual products from Internext Australia.",
  },
  {
    path: "/products",
    title: "Technology Products | Internext Australia",
    description:
      "Browse Internext's Australian catalogue of business technology, communications, security, print and audiovisual products.",
  },
  {
    path: "/about",
    title: "About Internext | Australian Technology Distribution",
    description:
      "Learn about Internext and our approach to supplying technology products to Australian businesses and resellers.",
  },
  {
    path: "/about/why-partner",
    title: "Why Work With Internext | Technology Distribution Australia",
    description:
      "See how Internext supports Australian resellers with technology sourcing, ordering and fulfilment.",
  },
  {
    path: "/about/customers",
    title: "Who Internext Supports | Australian Technology Customers",
    description:
      "Explore the industries and customer segments Internext supports with technology products and distribution services.",
  },
  {
    path: "/services",
    title: "Technical Services | Internext Australia",
    description:
      "Explore Internext technical services for audiovisual, security, networking and communications deployments.",
  },
  {
    path: "/services/installation",
    title: "Technology Installation Services | Internext Australia",
    description:
      "Request professional installation for audiovisual, security, networking and communications technology.",
  },
  {
    path: "/support/faq",
    title: "Frequently Asked Questions | Internext Support",
    description:
      "Find answers about ordering, accounts, payments, products, delivery and support from Internext Australia.",
  },
  {
    path: "/support/shipping",
    title: "Shipping and Delivery | Internext Australia",
    description:
      "Read Internext shipping information for Australian technology product orders, including bulky freight enquiries.",
  },
  {
    path: "/support/warranty",
    title: "Product Warranty Information | Internext Australia",
    description:
      "Read warranty information for technology products purchased through Internext Australia.",
  },
  {
    path: "/support/returns",
    title: "Returns and Refunds Policy | Internext Australia",
    description:
      "Read the Internext returns and refunds policy for technology products purchased in Australia.",
  },
  {
    path: "/support/payment-security",
    title: "Payment Security | Internext Australia",
    description:
      "Learn how Internext protects payment information and processes secure online technology orders.",
  },
  {
    path: "/support/consumer-guarantees",
    title: "Consumer Guarantees | Internext Australia",
    description:
      "Read how Australian Consumer Law guarantees apply to eligible purchases from Internext.",
  },
  {
    path: "/privacy",
    title: "Privacy Policy | Internext Australia",
    description:
      "Read how Internext collects, uses, stores and protects personal information.",
  },
  {
    path: "/terms",
    title: "Terms and Conditions | Internext Australia",
    description:
      "Read the terms and conditions that apply when using Internext and purchasing technology products.",
  },
  {
    path: "/contact",
    title: "Contact Internext | Technology Products Australia",
    description:
      "Contact Internext about product sourcing, orders, reseller enquiries and technology requirements.",
  },
];

export const NOINDEX_ROUTES = [
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
];

export const CATEGORY_PATHS = [
  "3d-filament",
  "3d-printers",
  "a3-printers",
  "a3-scanners",
  "a4-printers",
  "a4-scanners",
  "access-control",
  "access-points",
  "audio-visual",
  "automation-lighting",
  "cameras",
  "conference",
  "consumer-cameras",
  "digital-signage",
  "energy-management",
  "headsets",
  "imaging-accessories",
  "inkjet",
  "inkjet-consumables",
  "interactive-panels",
  "intercom-systems",
  "ip-cameras",
  "ip-communications",
  "ip-surveillance",
  "large-format",
  "large-format-consumables",
  "laser",
  "laser-consumables",
  "mounts-brackets",
  "multifunction",
  "networking-accessories",
  "nvrs-recorders",
  "office-products",
  "office-technology",
  "other-consumables",
  "portable-scanners",
  "print-consumables",
  "printers",
  "projectors",
  "ribbon-tape",
  "routers",
  "scanners",
  "security-automation",
  "storage",
  "storage-networking",
  "surveillance-accessories",
  "switches",
  "tvs-panels",
  "uc-accessories",
  "unified-communications",
  "ups-power",
  "video-collab",
  "voip",
];

const CATEGORY_TITLE_OVERRIDES = {
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

export const getCategoryTitle = (slug) =>
  CATEGORY_TITLE_OVERRIDES[slug] ||
  slug
    .split("-")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");

export const getCategorySeo = (slug) => {
  const title = getCategoryTitle(slug);
  return {
    path: `/products/${slug}`,
    title: `${title} | Internext Australia`,
    description: `Browse ${title} available from Internext Australia with verified supplier pricing and availability.`,
  };
};

export const getIndexableRoutes = () => [
  ...INDEXABLE_ROUTES,
  ...CATEGORY_PATHS.map(getCategorySeo),
];
