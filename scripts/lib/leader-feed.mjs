import { inflateRawSync } from "node:zlib";

const normalizeHeaderName = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const parseNumber = (value) => {
  const cleaned = String(value ?? "").replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

const parsePositiveNumber = (value) => {
  const parsed = parseNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
};

const normalizeGtin = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(digits) ? digits : "";
};

const cleanText = (value) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const parseCsvRecords = (text) => {
  const records = [];
  let field = "";
  let record = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        field += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      record.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      record.push(field);
      if (record.some((value) => value.trim())) records.push(record);
      field = "";
      record = [];
      continue;
    }

    field += char;
  }

  record.push(field);
  if (record.some((value) => value.trim())) records.push(record);

  return records;
};

const extractFirstCsvFromZip = (buffer) => {
  let eocdOffset = -1;
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 66000); offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }

  if (eocdOffset === -1) return null;

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let centralOffset = buffer.readUInt32LE(eocdOffset + 16);

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(centralOffset) !== 0x02014b50) break;

    const method = buffer.readUInt16LE(centralOffset + 10);
    const compressedSize = buffer.readUInt32LE(centralOffset + 20);
    const nameLength = buffer.readUInt16LE(centralOffset + 28);
    const extraLength = buffer.readUInt16LE(centralOffset + 30);
    const commentLength = buffer.readUInt16LE(centralOffset + 32);
    const localOffset = buffer.readUInt32LE(centralOffset + 42);
    const fileName = buffer.toString("utf8", centralOffset + 46, centralOffset + 46 + nameLength);

    if (/\.csv$/i.test(fileName)) {
      const localNameLength = buffer.readUInt16LE(localOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localOffset + 28);
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
      const output = method === 8 ? inflateRawSync(compressed) : compressed;
      return output.toString("utf8").replace(/^\uFEFF/, "");
    }

    centralOffset += 46 + nameLength + extraLength + commentLength;
  }

  return null;
};

const getCsvValue = (row, key) => row[normalizeHeaderName(key)] || "";

const parseQuantity = (value) => {
  const parsed = parseNumber(value);
  return parsed !== null && parsed > 0 ? parsed : 0;
};

const millimetresToCentimetres = (value) => (value === null ? null : Math.round((value / 10) * 10) / 10);

const applyMarkup = (value, percent) => (value === null ? null : Math.round(value * (1 + percent / 100) * 100) / 100);

const applyTax = (value, percent) => (value === null ? null : Math.round(value * (1 + percent / 100) * 100) / 100);

export const parseLeaderFeedCsv = (csv) => {
  const [headers = [], ...records] = parseCsvRecords(csv);
  const normalizedHeaders = headers.map(normalizeHeaderName);

  return records
    .map((record) => {
      const row = Object.fromEntries(normalizedHeaders.map((header, index) => [header, record[index] || ""]));
      const code = getCsvValue(row, "STOCK CODE").trim();
      const description = cleanText(getCsvValue(row, "SHORT DESCRIPTION"));
      const dealerBuyEx = parsePositiveNumber(getCsvValue(row, "DBP"));

      if (!code || !description) return null;

      const stockByWarehouse = {
        adl: parseQuantity(getCsvValue(row, "AA")),
        bne: parseQuantity(getCsvValue(row, "AQ")),
        syd: parseQuantity(getCsvValue(row, "AN")),
        mel: parseQuantity(getCsvValue(row, "AV")),
      };
      const stockQuantity =
        parseQuantity(getCsvValue(row, "AT")) ||
        stockByWarehouse.adl + stockByWarehouse.bne + stockByWarehouse.syd + stockByWarehouse.mel;
      const imageUrl = getCsvValue(row, "IMAGE").trim();
      const barcode = normalizeGtin(getCsvValue(row, "BAR CODE"));
      const category = cleanText(getCsvValue(row, "CATEGORY NAME"));
      const subcategory = cleanText(getCsvValue(row, "SUBCATEGORY NAME"));
      const longDescription = cleanText(getCsvValue(row, "LONG DESCRIPTION"));

      return {
        code,
        supplierCode: getCsvValue(row, "MANUFACTURER SKU").trim() || code,
        manufacturer: cleanText(getCsvValue(row, "MANUFACTURER")) || "Leader",
        description,
        longDescription: [longDescription, category, subcategory].filter(Boolean).join(" "),
        imageUrl,
        imageUrls: imageUrl ? [imageUrl] : [],
        leaderDealerBuyEx: dealerBuyEx,
        price: applyTax(applyMarkup(dealerBuyEx, 10), 10),
        stockQuantity,
        stockByWarehouse,
        category,
        subcategory,
        weightKg: parsePositiveNumber(getCsvValue(row, "WEIGHT")),
        heightCm: millimetresToCentimetres(parsePositiveNumber(getCsvValue(row, "HEIGHT"))),
        widthCm: millimetresToCentimetres(parsePositiveNumber(getCsvValue(row, "WIDTH"))),
        depthCm: millimetresToCentimetres(parsePositiveNumber(getCsvValue(row, "LENGTH"))),
        gtin: barcode,
        barcode,
      };
    })
    .filter(Boolean);
};

export const loadLeaderFeedProducts = async (feedUrl = process.env.LEADER_DATA_FEED_URL) => {
  if (!feedUrl) return [];

  const response = await fetch(feedUrl, {
    headers: {
      Accept: "application/zip,text/csv,text/plain,*/*",
    },
  });

  if (!response.ok) {
    throw new Error(`Leader feed returned ${response.status}.`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "";
  const csv =
    (/zip/i.test(contentType) || (bytes.length >= 4 && bytes.readUInt32LE(0) === 0x04034b50))
      ? extractFirstCsvFromZip(bytes)
      : bytes.toString("utf8").replace(/^\uFEFF/, "");

  if (!csv) {
    throw new Error("Leader feed did not contain a CSV file.");
  }

  return parseLeaderFeedCsv(csv);
};
