import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/layout/Layout";
import { Link, useParams } from "react-router-dom";
import { Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPrimaryProductImage, handleProductImageError } from "@/lib/productImages";
import { getCatalogSummaryText, normalizeCatalogProducts } from "@/lib/catalogQuality";

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

type FacetOption = {
  id: string;
  label: string;
  match: RegExp;
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
    ["printer warranty", "printer support", "printer service", "onsite service", "care pack", "advance exchange", "extended warranty"],
    [],
  ),
  "scanner-warranties": makeRule(
    ["scanner warranty", "scanner support", "scanner service", "scanner maintenance", "scanner extended warranty"],
    [],
  ),
  "inkjet-consumables": makeRule(
    ["ink cartridge", "ink bottle", "ink pack", "printhead", "maintenance box", "waste ink"],
    ["hp", "canon", "epson", "brother", "fujifilm"],
  ),
  "laser-consumables": makeRule(
    ["toner", "drum", "fuser", "developer", "imaging unit", "transfer belt", "waste toner"],
    ["lexmark", "hp", "canon", "brother", "kyocera", "ricoh", "xerox", "konica minolta"],
  ),
  "large-format-consumables": makeRule(
    ["large format ink", "latex ink", "designjet ink", "imageprograf ink", "surecolor ink", "plotter paper"],
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
    ["a4 scanner", "document scanner", "desktop scanner", "sheetfed scanner", "duplex scanner"],
    [],
  ),
  "a3-scanners": makeRule(
    ["a3 scanner", "large format scanner", "a3 flatbed", "bookedge scanner"],
    [],
  ),
  "portable-scanners": makeRule(
    ["portable scanner", "mobile scanner", "handheld scanner", "receipt scanner"],
    [],
  ),
  imaging: makeRule(["archiving", "microfilm", "book scanner", "capture software"], []),
  "scanner-accessories": makeRule(["scanner roller", "scanner pad", "scanner kit", "scanner accessory", "carrier sheet"], []),
  "a4-printers": makeRule(
    ["a4 printer", "a4 mono", "a4 colour", "a4 duplex", "a4 wireless printer"],
    [],
  ),
  "a3-printers": makeRule(
    ["a3 printer", "a3 colour", "a3 mono", "a3 multifunction", "a3 photo printer", "a3 inkjet printer", "tabloid"],
    [],
  ),
  inkjet: makeRule(
    ["inkjet printer", "ink tank printer", "inkjet mfp", "ecotank", "inkvestment", "pixma", "officejet", "workforce"],
    [],
  ),
  laser: makeRule(
    ["laser printer", "laser mfp", "mono laser", "color laser", "colour laser", "isensys", "ecosys", "apeosprint"],
    [],
  ),
  "large-format": makeRule(
    ["large format printer", "designjet", "imageprograf", "surecolor", "latex printer", "plotter", "wide format"],
    [],
  ),
  "dot-matrix": makeRule(["dot matrix", "impact printer"], []),
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
    ["wireless presentation", "room scheduler", "presentation hub", "meeting board", "collaboration bar"],
    [],
  ),
  "consumer-cameras": makeRule(
    ["camera", "dslr", "mirrorless", "compact camera"],
    ["canon", "nikon", "sony", "fujifilm", "panasonic"],
  ),
  "professional-cameras": makeRule(
    ["broadcast", "cinema camera", "camcorder", "ptz", "pro video", "video production"],
    [],
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
    ["ip communicator", "paging", "ip paging", "sip speaker", "sip horn", "paging adapter"],
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
    ["nas recorder", "surveillance storage", "video storage server"],
    [],
  ),
  storage: makeRule(
    ["nas", "hard drive", "hdd", "ssd", "backup appliance", "raid storage", "expansion unit"],
    [],
  ),
  switches: makeRule(
    ["switch", "managed switch", "poe switch", "gigabit switch", "ethernet switch"],
    [],
  ),
  routers: makeRule(
    ["router", "gateway", "vpn router", "multi wan", "firewall appliance"],
    [],
  ),
  "access-points": makeRule(
    ["access point", "wireless ap", "wifi 6 ap", "wi fi 6 ap", "ceiling ap", "indoor ap", "outdoor ap"],
    [],
  ),
  "networking-accessories": makeRule(
    ["patch lead", "cable", "cat6", "cat5", "keystone", "patch panel", "rack", "sfp", "transceiver"],
    [],
  ),
  headsets: makeRule(
    ["headset", "headphones", "mono headset", "stereo headset", "dect headset"],
    [],
  ),
  conference: makeRule(
    ["conference phone", "speakerphone", "meeting bar", "conference camera"],
    [],
  ),
  voip: makeRule(
    ["voip", "ip phone", "sip phone", "desk phone", "cordless ip phone", "dect base", "expansion module"],
    [],
  ),
  "video-collab": makeRule(
    ["video collaboration", "video conference", "room kit", "webcam", "teams room", "zoom room", "usb camera"],
    [],
  ),
  "uc-accessories": makeRule(
    ["uc accessory", "usb adapter", "dongle", "speaker", "hub", "headset stand", "busy light"],
    [],
  ),
  shredders: makeRule(["shredder"], []),
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

const FACET_CONFIG: Record<string, FacetOption[]> = {
  printers: [
    { id: "mono", label: "Mono", match: /\bmono\b/i },
    { id: "colour", label: "Colour", match: /\bcolour\b|\bcolor\b/i },
    { id: "mfp", label: "Multifunction", match: /\bmfp\b|multifunction|all in one/i },
    { id: "wireless", label: "Wireless", match: /wireless|wi fi|wi-fi/i },
    { id: "duplex", label: "Duplex", match: /duplex/i },
  ],
  scanners: [
    { id: "a4", label: "A4", match: /\ba4\b/i },
    { id: "a3", label: "A3", match: /\ba3\b/i },
    { id: "portable", label: "Portable", match: /portable|mobile|handheld/i },
    { id: "flatbed", label: "Flatbed", match: /flatbed|bookedge/i },
    { id: "duplex", label: "Duplex", match: /duplex/i },
  ],
  "storage-networking": [
    { id: "poe", label: "PoE", match: /\bpoe\b/i },
    { id: "managed", label: "Managed", match: /managed/i },
    { id: "wifi6", label: "Wi-Fi 6", match: /wi fi 6|wi-fi 6|wifi 6/i },
    { id: "vpn", label: "VPN", match: /\bvpn\b/i },
    { id: "gigabit", label: "Gigabit", match: /gigabit|gbe/i },
  ],
  "unified-communications": [
    { id: "dect", label: "DECT", match: /\bdect\b/i },
    { id: "speakerphone", label: "Speakerphone", match: /speakerphone|conference phone/i },
    { id: "deskphone", label: "Desk Phone", match: /desk phone|ip phone|sip phone/i },
    { id: "webcam", label: "Webcam", match: /webcam|usb camera/i },
    { id: "headset", label: "Headset", match: /headset|headphones/i },
  ],
  "security-automation": [
    { id: "poe", label: "PoE", match: /\bpoe\b/i },
    { id: "rfid", label: "RFID", match: /\brfid\b/i },
    { id: "intercom", label: "Intercom", match: /intercom|door station/i },
    { id: "nvrdvr", label: "NVR / DVR", match: /\bnvr\b|\bdvr\b/i },
    { id: "ptz", label: "PTZ", match: /\bptz\b/i },
  ],
  "ip-surveillance": [
    { id: "poe", label: "PoE", match: /\bpoe\b/i },
    { id: "ptz", label: "PTZ", match: /\bptz\b/i },
    { id: "nvrdvr", label: "NVR / DVR", match: /\bnvr\b|\bdvr\b/i },
    { id: "thermal", label: "Thermal", match: /thermal/i },
    { id: "wireless", label: "Wireless", match: /wireless|wi fi|wi-fi/i },
  ],
  "audio-visual": [
    { id: "4k", label: "4K / UHD", match: /\b4k\b|\buhd\b/i },
    { id: "touch", label: "Touch", match: /touch|interactive/i },
    { id: "signage", label: "Signage", match: /signage/i },
    { id: "projector", label: "Projector", match: /projector/i },
    { id: "mount", label: "Mount", match: /mount|bracket|wall mount/i },
  ],
  "print-consumables": [
    { id: "ink", label: "Ink", match: /ink|printhead|maintenance box/i },
    { id: "toner", label: "Toner", match: /toner|laser consumable/i },
    { id: "drum", label: "Drum / Fuser", match: /drum|fuser|developer/i },
    { id: "ribbon", label: "Ribbon / Tape", match: /ribbon|label tape/i },
    { id: "filament", label: "Filament", match: /filament|pla|abs|petg/i },
  ],
};

const getTopLevelCategory = (categorySlug: string) => {
  if (CATEGORY_GROUPS[categorySlug]) {
    return categorySlug;
  }

  const match = Object.entries(CATEGORY_GROUPS).find(([, slugs]) => slugs.includes(categorySlug));
  return match?.[0] || categorySlug;
};

const inferDocumentCategory = (searchText: string) => {
  const hasPrinter = /(printer|print\b|mfp|multifunction|laserjet|officejet|ecotank|imageprograf|designjet|surecolor|pixma|workforce|ecosys|isensys|apeosprint)/i.test(searchText);
  const hasScanner = /scanner|scan snap|scansnap|document scanner|flatbed/i.test(searchText);

  if (/(printer warranty|printer support|printer service|care pack|extended warranty|advance exchange)/i.test(searchText)) {
    return "printer-warranties";
  }
  if (/(scanner warranty|scanner support|scanner maintenance|scanner extended warranty)/i.test(searchText)) {
    return "scanner-warranties";
  }
  if (/(ink cartridge|ink bottle|ink pack|printhead|maintenance box|waste ink)/i.test(searchText)) {
    return "inkjet-consumables";
  }
  if (/(toner|drum|fuser|developer|imaging unit|transfer belt|waste toner)/i.test(searchText)) {
    return "laser-consumables";
  }
  if (/(large format ink|latex ink|designjet ink|imageprograf ink|surecolor ink|plotter paper)/i.test(searchText)) {
    return "large-format-consumables";
  }
  if (/(ribbon|label tape|thermal transfer)/i.test(searchText)) {
    return "ribbon-tape";
  }
  if (/(filament|pla|abs|petg|resin)/i.test(searchText)) {
    return "3d-filament";
  }
  if (/(scanner roller|scanner pad|carrier sheet|scanner accessory)/i.test(searchText)) {
    return "scanner-accessories";
  }
  if (hasScanner) {
    if (/(portable scanner|mobile scanner|handheld scanner|receipt scanner)/i.test(searchText)) {
      return "portable-scanners";
    }
    if (/(a3|large format|bookedge|flatbed)/i.test(searchText)) {
      return "a3-scanners";
    }
    return "a4-scanners";
  }
  if (/(microfilm|archiving|capture software|book scanner)/i.test(searchText)) {
    return "imaging";
  }
  if (/(3d printer|additive|fused deposition|sls)/i.test(searchText)) {
    return "3d-printers";
  }
  if (/(dot matrix|impact printer)/i.test(searchText)) {
    return "dot-matrix";
  }
  if (/(printer tray|printer stand|feeder|duplexer|maintenance kit)/i.test(searchText)) {
    return "printer-accessories";
  }
  if (hasPrinter) {
    if (/(designjet|imageprograf|surecolor|large format|wide format|plotter|technical printer)/i.test(searchText)) {
      return "large-format";
    }
    if (/(mfp|multifunction|all in one|copy scan)/i.test(searchText)) {
      return "multifunction";
    }
    if (/(inkjet|ecotank|ink tank|inkvestment|pixma|officejet|workforce)/i.test(searchText)) {
      return "inkjet";
    }
    if (/(laser|laserjet|mono printer|colour printer|color printer|isensys|ecosys|apeosprint)/i.test(searchText)) {
      return "laser";
    }
    if (/\ba3\b|a3\+|tabloid/i.test(searchText)) {
      return "a3-printers";
    }
    return "a4-printers";
  }

  return "";
};

const inferUnifiedCommsCategory = (searchText: string) => {
  if (/(headset|headphones|mono headset|stereo headset|dect headset)/i.test(searchText)) {
    return "headsets";
  }
  if (/(conference phone|speakerphone|meeting bar|conference camera)/i.test(searchText)) {
    return "conference";
  }
  if (/(video collaboration|video conference|room kit|webcam|teams room|zoom room|usb camera)/i.test(searchText)) {
    return "video-collab";
  }
  if (/(voip|ip phone|sip phone|desk phone|cordless ip phone|dect base|expansion module)/i.test(searchText)) {
    return "voip";
  }
  if (/(uc accessory|usb adapter|dongle|busy light|headset stand)/i.test(searchText)) {
    return "uc-accessories";
  }
  return "";
};

const inferNetworkingCategory = (searchText: string) => {
  if (/(managed switch|poe switch|gigabit switch|ethernet switch)/i.test(searchText)) {
    return "switches";
  }
  if (/(vpn router|multi wan|firewall appliance|router|gateway)/i.test(searchText)) {
    return "routers";
  }
  if (/(access point|wireless ap|wifi 6 ap|wi fi 6 ap|ceiling ap|outdoor ap|indoor ap)/i.test(searchText)) {
    return "access-points";
  }
  if (/(nas|hard drive|ssd|hdd|backup appliance|raid storage|expansion unit)/i.test(searchText)) {
    return "storage";
  }
  if (/(patch lead|cat6|cat5|keystone|patch panel|sfp|transceiver|rack accessory)/i.test(searchText)) {
    return "networking-accessories";
  }
  return "";
};

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
  return getCatalogSummaryText(product);
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
  const [selectedFacets, setSelectedFacets] = useState<string[]>([]);
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
      let assigned =
        inferDocumentCategory(searchText) ||
        inferUnifiedCommsCategory(searchText) ||
        inferNetworkingCategory(searchText);

      for (const slug of CATEGORY_PRIORITY) {
        if (assigned) {
          break;
        }
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
      return { ...product, category: assigned, searchText };
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

  const topLevelCategory = useMemo(
    () => getTopLevelCategory(activeCategory),
    [activeCategory],
  );

  const availableFacets = useMemo(() => {
    const facets = FACET_CONFIG[topLevelCategory] || [];
    return facets
      .map((facet) => {
        const count = categoryProducts.filter((product) => facet.match.test(product.searchText || "")).length;
        return { ...facet, count };
      })
      .filter((facet) => facet.count > 0);
  }, [categoryProducts, topLevelCategory]);

  const facetById = useMemo(() => {
    return new Map(availableFacets.map((facet) => [facet.id, facet]));
  }, [availableFacets]);

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

  useEffect(() => {
    setSelectedFacets((prev) => prev.filter((id) => facetById.has(id)));
  }, [facetById]);

  const toggleFacet = (facetId: string) => {
    setSelectedFacets((prev) =>
      prev.includes(facetId) ? prev.filter((id) => id !== facetId) : [...prev, facetId],
    );
  };

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

      if (
        selectedFacets.length > 0 &&
        !selectedFacets.some((facetId) => facetById.get(facetId)?.match.test(product.searchText || ""))
      ) {
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
    facetById,
    featuredRankings,
    maxPrice,
    minPrice,
    normalizedSelectedBrands,
    query,
    selectedFacets,
    sort,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const visibleStart = filteredProducts.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const visibleEnd = Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length);
  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
    const startPage = Math.min(Math.max(1, currentPage - 2), Math.max(1, totalPages - 4));
    return startPage + index;
  }).filter((value) => value <= totalPages);

  useEffect(() => {
    setPage(1);
  }, [maxPrice, minPrice, query, selectedBrands, selectedFacets, sort]);

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

    selectedFacets.forEach((facetId) => {
      const facet = facetById.get(facetId);
      if (!facet) {
        return;
      }
      chips.push({
        key: `facet-${facetId}`,
        label: facet.label,
        onRemove: () => toggleFacet(facetId),
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
  }, [facetById, maxPrice, minPrice, query, selectedBrands, selectedFacets]);

  const clearAllFilters = () => {
    setQuery("");
    setSelectedBrands([]);
    setSelectedFacets([]);
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
                <h3 className="font-semibold text-foreground mb-1">Brands</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Select one or more brands for this category.
                </p>
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

                {availableFacets.length > 0 ? (
                  <div className="mt-6 border-t border-border/60 pt-6">
                    <h4 className="font-semibold text-foreground mb-1">Product Features</h4>
                    <p className="mb-3 text-xs text-muted-foreground">
                      Filter by features relevant to this category.
                    </p>
                    <div className="space-y-2">
                      {availableFacets.map((facet) => {
                        const checked = selectedFacets.includes(facet.id);
                        return (
                          <label
                            key={facet.id}
                            className="flex items-center justify-between gap-3 text-sm text-muted-foreground cursor-pointer hover:text-accent"
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleFacet(facet.id)}
                                className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                              />
                              <span className={checked ? "text-accent font-semibold" : ""}>
                                {facet.label}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">{facet.count}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

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
                    Showing {visibleStart}-{visibleEnd}
                  </span>
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
                <div className="grid gap-6 md:grid-cols-2">
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

                        <div className="p-5 pb-4">
                          <div className="mb-3 flex flex-wrap justify-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
                              {product.manufacturer}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-border/60 bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground">
                              {product.code}
                            </span>
                          </div>

                          <div className="relative aspect-[1/1] overflow-hidden rounded-[1.2rem] border border-border/50 bg-gradient-to-br from-secondary via-background to-secondary/55">
                            <div className="absolute inset-x-6 top-0 h-9 rounded-b-full bg-white/35 blur-xl" />
                            <div className="flex h-full items-center justify-center p-5">
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

                        <div className="flex flex-1 flex-col px-5 pb-5">
                          <h4 className="min-h-[4.2rem] text-center text-lg font-semibold leading-snug text-foreground">
                            {product.description}
                          </h4>

                          <p className="mt-3 min-h-[4.4rem] text-center text-sm leading-6 text-muted-foreground">
                            {summary}
                          </p>

                          <div className="mt-4 min-h-[2.6rem]">
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

                          <div className="mt-5 rounded-xl border border-border/50 bg-secondary/35 px-4 py-4">
                            <div className="flex items-end justify-between gap-3">
                              <span className="text-2xl font-bold leading-none text-foreground">
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

                          <div className="mt-4 grid grid-cols-1 gap-2">
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
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-card">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    Previous
                  </Button>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {pageNumbers.map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setPage(pageNumber)}
                        className={`h-10 min-w-10 rounded-full px-3 text-sm font-medium transition-colors ${
                          pageNumber === currentPage
                            ? "bg-primary text-primary-foreground"
                            : "border border-border/70 bg-background text-foreground hover:border-accent/40 hover:text-accent"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    ))}
                  </div>
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
