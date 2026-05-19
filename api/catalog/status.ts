import { readEnv, sendJson } from "../checkout/_shared.js";

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
    alloys: {
      xmlFeedConfigured: Boolean(readEnv("ALLOYS_CATALOG_XML_FEED_URL")),
      csvFeedConfigured: Boolean(readEnv("ALLOYS_CATALOG_FEED_URL")),
      preferredSource: readEnv("ALLOYS_CATALOG_XML_FEED_URL") ? "xml" : readEnv("ALLOYS_CATALOG_FEED_URL") ? "csv" : "none",
    },
  });
}
