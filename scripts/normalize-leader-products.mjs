import fs from "fs";
import path from "path";

const root = process.cwd();
const dataPath = path.join(root, "public", "data", "leader-products.json");

const replacements = [
  [/Â®/g, "®"],
  [/â„¢/g, "™"],
  [/Â /g, " "],
  [/ï¼Œ/g, ","],
  [/Ï†/g, "phi"],
  [/â€“/g, "-"],
  [/â€™/g, "'"],
  [/â€œ|â€/g, '"'],
  [/â€¦/g, "..."],
  [/\s+/g, " "],
];

const cleanText = (value) => {
  if (typeof value !== "string") return value;
  return replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value).trim();
};

const cleanDeep = (value) => {
  if (Array.isArray(value)) return value.map(cleanDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [cleanText(key), cleanDeep(entry)]));
  }
  return cleanText(value);
};

const cpu = (item) => cleanText(item.leaderSpecs?.CPU || item.leaderSpecs?.Processor || "");
const memory = (item) => cleanText(item.leaderSpecs?.Memory || "");
const storage = (item) => cleanText(item.leaderSpecs?.Storage || "");
const screen = (item) => cleanText(item.leaderSpecs?.Screen || item.leaderSpecs?.Display || "");
const os = (item) => cleanText(item.leaderSpecs?.["Operating System"] || "");

const processorShort = (text) => {
  const value = cleanText(text);
  const ultra = value.match(/Ultra\s+[579]\s+\d+[A-Z]*/i)?.[0];
  if (ultra) return ultra.replace(/\s+/g, " ");
  const core = value.match(/\bi[3579]-?\d+[A-Z0-9]*/i)?.[0];
  if (core) return core.replace(/^i/i, "i").replace(/i([3579])(\d)/, "i$1-$2");
  const ryzen = value.match(/Ryzen\s+[3579]\s+\d+[A-Z0-9]*/i)?.[0];
  if (ryzen) return ryzen.replace(/\s+/g, " ");
  const celeron = value.match(/Celeron\s+\w+/i)?.[0];
  if (celeron) return celeron.replace(/\s+/g, " ");
  const nSeries = value.match(/\bN\d{3,4}\b/i)?.[0];
  if (nSeries) return nSeries.toUpperCase();
  return "";
};

const screenSize = (text) => {
  const value = cleanText(text);
  const match = value.match(/(\d{2}(?:\.\d)?)\s*(?:\"|inch|in)/i);
  return match ? `${match[1]}"` : "";
};

const memoryShort = (text) => cleanText(text).match(/\b\d+\s*GB\b/i)?.[0]?.replace(/\s+/g, "") || "";
const storageShort = (text) => {
  const value = cleanText(text);
  return value.match(/\b\d+\s*TB\b/i)?.[0]?.replace(/\s+/g, "") || value.match(/\b\d+\s*GB\b/i)?.[0]?.replace(/\s+/g, "") || "";
};

const suffix = (parts) => parts.filter(Boolean).join(", ");

const conciseName = (item) => {
  if (item.manufacturer !== "Leader") {
    return cleanText(item.description);
  }

  const code = item.code;
  const proc = processorShort(cpu(item));
  const ram = memoryShort(memory(item));
  const disk = storageShort(storage(item));
  const display = screenSize(screen(item));

  if (code === "MNE-OPS-IDL05") return "Leader OPS Module MNE-OPS-IDL05";
  if (code === "SC8-PRO") return "Leader PC Stick SC8-PRO";
  if (code === "SCT4-Z1-R5P") return "Leader Companion SCT4-Z1 2-in-1 Convertible";
  if (code.startsWith("SRS-R55")) return `Resistance VR Striker R55-15V1 Gaming Notebook${ram === "32GB" ? " 32GB" : ""}`;
  if (code.startsWith("SRAV44")) {
    const tier = code.endsWith("-U") ? "Ultimate" : code.endsWith("-P") ? "Plus" : "Essential";
    return `Resistance Apache V44 ${tier} Gaming PC`;
  }
  if (code.startsWith("SV245")) return `Leader Visionary 24" AIO ${proc}`.trim();
  if (code.startsWith("SV275")) return `Leader Visionary 27" AIO ${proc}`.trim();
  if (code.startsWith("SV558")) return `Leader Visionary 558 Desktop ${proc}`.trim();
  if (code.startsWith("SV563")) return `Leader Visionary 563 Desktop ${proc}`.trim();
  if (code.startsWith("SV776")) return `Leader Visionary 776 Desktop ${proc}`.trim();
  if (code.startsWith("SS45")) return `Leader Slim Corporate Desktop SS45 ${proc}`.trim();
  if (code.startsWith("SS46")) return `Leader Corporate AI Desktop SS46 ${proc}`.trim();
  if (code.startsWith("SN15")) return `Leader Corporate N15 Mini PC ${proc}`.trim();
  if (code.startsWith("SN17")) return `Leader Corporate N17 Mini PC ${proc}`.trim();
  if (code.startsWith("SN4PRO")) return `Leader Mini PC NUC SN4PRO ${proc}`.trim();
  if (code.startsWith("SCE4")) return `Leader Breeze SCE4 14" Notebook ${suffix([proc, ram, disk])}`.trim();
  if (code.startsWith("SCE5")) return `Leader Companion SCE5 15.6" Notebook ${suffix([proc, ram, disk])}`.trim();
  if (code.startsWith("SCP4")) return `Leader Companion SCP4 ${display || "14\""} Notebook ${suffix([proc, ram, disk])}`.trim();
  if (code.startsWith("SCP5")) return `Leader Companion SCP5 15.6" Notebook ${suffix([proc, ram, disk])}`.trim();
  if (code.startsWith("SCP6")) return `Leader AI Companion SCP6 ${display || "16\""} Notebook ${suffix([proc, ram, disk])}`.trim();
  if (code.startsWith("SCU4")) return `Leader AI Companion SCU4 14" Notebook ${suffix([proc, ram, disk])}`.trim();
  if (code.startsWith("SCU6")) return `Leader AI Companion SCU6 16" Notebook ${suffix([proc, ram, disk])}`.trim();
  return cleanText(item.description);
};

const imageFor = (item) => {
  return item.imageUrl || "/product-placeholder.png";
};

const items = JSON.parse(fs.readFileSync(dataPath, "utf8")).map((raw) => {
  const item = cleanDeep(raw);
  const originalName = cleanText(raw.description);
  const specSummary = suffix([
    screen(item),
    cpu(item),
    memory(item),
    storage(item),
    os(item),
  ]);

  const detailPrefix = [
    originalName,
    specSummary ? `Key specifications: ${specSummary}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const longDescription = cleanText(item.longDescription || "");
  const imageUrl = imageFor(item);

  return {
    ...item,
    description: conciseName(item),
    longDescription: longDescription.startsWith(originalName)
      ? longDescription
      : cleanText(`${detailPrefix} ${longDescription}`),
    imageUrl,
    imageUrls: [imageUrl],
  };
});

fs.writeFileSync(dataPath, `${JSON.stringify(items, null, 2)}\n`);
