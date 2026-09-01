import { getSessionFromRequest } from "../auth/_shared.js";
import { readEnv, sendJson } from "../checkout/_shared.js";
import { getCompetitorPricingMode } from "./_competitorPricing.js";

const TABLES = {
  settings: "competitor_pricing_settings",
  observations: "competitor_price_observations",
  recommendations: "competitor_price_recommendations",
};

const getSupabaseRestConfig = () => {
  const supabaseUrl = readEnv("SUPABASE_URL") || readEnv("VITE_SUPABASE_URL");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY") || readEnv("SERVICE_ROLE_SECRET_KEY");
  if (!supabaseUrl || !serviceRoleKey) return null;
  return { supabaseUrl: supabaseUrl.replace(/\/$/, ""), serviceRoleKey };
};

const fetchRows = async (
  config: NonNullable<ReturnType<typeof getSupabaseRestConfig>>,
  path: string,
) => {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Supabase returned ${response.status}.`);
  }
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
};

export default async function handler(
  req: {
    method?: string;
    url?: string;
    headers?: { cookie?: string };
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

  const session = getSessionFromRequest(req);
  if (session?.role !== "admin") {
    return sendJson(res, 403, { message: "Admin access is required." });
  }

  const config = getSupabaseRestConfig();
  if (!config) {
    return sendJson(res, 503, {
      message: "Supabase service role is not configured.",
      mode: getCompetitorPricingMode(),
      databaseEnabled: false,
    });
  }

  const requestUrl = new URL(req.url || "/api/catalog/competitor-pricing", "https://internext.local");
  const productCode = requestUrl.searchParams.get("code")?.trim() || "";
  const encodedCode = encodeURIComponent(productCode);

  try {
    const [settingsRows, observations, recommendations] = await Promise.all([
      fetchRows(
        config,
        `${TABLES.settings}?select=enabled,undercut_amount_inc_gst,observation_max_age_hours,updated_at&id=eq.true&limit=1`,
      ),
      productCode
        ? fetchRows(
            config,
            `${TABLES.observations}?select=id,product_code,supplier_code,item_price_inc_gst,shipping_price_inc_gst,landed_price_inc_gst,in_stock,match_method,match_verified,observed_at,expires_at,competitor_product_url,seller:competitor_sellers(name,domain,verified,enabled)&product_code=eq.${encodedCode}&order=observed_at.desc&limit=25`,
          )
        : Promise.resolve([]),
      productCode
        ? fetchRows(
            config,
            `${TABLES.recommendations}?select=id,product_code,standard_price_inc_gst,minimum_allowed_price_inc_gst,competitor_price_inc_gst,recommended_price_inc_gst,status,decision_note,generated_at,expires_at&product_code=eq.${encodedCode}&order=generated_at.desc&limit=25`,
          )
        : Promise.resolve([]),
    ]);
    const settings = settingsRows[0] || null;

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return sendJson(res, 200, {
      mode: getCompetitorPricingMode(),
      databaseEnabled: settings?.enabled === true,
      settings,
      observations,
      recommendations,
    });
  } catch (error) {
    return sendJson(res, 503, {
      message: "Competitor pricing storage is not ready. Apply supabase/competitor-pricing.sql when the feature is ready for testing.",
      detail: error instanceof Error ? error.message : "Unknown storage error.",
      mode: getCompetitorPricingMode(),
      databaseEnabled: false,
    });
  }
}

