import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/layout/Layout";
import { Link, useParams } from "react-router-dom";
import { Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPrimaryProductImage, handleProductImageError } from "@/lib/productImages";
import { normalizeCatalogProducts } from "@/lib/catalogQuality";

const ITEMS_PER_PAGE = 24;

type CatalogProduct = {
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

type CartItem = CatalogProduct & { qty: number };

type CategoryInfo = {
  title: string;
  description: string;
  brands: string[];
};

type FeaturedRankingsResponse = {
  rankings?: Record<string, Record<string, number>>;
};

type Rule = {
  keywords: string[];
  manufacturers: string[];
};

type FilterChip = {
  key: string;
  label: string;
  onRemove: () => void;
};

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const makeRule = (keywords: string[], manufacturers: string[] = []): Rule => ({
  keywords: keywords.map(normalizeKey),
  manufacturers: manufacturers.map(normalizeKey),
});

const TITLE_OVERRIDES: Record<string, string> = {
  "ip-surveillance": "IP Surveillance",
  "ip-cameras": "IP Cameras",
  "nvrs-recorders": "NVRs and Recorders",
  "tvs-panels": "TVs and Commercial Panels",
  "a4-printers": "A4 Printers",
  "a3-printers": "A3 Printers",
  "3d-printers": "3D Printers",
  "3d-filament": "3D Filament",
  "print-consumables": "Print Consumables",
  "ip-communications": "IP Communications",
  "ups-power": "UPS and Power",
  voip: "VOIP Phones",
  "uc-accessories": "UC Accessories",
  "storage-networking": "Storage and Networking",
  "security-automation": "Security and Automation",
  "unified-communications": "Unified Communications",
};

const topLevelCategories: Record<string, CategoryInfo> = {
  "audio-visual": {
    title: "Audio Visual",
    description:
      "Professional displays, projectors, digital signage, interactive panels and collaboration solutions.",
    brands: ["Samsung", "LG", "NEC", "BenQ"],
  },
  cameras: {
    title: "Cameras",
    description:
      "Consumer and professional imaging solutions including still and video cameras and accessories.",
    brands: ["Canon", "Sony", "Nikon", "Fujifilm"],
  },
  "ip-surveillance": {
    title: "IP Surveillance",
    description:
      "End-to-end IP video solutions including cameras, recorders, kits and accessories.",
    brands: ["Hikvision", "Dahua", "Axis", "Hanwha"],
  },
  "office-products": {
    title: "Office Products",
    description: "Essential office equipment and supplies for productive workplaces.",
    brands: ["Fellowes", "Rexel", "Canon", "3M"],
  },
  printers: {
    title: "Printers",
    description:
      "Desktop to production printers including laser, inkjet, large format and specialty machines.",
    brands: ["HP", "Canon", "Epson", "Brother"],
  },
  "print-consumables": {
    title: "Print Consumables",
    description: "Ink, toner, large format supplies, tape, filament and other consumables.",
    brands: ["HP", "Canon", "Epson", "Brother"],
  },
  scanners: {
    title: "Scanners",
    description:
      "From portable scanners to high-speed production units plus imaging accessories.",
    brands: ["Fujitsu", "Canon", "Epson", "Brother"],
  },
  "security-automation": {
    title: "Security and Automation",
    description:
      "Access control, intercoms, IP communications, UPS, automation, lighting and energy management.",
    brands: ["Hikvision", "Dahua", "ZKTeco", "Aiphone"],
  },
  "storage-networking": {
    title: "Storage and Networking",
    description:
      "Network recorders, storage devices, switches, routers, access points and cabling.",
    brands: ["Cisco", "Ubiquiti", "HP Aruba", "Netgear"],
  },
  "unified-communications": {
    title: "Unified Communications",
    description:
      "Headsets, conferencing hardware, VOIP, video collaboration and UC accessories.",
    brands: ["Jabra", "Poly", "Logitech", "Yealink"],
  },
};

const CATEGORY_GROUPS: Record<string, string[]> = {
  "audio-visual": [
    "projectors",
    "digital-signage",
    "tvs-panels",
    "interactive-panels",
    "mounts-brackets",
    "collaboration",
  ],
  cameras: ["consumer-cameras", "professional-cameras", "imaging-accessories"],
  "ip-surveillance": [
    "ip-cameras",
    "nvrs-recorders",
    "surveillance-kits",
    "surveillance-accessories",
  ],
  "office-products": ["printers", "multifunction", "scanners", "shredders", "office-technology"],
  printers: [
    "a4-printers",
    "a3-printers",
    "inkjet",
    "laser",
    "large-format",
    "3d-printers",
    "dot-matrix",
    "printer-warranties",
    "printer-accessories",
  ],
  "print-consumables": [
    "inkjet-consumables",
    "laser-consumables",
    "large-format-consumables",
    "ribbon-tape",
    "3d-filament",
    "other-consumables",
  ],
  scanners: [
    "a4-scanners",
    "a3-scanners",
    "portable-scanners",
    "imaging",
    "scanner-accessories",
    "scanner-warranties",
  ],
  "security-automation": [
    "access-control",
    "intercom-systems",
    "ip-communications",
    "ups-power",
    "automation-lighting",
    "energy-management",
  ],
  "storage-networking": [
    "nvrs",
    "storage",
    "switches",
    "routers",
    "access-points",
    "networking-accessories",
  ],
  "unified-communications": ["headsets", "conference", "voip", "video-collab", "uc-accessories"],
};
const CATEGORY_RULES: Record<string, Rule> = {
  "printer-warranties": makeRule(
    ["printer warranty", "printer support", "printer service", "onsite", "on site", "advance exchange"],
    [],
  ),
  "scanner-warranties": makeRule(
    ["scanner warranty", "scanner support", "scanner service", "scanner maintenance"],
    [],
  ),
  "inkjet-consumables": makeRule(
    ["ink", "inkjet", "printhead", "ink tank", "maintenance box"],
    ["hp", "canon", "epson", "brother", "fujifilm"],
  ),
  "laser-consumables": makeRule(
    ["toner", "drum", "fuser", "developer", "imaging unit", "transfer belt", "waste toner"],
    ["lexmark", "hp", "canon", "brother", "kyocera", "ricoh", "xerox", "konica minolta"],
  ),
  "large-format-consumables": makeRule(
    ["large format", "latex", "designjet", "imageprograf", "surecolor", "ink tank"],
    ["hp", "canon", "epson"],
  ),
  "ribbon-tape": makeRule(
    ["ribbon", "label tape", "thermal transfer", "tape"],
    ["brother", "dymo", "epson", "zebra"],
  ),
  "3d-filament": makeRule(
    ["filament", "pla", "abs", "petg", "resin"],
    ["makerbot", "ultimaker", "formlabs", "raise3d"],
  ),
  "other-consumables": makeRule(["paper", "media", "cleaning kit", "maintenance kit", "staple"], []),
  "a4-scanners": makeRule(
    ["a4 scanner", "document scanner", "desktop scanner"],
    ["fujitsu", "canon", "epson", "brother", "kodak", "panasonic"],
  ),
  "a3-scanners": makeRule(
    ["a3 scanner", "large format scanner"],
    ["fujitsu", "canon", "epson", "panasonic"],
  ),
  "portable-scanners": makeRule(
    ["portable scanner", "mobile scanner", "handheld scanner"],
    ["brother", "epson", "fujitsu", "canon"],
  ),
  imaging: makeRule(["imaging", "archiving", "microfilm"], []),
  "scanner-accessories": makeRule(["scanner roller", "scanner pad", "scanner kit", "scanner accessory"], []),
  "a4-printers": makeRule(
    ["a4 printer", "a4 mono", "a4 colour"],
    ["lexmark", "hp", "canon", "brother", "kyocera"],
  ),
  "a3-printers": makeRule(
    ["a3 printer", "a3 colour", "a3 mono", "tabloid"],
    ["ricoh", "xerox", "konica minolta", "kyocera"],
  ),
  inkjet: makeRule(
    ["inkjet printer", "ink tank printer", "inkjet mfp"],
    ["epson", "canon", "hp", "brother"],
  ),
  laser: makeRule(
    ["laser printer", "laser mfp", "mono laser", "color laser"],
    ["hp", "lexmark", "brother", "kyocera", "ricoh", "xerox"],
  ),
  "large-format": makeRule(
    ["large format printer", "designjet", "imageprograf", "surecolor", "latex printer"],
    ["hp", "canon", "epson"],
  ),
  "dot-matrix": makeRule(["dot matrix", "impact printer"], ["epson", "oki", "printronix"]),
  "3d-printers": makeRule(
    ["3d printer", "additive", "fused deposition", "sls"],
    ["makerbot", "ultimaker", "formlabs", "raise3d"],
  ),
  "printer-accessories": makeRule(
    ["printer tray", "printer stand", "feeder", "duplexer", "fuser kit", "maintenance kit"],
    [],
  ),
  multifunction: makeRule(
    ["mfp", "multifunction", "all in one", "copy scan"],
    ["ricoh", "xerox", "canon", "konica minolta", "kyocera", "hp"],
  ),
  projectors: makeRule(
    ["projector", "short throw", "ultra short throw", "laser projector"],
    ["epson", "benq", "optoma", "sony", "panasonic", "nec", "viewsonic"],
  ),
  "digital-signage": makeRule(
    ["digital signage", "signage", "media player", "menu board"],
    ["samsung", "lg", "nec", "philips"],
  ),
  "tvs-panels": makeRule(
    ["tv", "panel", "commercial display", "monitor"],
    ["samsung", "lg", "nec", "sony", "panasonic"],
  ),
  "interactive-panels": makeRule(
    ["interactive", "touch display", "touchscreen", "smart board"],
    ["smart", "promethean", "benq", "samsung"],
  ),
  "mounts-brackets": makeRule(
    ["mount", "bracket", "wall mount", "ceiling mount"],
    ["vogels mounts", "vogel s mounts", "atdec", "chief", "b tech", "ergotron", "peerless"],
  ),
  collaboration: makeRule(
    ["collaboration", "conference camera", "wireless presentation", "room kit", "meeting"],
    ["logitech", "poly", "barco", "mersive", "kramer", "crestron"],
  ),
  "consumer-cameras": makeRule(
    ["camera", "dslr", "mirrorless", "compact camera"],
    ["canon", "nikon", "sony", "fujifilm", "panasonic"],
  ),
  "professional-cameras": makeRule(
    ["broadcast", "cinema camera", "camcorder", "ptz"],
    ["sony", "panasonic", "canon", "blackmagic", "jvc"],
  ),
  "imaging-accessories": makeRule(
    ["lens", "battery", "memory card", "charger", "tripod", "flash", "gimbal"],
    ["canon", "nikon", "sony", "fujifilm", "manfrotto"],
  ),
  "ip-cameras": makeRule(
    ["ip camera", "network camera", "cctv", "dome camera", "bullet camera", "thermal camera"],
    ["axis", "hikvision", "dahua", "hanwha", "uniview", "tiandy"],
  ),
  "nvrs-recorders": makeRule(
    ["nvr", "dvr", "video recorder", "recorder"],
    ["hikvision", "dahua", "milestone", "synology", "uniview"],
  ),
  "surveillance-kits": makeRule(
    ["surveillance kit", "cctv kit", "security kit"],
    ["hikvision", "dahua", "swann"],
  ),
  "surveillance-accessories": makeRule(
    ["camera mount", "housing", "camera accessory", "surveillance accessory"],
    [],
  ),
  "access-control": makeRule(
    ["access control", "card reader", "biometric", "door controller", "keypad"],
    ["zkteco", "gallagher", "suprema", "hid"],
  ),
  "intercom-systems": makeRule(
    ["intercom", "door station", "video intercom", "sip intercom"],
    ["akuvox", "aiphone", "2n", "grandstream"],
  ),
  "ip-communications": makeRule(
    ["sip", "ip communicator", "paging"],
    ["grandstream", "algo", "fanvil", "yealink"],
  ),
  "ups-power": makeRule(
    ["ups", "uninterruptible", "battery backup", "pdu", "power supply"],
    ["apc", "eaton", "cyberpower", "vertiv"],
  ),
  "automation-lighting": makeRule(
    ["automation", "smart relay", "dimmer", "lighting", "iot"],
    ["shelly", "schneider", "fibaro", "philips"],
  ),
  "energy-management": makeRule(
    ["energy", "meter", "monitoring", "power meter"],
    ["shelly", "schneider", "honeywell"],
  ),
  nvrs: makeRule(
    ["nvr", "dvr", "video recorder"],
    ["hikvision", "dahua", "milestone", "synology", "uniview"],
  ),
  storage: makeRule(
    ["nas", "storage", "hard drive", "hdd", "ssd", "backup", "raid"],
    ["synology", "qnap", "seagate", "western digital", "wd", "kingston"],
  ),
  switches: makeRule(
    ["switch", "managed switch", "poe switch"],
    ["cisco", "ubiquiti", "netgear", "aruba", "tp link", "d link", "ruckus"],
  ),
  routers: makeRule(
    ["router", "gateway", "firewall"],
    ["cisco", "ubiquiti", "mikrotik", "netgear", "tp link"],
  ),
  "access-points": makeRule(
    ["access point", "wifi", "wireless ap"],
    ["ubiquiti", "ruckus", "aruba", "cisco", "tp link"],
  ),
  "networking-accessories": makeRule(
    ["patch lead", "cable", "cat6", "cat5", "keystone", "patch panel", "rack"],
    ["commscope", "belkin", "dynamix", "4cabling"],
  ),
  headsets: makeRule(
    ["headset", "headphones"],
    ["jabra", "poly", "logitech", "epos", "plantronics"],
  ),
  conference: makeRule(
    ["conference", "speakerphone"],
    ["poly", "logitech", "jabra", "yealink"],
  ),
  voip: makeRule(
    ["voip", "ip phone", "sip phone", "desk phone"],
    ["yealink", "cisco", "poly", "grandstream", "avaya"],
  ),
  "video-collab": makeRule(
    ["video collaboration", "video conference", "room kit", "webcam"],
    ["logitech", "poly", "microsoft", "zoom"],
  ),
  "uc-accessories": makeRule(
    ["uc accessory", "usb adapter", "dongle", "speaker", "hub"],
    ["poly", "logitech", "jabra", "yealink"],
  ),
  shredders: makeRule(["shredder"], ["fellowes", "rexel", "hsm", "kobra"]),
  "office-technology": makeRule(
    ["laminator", "binding", "presenter", "whiteboard", "office equipment"],
    ["fellowes", "gbc", "rexel", "3m"],
  ),
};
const CATEGORY_PRIORITY: string[] = [
  "printer-warranties",
  "scanner-warranties",
  "inkjet-consumables",
  "laser-consumables",
  "large-format-consumables",
  "ribbon-tape",
  "3d-filament",
  "other-consumables",
  "a4-scanners",
  "a3-scanners",
  "portable-scanners",
  "scanner-accessories",
  "imaging",
  "a4-printers",
  "a3-printers",
  "inkjet",
  "laser",
  "large-format",
  "dot-matrix",
  "3d-printers",
  "printer-accessories",
  "multifunction",
  "projectors",
  "digital-signage",
  "tvs-panels",
  "interactive-panels",
  "mounts-brackets",
  "collaboration",
  "consumer-cameras",
  "professional-cameras",
  "imaging-accessories",
  "ip-cameras",
  "nvrs-recorders",
  "surveillance-kits",
  "surveillance-accessories",
  "access-control",
  "intercom-systems",
  "ip-communications",
  "ups-power",
  "automation-lighting",
  "energy-management",
  "nvrs",
  "storage",
  "switches",
  "routers",
  "access-points",
  "networking-accessories",
  "headsets",
  "conference",
  "voip",
  "video-collab",
  "uc-accessories",
  "shredders",
  "office-technology",
];

const TOP_LEVEL_MANUFACTURERS = {
  printers: ["hp", "canon", "epson", "lexmark", "brother", "ricoh", "xerox", "kyocera"],
  consumables: ["hp", "canon", "epson", "lexmark", "brother", "ricoh", "xerox", "kyocera"],
  scanners: ["fujitsu", "canon", "epson", "brother", "kodak", "panasonic"],
  surveillance: ["axis", "hikvision", "dahua", "hanwha", "uniview", "tiandy"],
  cameras: ["canon", "nikon", "sony", "fujifilm", "panasonic"],
  audioVisual: ["samsung", "lg", "nec", "benq", "optoma", "panasonic", "sony", "philips"],
  unifiedComms: ["jabra", "poly", "logitech", "yealink", "grandstream", "cisco"],
  storageNetworking: ["cisco", "ubiquiti", "netgear", "aruba", "synology", "qnap", "seagate"],
  securityAutomation: ["akuvox", "aiphone", "zkteco", "gallagher", "apc", "eaton", "shelly"],
};

const inferTopLevelCategory = (product: CatalogProduct, searchText: string) => {
  const manufacturer = normalizeKey(product.manufacturer || "");

  if (
    searchText.includes("toner") ||
    searchText.includes("ink") ||
    searchText.includes("cartridge") ||
    searchText.includes("drum") ||
    searchText.includes("ribbon")
  ) {
    return "print-consumables";
  }

  if (searchText.includes("scanner") || TOP_LEVEL_MANUFACTURERS.scanners.includes(manufacturer)) {
    return "scanners";
  }

  if (searchText.includes("printer") || TOP_LEVEL_MANUFACTURERS.printers.includes(manufacturer)) {
    return "printers";
  }

  if (
    searchText.includes("camera") ||
    searchText.includes("nvr") ||
    TOP_LEVEL_MANUFACTURERS.surveillance.includes(manufacturer)
  ) {
    return "ip-surveillance";
  }

  if (TOP_LEVEL_MANUFACTURERS.cameras.includes(manufacturer)) {
    return "cameras";
  }

  if (
    searchText.includes("projector") ||
    searchText.includes("display") ||
    searchText.includes("signage") ||
    TOP_LEVEL_MANUFACTURERS.audioVisual.includes(manufacturer)
  ) {
    return "audio-visual";
  }

  if (
    searchText.includes("voip") ||
    searchText.includes("headset") ||
    TOP_LEVEL_MANUFACTURERS.unifiedComms.includes(manufacturer)
  ) {
    return "unified-communications";
  }

  if (
    searchText.includes("router") ||
    searchText.includes("switch") ||
    searchText.includes("network") ||
    TOP_LEVEL_MANUFACTURERS.storageNetworking.includes(manufacturer)
  ) {
    return "storage-networking";
  }

  if (
    searchText.includes("intercom") ||
    searchText.includes("access control") ||
    searchText.includes("ups") ||
    TOP_LEVEL_MANUFACTURERS.securityAutomation.includes(manufacturer)
  ) {
    return "security-automation";
  }

  return "";
};

const formatPrice = (value: number | null | undefined) => {
  if (value === null || value === undefined) {
    return null;
  }
  return value.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
};

const getCardSummary = (product: CatalogProduct) => {
  const text = String(product.longDescription || product.description || "").trim();
  if (!text) {
    return "";
  }

  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const summary = sentences[1] || sentences[0] || text;
  return summary.length > 110 ? `${summary.slice(0, 107).trimEnd()}...` : summary;
};

const getCardHighlights = (product: CatalogProduct) => {
  const source = `${product.description} ${product.longDescription || ""}`;
  const patterns = [
    /\b\d+(?:\.\d+)?\s?(?:"|inch|ppm|dpi|nit|nits|gb|tb|mp|fps|hz|w|va)\b/gi,
    /\b(?:A3|A4|4K|UHD|FHD|Wi-Fi|WiFi|PoE|RFID|Bluetooth|Android|Linux|Duplex|Touchscreen|SIP|LTE|5G)\b/gi,
  ];

  const matches = patterns.flatMap((pattern) => source.match(pattern) || []);
  const cleaned = matches
    .map((item) => item.replace(/\s+/g, " ").trim())
    .map((item) => (item.toLowerCase() === "wifi" ? "Wi-Fi" : item))
    .filter(Boolean);

  return Array.from(new Set(cleaned)).slice(0, 3);
};

const toTitle = (slug: string) =>
  slug
    .split("-")
    .map((word) => (word.length <= 2 ? word.toUpperCase() : `${word[0].toUpperCase()}${word.slice(1)}`))
    .join(" ");

const ProductCategory = () => {
  const { category } = useParams();
  const activeCategory = category || "";
  const data =
    topLevelCategories[activeCategory] ||
    ({
      title: TITLE_OVERRIDES[activeCategory] || toTitle(activeCategory),
      description: `Browse ${TITLE_OVERRIDES[activeCategory] || toTitle(activeCategory)} products.`,
      brands: [],
    } satisfies CategoryInfo);

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [featuredRankings, setFeaturedRankings] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("featured");
  const [page, setPage] = useState(1);
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }
    try {
      const stored = window.localStorage.getItem("internext-cart");
      return stored ? (JSON.parse(stored) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let isMounted = true;
    const loadProducts = async () => {
      try {
        const [catalogResponse, featuredResponse] = await Promise.all([
          fetch("/data/catalog-products.json"),
          fetch("/data/alloys-featured-rankings.json"),
        ]);

        if (!catalogResponse.ok) {
          throw new Error("Unable to load the product catalog.");
        }
        const dataResponse = (await catalogResponse.json()) as CatalogProduct[];
        const featuredData = featuredResponse.ok
          ? ((await featuredResponse.json()) as FeaturedRankingsResponse)
          : { rankings: {} };
        if (isMounted) {
          setProducts(normalizeCatalogProducts(dataResponse));
          setFeaturedRankings(featuredData.rankings || {});
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to load products.");
          setLoading(false);
        }
      }
    };

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("internext-cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const categorizedProducts = useMemo(() => {
    return products.map((product) => {
      const searchText = normalizeKey(
        [product.description, product.code, product.manufacturer, product.supplierCode]
          .filter(Boolean)
          .join(" "),
      );
      let assigned = "";
      for (const slug of CATEGORY_PRIORITY) {
        const rule = CATEGORY_RULES[slug];
        if (!rule) continue;
        const keywordMatch = rule.keywords.some((keyword) => keyword && searchText.includes(keyword));
        const manufacturerMatch = rule.manufacturers.length
          ? rule.manufacturers.includes(normalizeKey(product.manufacturer || ""))
          : false;
        if (keywordMatch || manufacturerMatch) {
          assigned = slug;
          break;
        }
      }
      if (!assigned) {
        assigned = inferTopLevelCategory(product, searchText);
      }
      return { ...product, category: assigned };
    });
  }, [products]);

  const slugsForPage = useMemo(() => CATEGORY_GROUPS[activeCategory] ?? [activeCategory], [activeCategory]);
  const categoryProducts = useMemo(() => {
    if (!activeCategory) {
      return categorizedProducts;
    }
    return categorizedProducts.filter((product) => {
      const categorySlug = product.category || "";
      return slugsForPage.includes(categorySlug) || categorySlug === activeCategory;
    });
  }, [activeCategory, categorizedProducts, slugsForPage]);

  const manufacturers = useMemo(() => {
    const values = new Set<string>();
    categoryProducts.forEach((product) => {
      const value = product.manufacturer?.trim() || "Unbranded";
      values.add(value);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [categoryProducts]);

  const keyBrands = useMemo(() => {
    if (manufacturers.length === 0) {
      return [];
    }

    const normalizedAvailable = new Set(manufacturers.map((brand) => normalizeKey(brand)));
    const preferredBrands = data.brands.filter((brand) =>
      normalizedAvailable.has(normalizeKey(brand)),
    );

    const remainingBrands = manufacturers.filter(
      (brand) => !preferredBrands.some((preferred) => normalizeKey(preferred) === normalizeKey(brand)),
    );

    return [...preferredBrands, ...remainingBrands];
  }, [manufacturers, data.brands]);

  const normalizedSelectedBrands = useMemo(
    () => new Set(selectedBrands.map((brand) => normalizeKey(brand))),
    [selectedBrands],
  );

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) => {
      const normalizedBrand = normalizeKey(brand);
      const exists = prev.some((value) => normalizeKey(value) === normalizedBrand);
      if (exists) {
        return prev.filter((value) => normalizeKey(value) !== normalizedBrand);
      }
      return [...prev, brand];
    });
  };

  useEffect(() => {
    setSelectedBrands((prev) =>
      prev.filter((brand) =>
        manufacturers.some((value) => normalizeKey(value) === normalizeKey(brand)),
      ),
    );
  }, [manufacturers]);

  const filteredProducts = useMemo(() => {
    const search = normalizeKey(query);
    const filtered = categoryProducts.filter((product) => {
      const productManufacturer = product.manufacturer?.trim() || "Unbranded";
      if (
        normalizedSelectedBrands.size > 0 &&
        !normalizedSelectedBrands.has(normalizeKey(productManufacturer))
      ) {
        return false;
      }

      const parsedMin = Number(minPrice);
      const parsedMax = Number(maxPrice);

      if (!Number.isNaN(parsedMin) && minPrice.trim() !== "" && (product.price === null || product.price < parsedMin)) {
        return false;
      }

      if (!Number.isNaN(parsedMax) && maxPrice.trim() !== "" && (product.price === null || product.price > parsedMax)) {
        return false;
      }

      if (!search) {
        return true;
      }

      return normalizeKey(
        [product.description, product.code, product.manufacturer, product.supplierCode]
          .filter(Boolean)
          .join(" "),
      ).includes(search);
    });

    const getFeaturedScore = (product: (typeof categoryProducts)[number]) => {
      const candidateSlugs = Array.from(
        new Set(
          [activeCategory, ...(CATEGORY_GROUPS[activeCategory] ?? []), product.category || ""].filter(Boolean),
        ),
      );

      return candidateSlugs.reduce((best, slug) => {
        const score = featuredRankings[slug]?.[product.code] ?? 0;
        return Math.max(best, score);
      }, 0);
    };

    if (sort === "featured") {
      return [...filtered].sort((a, b) => {
        const scoreDiff = getFeaturedScore(b) - getFeaturedScore(a);
        if (scoreDiff !== 0) {
          return scoreDiff;
        }

        if (a.price !== null && b.price !== null && a.price !== b.price) {
          return a.price - b.price;
        }

        return a.description.localeCompare(b.description);
      });
    }

    if (sort === "name-asc") {
      return [...filtered].sort((a, b) => a.description.localeCompare(b.description));
    }

    if (sort === "name-desc") {
      return [...filtered].sort((a, b) => b.description.localeCompare(a.description));
    }

    if (sort === "price-asc") {
      return [...filtered].sort((a, b) => {
        if (a.price === null) return 1;
        if (b.price === null) return -1;
        return a.price - b.price;
      });
    }

    if (sort === "price-desc") {
      return [...filtered].sort((a, b) => {
        if (a.price === null) return 1;
        if (b.price === null) return -1;
        return b.price - a.price;
      });
    }

    return filtered;
  }, [
    activeCategory,
    categoryProducts,
    featuredRankings,
    maxPrice,
    minPrice,
    normalizedSelectedBrands,
    query,
    sort,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setPage(1);
  }, [maxPrice, minPrice, query, selectedBrands, sort]);

  const pricedCount = useMemo(
    () => categoryProducts.filter((product) => product.price !== null).length,
    [categoryProducts],
  );

  const activeFilterChips = useMemo<FilterChip[]>(() => {
    const chips: FilterChip[] = [];

    if (query.trim()) {
      chips.push({
        key: "query",
        label: `Search: ${query.trim()}`,
        onRemove: () => setQuery(""),
      });
    }

    selectedBrands.forEach((brand) => {
      chips.push({
        key: `brand-${brand}`,
        label: brand,
        onRemove: () => toggleBrand(brand),
      });
    });

    if (minPrice.trim() || maxPrice.trim()) {
      chips.push({
        key: "price",
        label: `${minPrice.trim() ? `$${minPrice.trim()}` : "$0"} - ${maxPrice.trim() ? `$${maxPrice.trim()}` : "Any"}`,
        onRemove: () => {
          setMinPrice("");
          setMaxPrice("");
        },
      });
    }

    return chips;
  }, [maxPrice, minPrice, query, selectedBrands]);

  const clearAllFilters = () => {
    setQuery("");
    setSelectedBrands([]);
    setMinPrice("");
    setMaxPrice("");
    setSort("featured");
  };

  const addToCart = (product: CatalogProduct) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.code === product.code);
      if (existing) {
        return prev.map((item) =>
          item.code === product.code ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (code: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.code === code ? { ...item, qty: Math.max(1, item.qty + delta) } : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const removeItem = (code: string) => {
    setCartItems((prev) => prev.filter((item) => item.code !== code));
  };

  const cartTotal = useMemo(() => {
    return cartItems.reduce((total, item) => {
      if (item.price === null) {
        return total;
      }
      return total + item.price * item.qty;
    }, 0);
  }, [cartItems]);

  return (
    <Layout>
      <section className="bg-gradient-hero py-16 md:py-24">
        <div className="container-wide">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
              {data.title}
            </h1>
            <p className="text-xl text-primary-foreground/80 leading-relaxed">
              {data.description}
            </p>
          </div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(0,1fr)_320px]">
            <aside className="lg:w-64 flex-shrink-0">
              <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 sticky top-24">
                <h3 className="font-semibold text-foreground mb-4">Brands</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 text-sm text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedBrands.length === 0}
                      onChange={() => setSelectedBrands([])}
                      className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                    />
                    <span className={selectedBrands.length === 0 ? "text-accent font-semibold" : ""}>
                      All Brands
                    </span>
                  </label>
                  {keyBrands.map((brand) => {
                    const checked = normalizedSelectedBrands.has(normalizeKey(brand));
                    return (
                      <label key={brand} className="flex items-center gap-3 text-sm text-muted-foreground cursor-pointer hover:text-accent">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleBrand(brand)}
                          className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                        />
                        <span className={checked ? "text-accent font-semibold" : ""}>{brand}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="mt-6 border-t border-border/60 pt-6">
                  <h4 className="font-semibold text-foreground mb-3">Price Range</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        Min
                      </label>
                      <Input
                        inputMode="numeric"
                        placeholder="0"
                        value={minPrice}
                        onChange={(event) => setMinPrice(event.target.value.replace(/[^\d]/g, ""))}
                        className="bg-secondary border-0"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        Max
                      </label>
                      <Input
                        inputMode="numeric"
                        placeholder="Any"
                        value={maxPrice}
                        onChange={(event) => setMaxPrice(event.target.value.replace(/[^\d]/g, ""))}
                        className="bg-secondary border-0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            <div className="flex-1">
              <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50 mb-6">
                <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                  <div className="flex-1">
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search by product name, code, or manufacturer"
                      className="bg-secondary border-0"
                    />
                  </div>
                  <div className="flex sm:justify-end">
                    <select
                      className="min-w-[180px] bg-secondary border-0 rounded-md px-3 py-2 text-sm"
                      value={sort}
                      onChange={(event) => setSort(event.target.value)}
                    >
                      <option value="featured">Sort by: Featured</option>
                      <option value="name-asc">Name A-Z</option>
                      <option value="name-desc">Name Z-A</option>
                      <option value="price-asc">Price Low-High</option>
                      <option value="price-desc">Price High-Low</option>
                    </select>
                  </div>
                </div>

                {activeFilterChips.length > 0 ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {activeFilterChips.map((chip) => (
                      <button
                        key={chip.key}
                        type="button"
                        onClick={chip.onRemove}
                        className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent/50 hover:text-accent"
                      >
                        <span>{chip.label}</span>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="text-xs font-semibold text-accent hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>{filteredProducts.length} products</span>
                  <span>{pricedCount} priced and ready to quote</span>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
              </div>

              {loading && (
                <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                  Loading products...
                </div>
              )}

              {error && (
                <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 text-destructive">
                  {error}
                </div>
              )}

              {!loading && !error && pageItems.length === 0 && (
                <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
                  No products found for this category yet.
                </div>
              )}

              {!loading && !error && pageItems.length > 0 && (
                <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
                  {pageItems.map((product) => {
                    const priceLabel = formatPrice(product.price) ?? product.priceText ?? "POA";
                    const productImage = getPrimaryProductImage(product);
                    const summary = getCardSummary(product);
                    const highlights = getCardHighlights(product);
                    return (
                      <div
                        key={product.code}
                        className="group relative flex h-full flex-col overflow-hidden rounded-[1.4rem] border border-border/60 bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-accent/25 hover:shadow-elevated"
                      >
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-accent/80 to-transparent opacity-70" />

                        <div className="p-4 pb-3">
                          <div className="mb-3 flex flex-wrap justify-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
                              {product.manufacturer}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-border/60 bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground">
                              {product.code}
                            </span>
                          </div>

                          <div className="relative aspect-square overflow-hidden rounded-[1.15rem] border border-border/50 bg-gradient-to-br from-secondary via-background to-secondary/55">
                            <div className="absolute inset-x-6 top-0 h-8 rounded-b-full bg-white/35 blur-xl" />
                            <div className="flex h-full items-center justify-center p-4">
                              <img
                                src={productImage}
                                alt={product.description}
                                loading="lazy"
                                onError={handleProductImageError}
                                className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-1 flex-col px-4 pb-4">
                          <h4 className="min-h-[3.2rem] text-center text-[15px] font-semibold leading-snug text-foreground">
                            {product.description}
                          </h4>

                          <p className="mt-2 min-h-[3.2rem] text-center text-sm leading-5 text-muted-foreground">
                            {summary}
                          </p>

                          <div className="mt-3 min-h-[2.2rem]">
                            {highlights.length > 0 ? (
                              <div className="flex flex-wrap justify-center gap-2">
                                {highlights.map((highlight) => (
                                  <span
                                    key={highlight}
                                    className="rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-[11px] font-medium text-foreground"
                                  >
                                    {highlight}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="h-full" />
                            )}
                          </div>

                          <div className="mt-4 rounded-xl border border-border/50 bg-secondary/35 px-3 py-3">
                            <div className="flex items-end justify-between gap-3">
                              <span className="text-xl font-bold leading-none text-foreground">
                                {priceLabel}
                              </span>
                              {product.rrp ? (
                                <span className="text-xs text-right text-muted-foreground">
                                  RRP {formatPrice(product.rrp)}
                                </span>
                              ) : (
                                <span className="text-xs text-right text-muted-foreground">
                                  Reseller pricing
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-1 gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full min-w-0 rounded-xl border-border/70 bg-background whitespace-normal px-3 text-center leading-tight"
                              asChild
                            >
                              <Link to={`/products/item/${encodeURIComponent(product.code)}`}>
                                View Details
                              </Link>
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="w-full min-w-0 rounded-xl whitespace-normal px-3 text-center leading-tight"
                              onClick={() => addToCart(product)}
                            >
                              Add to Cart
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!loading && !error && totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>

            <aside className="lg:col-span-2 2xl:col-span-1 2xl:sticky 2xl:top-24 h-fit">
              <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Cart</h3>
                  <span className="text-sm text-muted-foreground">{cartItems.length} items</span>
                </div>

                {cartItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Add products to build your order.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div key={item.code} className="border border-border/50 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground break-words">
                              {item.description}
                            </p>
                            <p className="text-xs text-muted-foreground">{item.code}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.code)}
                            className="text-xs text-muted-foreground hover:text-accent"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateQty(item.code, -1)}
                              className="h-8 w-8 border border-border rounded-md flex items-center justify-center hover:bg-secondary"
                            >
                              -
                            </button>
                            <span className="text-sm font-semibold w-6 text-center">{item.qty}</span>
                            <button
                              type="button"
                              onClick={() => updateQty(item.code, 1)}
                              className="h-8 w-8 border border-border rounded-md flex items-center justify-center hover:bg-secondary"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-sm font-semibold text-foreground">
                            {formatPrice(item.price) ?? item.priceText ?? "POA"}
                          </span>
                        </div>
                      </div>
                    ))}

                    <div className="border-t border-border pt-4 text-sm text-muted-foreground">
                      <p className="flex items-center justify-between">
                        <span>Subtotal</span>
                        <span className="text-foreground font-semibold">
                          {formatPrice(cartTotal) ?? "N/A"}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Total excludes POA items.
                      </p>
                    </div>

                    {cartItems.length > 0 ? (
                      <Button className="w-full" asChild>
                        <Link to="/cart">View Cart</Link>
                      </Button>
                    ) : (
                      <Button className="w-full" disabled>
                        View Cart
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="py-12 bg-secondary">
        <div className="container-wide">
          <div className="bg-card rounded-2xl p-8 shadow-card flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Need Help Choosing?</h3>
              <p className="text-muted-foreground">
                Our technical specialists can help you find the right solution for your project.
              </p>
            </div>
            <Button variant="default" className="flex-shrink-0" asChild>
              <Link to="/contact">
                <Phone className="mr-2 h-4 w-4" /> Contact a Specialist
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ProductCategory;
