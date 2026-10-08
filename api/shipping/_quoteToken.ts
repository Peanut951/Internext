import { createHmac, timingSafeEqual } from "node:crypto";
import { readEnv } from "../checkout/_shared.js";

type QuoteTokenItem = {
  code?: string;
  qty?: number;
};

type QuoteTokenService = {
  name: string;
  price: number;
};

type QuoteTokenPayload = {
  version: 1;
  destinationPostcode: string;
  itemFingerprint: string;
  service: QuoteTokenService;
  expiresAt: number;
};

const QUOTE_TOKEN_TTL_MS = 15 * 60 * 1000;

const getSigningSecret = () =>
  readEnv("SHIPPING_QUOTE_SECRET") ||
  readEnv("AUTH_SESSION_SECRET") ||
  (process.env.NODE_ENV === "production" ? "" : "internext-local-shipping-quote-secret");

const getItemFingerprint = (items: QuoteTokenItem[]) =>
  items
    .map((item) => ({
      code: String(item.code || "").trim().toLowerCase(),
      qty: Math.max(1, Math.floor(Number(item.qty) || 1)),
    }))
    .filter((item) => item.code)
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((item) => `${item.code}:${item.qty}`)
    .join("|");

const sign = (payload: string, secret: string) =>
  createHmac("sha256", secret).update(payload).digest("base64url");

export const createShippingQuoteToken = (input: {
  destinationPostcode: string;
  items: QuoteTokenItem[];
  service: QuoteTokenService;
}) => {
  const secret = getSigningSecret();
  if (!secret) return undefined;

  const payload: QuoteTokenPayload = {
    version: 1,
    destinationPostcode: input.destinationPostcode.trim(),
    itemFingerprint: getItemFingerprint(input.items),
    service: {
      name: input.service.name,
      price: Math.round(input.service.price * 100) / 100,
    },
    expiresAt: Date.now() + QUOTE_TOKEN_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
};

export const verifyShippingQuoteToken = (input: {
  token?: string;
  destinationPostcode: string;
  items: QuoteTokenItem[];
}): QuoteTokenService | null => {
  const secret = getSigningSecret();
  const [encoded, signature] = String(input.token || "").split(".");
  if (!secret || !encoded || !signature) return null;

  const expected = sign(encoded, secret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as QuoteTokenPayload;
    if (
      payload.version !== 1 ||
      payload.expiresAt <= Date.now() ||
      payload.destinationPostcode !== input.destinationPostcode.trim() ||
      payload.itemFingerprint !== getItemFingerprint(input.items) ||
      !payload.service?.name ||
      !Number.isFinite(payload.service.price) ||
      payload.service.price <= 0
    ) {
      return null;
    }

    return payload.service;
  } catch {
    return null;
  }
};
