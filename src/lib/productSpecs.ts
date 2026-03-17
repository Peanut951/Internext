type CatalogProductLike = {
  code: string;
  description: string;
  longDescription?: string;
  supplierCode?: string;
};

const normalizeHighlight = (value: string) => {
  const cleaned = value.replace(/\s+/g, " ").trim();
  const lower = cleaned.toLowerCase();

  const replacements: Record<string, string> = {
    wifi: "Wi-Fi",
    "wi-fi": "Wi-Fi",
    "wi fi": "Wi-Fi",
    poe: "PoE",
    "poe+": "PoE+",
    "poe++": "PoE++",
    rfid: "RFID",
    sip: "SIP",
    lte: "LTE",
    dect: "DECT",
    ptz: "PTZ",
    uhd: "UHD",
    fhd: "FHD",
    a3: "A3",
    a4: "A4",
    "4k": "4K",
    "5g": "5G",
    hdmi: "HDMI",
    usb: "USB",
  };

  return replacements[lower] || cleaned;
};

const dedupeHighlights = (values: string[]) => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (!value || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export const extractProductSpecHighlights = (product: CatalogProductLike) => {
  const source = `${product.description} ${product.longDescription || ""} ${product.code} ${product.supplierCode || ""}`;
  const description = product.description || "";
  const lowerSource = source.toLowerCase();
  const ordered: string[] = [];
  const pushIf = (condition: boolean, value: string) => {
    if (condition) {
      ordered.push(value);
    }
  };

  const screenMatch = description.match(/\b(\d+(?:\.\d+)?)\s?(?:"|inch)\b/i);
  if (screenMatch) {
    if (/(monitor|display|panel|screen)/i.test(description)) {
      ordered.push(`${screenMatch[1]}" Display`);
    } else {
      ordered.push(`${screenMatch[1]}"`);
    }
  }

  const androidMatch = source.match(/\bAndroid\s?(\d+)?\b/i);
  if (androidMatch) {
    ordered.push(androidMatch[1] ? `Android ${androidMatch[1]}` : "Android");
  }

  if (/\b8k\b/i.test(source)) ordered.push("8K");
  else if (/\b4k\b/i.test(source)) ordered.push("4K");
  else if (/\buhd\b/i.test(source)) ordered.push("UHD");
  else if (/\bfhd\b|full hd/i.test(source)) ordered.push("FHD");
  else if (/\bhd\b/i.test(source)) ordered.push("HD");

  pushIf(/linux based|linux/i.test(source), "Linux Based");
  if (/wi[\s-]?fi\s?6e/i.test(source)) ordered.push("Wi-Fi 6E");
  else if (/wi[\s-]?fi\s?6/i.test(source)) ordered.push("Wi-Fi 6");
  else pushIf(/wi[\s-]?fi/i.test(source), "Wi-Fi");
  if (/poe\+\+/i.test(source)) ordered.push("PoE++");
  else if (/poe\+/i.test(source)) ordered.push("PoE+");
  else pushIf(/\bpoe\b/i.test(source), "PoE");
  pushIf(/\bsip\b/i.test(source), "SIP");
  pushIf(/\brfid\b/i.test(source), "RFID");
  pushIf(/\bbluetooth\b/i.test(source), "Bluetooth");
  pushIf(/\bdect\b/i.test(source), "DECT");
  pushIf(/\blte\b/i.test(source), "LTE");
  pushIf(/\b5g\b/i.test(source), "5G");
  pushIf(/\btouchscreen|touch display|touch monitor|touch\b/i.test(source), "Touchscreen");
  pushIf(/\bduplex\b/i.test(source), "Duplex");
  pushIf(/\bptz\b/i.test(source), "PTZ");
  pushIf(/\bcamera\b/i.test(source), "Camera");
  pushIf(/\bintercom\b/i.test(source), "Intercom");
  pushIf(/\bvideo intercom\b/i.test(source), "Video Intercom");
  pushIf(/\baccess control\b/i.test(source), "Access Control");

  if (/indoor monitor/i.test(source)) ordered.push("Indoor Monitor");
  else if (/indoor unit/i.test(source)) ordered.push("Indoor Unit");
  else if (/outdoor station/i.test(source)) ordered.push("Outdoor Station");
  else if (/door station/i.test(source)) ordered.push("Door Station");
  else if (/access point/i.test(source)) ordered.push("Access Point");
  else if (/managed switch/i.test(source)) ordered.push("Managed Switch");
  else if (/gigabit switch/i.test(source)) ordered.push("Gigabit Switch");
  else if (/switch/i.test(source)) ordered.push("Network Switch");
  else if (/vpn router/i.test(source)) ordered.push("VPN Router");
  else if (/router/i.test(source)) ordered.push("Router");
  else if (/gateway/i.test(source)) ordered.push("Gateway");
  else if (/speakerphone/i.test(source)) ordered.push("Speakerphone");
  else if (/ip phone/i.test(source)) ordered.push("IP Phone");
  else if (/headset/i.test(source)) ordered.push("Headset");
  else if (/document scanner/i.test(source)) ordered.push("Document Scanner");
  else if (/\bmfp\b|multifunction/i.test(source)) ordered.push("Multifunction");
  else if (/projector/i.test(source)) ordered.push("Projector");
  else if (/digital signage/i.test(source)) ordered.push("Digital Signage");
  else if (/interactive panel/i.test(source)) ordered.push("Interactive Panel");
  else if (/display/i.test(source)) ordered.push("Commercial Display");
  else if (/ups|uninterruptible power/i.test(source)) ordered.push("UPS");
  else if (/\btoner\b/i.test(source)) ordered.push("Toner");
  else if (/\bink\b/i.test(source)) ordered.push("Ink");

  if (/\bon[\s-]?wall\b/i.test(lowerSource)) ordered.push("On-Wall");
  else if (/\bwall[\s-]?mount|\bwall mount/i.test(lowerSource)) ordered.push("Wall Mount");
  else if (/\bceiling[\s-]?mount|\bceiling mount/i.test(lowerSource)) ordered.push("Ceiling Mount");
  else if (/\brack[\s-]?mount|\brackmount/i.test(lowerSource)) ordered.push("Rackmount");
  else if (/\bdesktop\b/i.test(lowerSource)) ordered.push("Desktop");

  if (/\bindoor\b/i.test(lowerSource) && !ordered.some((item) => item.toLowerCase().includes("indoor"))) {
    ordered.push("Indoor Use");
  }
  if (/\boutdoor\b/i.test(lowerSource) && !ordered.some((item) => item.toLowerCase().includes("outdoor"))) {
    ordered.push("Outdoor Use");
  }

  const colorMatch = source.match(/\b(white|black|silver|grey|gray)\b/i);
  if (colorMatch) {
    ordered.push(normalizeHighlight(colorMatch[1]));
  }

  const numericPatterns = [
    /\b\d+(?:\.\d+)?\s?(?:ppm|dpi|nit|nits|gb|tb|mp|fps|hz|w|va)\b/gi,
    /\b\d+\s?(?:port|ports|user|users|channel|channels)\b/gi,
    /\b\d+\s?wire\b/gi,
  ];

  numericPatterns.forEach((pattern) => {
    (source.match(pattern) || []).forEach((item) => ordered.push(normalizeHighlight(item)));
  });

  const deduped = dedupeHighlights(ordered);
  const weakHighlights = new Set(["black", "white", "silver", "grey", "gray", "hd"]);
  const filtered = deduped.filter((item) => !weakHighlights.has(item.toLowerCase()) || deduped.length <= 3);

  return filtered.slice(0, 6);
};
