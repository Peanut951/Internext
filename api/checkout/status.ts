import { getStripeConfigStatus, sendJson } from "./_shared.js";

export default async function handler(
  req: {
    method?: string;
  },
  res: {
    statusCode?: number;
    setHeader: (name: string, value: string) => void;
    end: (chunk?: string) => void;
  },
) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { message: "Method not allowed." });
  }

  return sendJson(res, 200, {
    stripe: getStripeConfigStatus(),
  });
}
