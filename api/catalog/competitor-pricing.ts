import { getSessionFromRequest } from "../auth/_shared.js";
import { readEnv, sendJson } from "../checkout/_shared.js";
import { normalizeCompetitorDomain } from "../../shared/competitor-provider-normalization.js";
import { getCompetitorPricingMode } from "./_competitorPricing.js";
import { runCompetitorProviderSync } from "./_competitorProviderSync.js";

const TABLES = {
  settings: "competitor_pricing_settings",
  observations: "competitor_price_observations",
  recommendations: "competitor_price_recommendations",
  sellers: "competitor_sellers",
  candidates: "competitor_discovery_candidates",
  syncRuns: "competitor_provider_sync_runs",
  productControls: "competitor_product_controls",
  productMatches: "competitor_product_matches",
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

const mutateRows = async (
  config: NonNullable<ReturnType<typeof getSupabaseRestConfig>>,
  path: string,
  method: "POST" | "PATCH",
  body: Record<string, unknown>,
) => {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Supabase returned ${response.status}.`);
  }
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) ? rows : [];
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export default async function handler(
  req: {
    method?: string;
    url?: string;
    headers?: { cookie?: string };
    body?: unknown;
  },
  res: {
    statusCode?: number;
    setHeader: (name: string, value: string) => void;
    end: (chunk?: string) => void;
  },
) {
  if (req.method !== "GET" && req.method !== "POST") {
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

  if (req.method === "POST") {
    let body: Record<string, unknown> = {};
    if (req.body && typeof req.body === "object") {
      body = req.body as Record<string, unknown>;
    } else if (typeof req.body === "string") {
      try {
        const parsed = JSON.parse(req.body);
        if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
      } catch {
        return sendJson(res, 400, { message: "The request body must be valid JSON." });
      }
    }
    const action = String(body.action || "").trim();

    if (action === "run-provider-sync") {
      try {
        const result = await runCompetitorProviderSync();
        if (result.skipped) {
          return sendJson(res, 409, {
            message: "Competitor discovery is disabled. Set COMPETITOR_DISCOVERY_ENABLED=true and redeploy.",
            ...result,
          });
        }
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        const diagnostics = result.diagnostics;
        return sendJson(res, 200, {
          ok: true,
          message: diagnostics
            ? `Scan cycle completed: ${result.productsRead} products submitted, ${diagnostics.tasksCollected} completed tasks collected, and ${diagnostics.searchMatchesQueued} seller lookups queued.`
            : `Competitor scan completed for ${result.productsRead} products.`,
          ...result,
        });
      } catch (error) {
        return sendJson(res, 502, {
          message: "The competitor scan failed.",
          detail: error instanceof Error ? error.message : "Unknown provider error.",
        });
      }
    }

    if (action === "set-product-mode") {
      const productCode = String(body.productCode || "").trim();
      const mode = String(body.mode || "").trim();
      if (!productCode || productCode.length > 200 || !["monitor_only", "automatic", "excluded"].includes(mode)) {
        return sendJson(res, 400, { message: "A valid product code and pricing mode are required." });
      }
      try {
        const now = new Date().toISOString();
        const existing = await fetchRows(
          config,
          `${TABLES.productControls}?select=product_code&product_code=eq.${encodeURIComponent(productCode)}&limit=1`,
        );
        const values = {
          product_code: productCode,
          mode,
          reason: String(body.reason || "").trim().slice(0, 500) || null,
          updated_by: session.email,
          updated_at: now,
        };
        if (existing.length > 0) {
          await mutateRows(
            config,
            `${TABLES.productControls}?product_code=eq.${encodeURIComponent(productCode)}`,
            "PATCH",
            values,
          );
        } else {
          await mutateRows(config, TABLES.productControls, "POST", values);
        }
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        return sendJson(res, 200, { ok: true, productCode, mode });
      } catch (error) {
        return sendJson(res, 503, {
          message: "The product pricing mode could not be saved.",
          detail: error instanceof Error ? error.message : "Unknown storage error.",
        });
      }
    }

    const candidateId = String(body.candidateId || "").trim();
    if (!isUuid(candidateId) || !["approve-seller", "reject-seller"].includes(action)) {
      return sendJson(res, 400, { message: "A valid candidate and review action are required." });
    }

    try {
      const candidates = await fetchRows(
        config,
        `${TABLES.candidates}?select=id,seller_name,seller_domain,provider&id=eq.${encodeURIComponent(candidateId)}&limit=1`,
      );
      const candidate = candidates[0];
      if (!candidate) return sendJson(res, 404, { message: "Discovery candidate not found." });

      const domain = normalizeCompetitorDomain(candidate.seller_domain);
      if (!domain || domain === "internext.com.au" || domain.endsWith(".internext.com.au")) {
        return sendJson(res, 400, { message: "The candidate seller domain is not valid." });
      }
      const now = new Date().toISOString();

      if (action === "approve-seller") {
        const existing = await fetchRows(
          config,
          `${TABLES.sellers}?select=id&domain=ilike.${encodeURIComponent(domain)}&limit=1`,
        );
        const sellerValues = {
          name: String(candidate.seller_name || domain).trim() || domain,
          domain,
          verified: true,
          enabled: true,
          provider: candidate.provider || null,
          verification_note: "Approved from provider discovery review.",
          verified_by: session.email,
          verified_at: now,
          updated_at: now,
        };
        if (existing[0]?.id) {
          await mutateRows(
            config,
            `${TABLES.sellers}?id=eq.${encodeURIComponent(existing[0].id)}`,
            "PATCH",
            sellerValues,
          );
        } else {
          await mutateRows(config, TABLES.sellers, "POST", sellerValues);
        }
      }

      await mutateRows(
        config,
        `${TABLES.candidates}?seller_domain=eq.${encodeURIComponent(domain)}&status=eq.pending`,
        "PATCH",
        {
          status: action === "approve-seller" ? "approved" : "rejected",
          reviewed_by: session.email,
          reviewed_at: now,
          updated_at: now,
        },
      );
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      return sendJson(res, 200, {
        ok: true,
        domain,
        status: action === "approve-seller" ? "approved" : "rejected",
        message: action === "approve-seller"
          ? "Seller approved. Eligible exact matches can be imported on the next provider sync."
          : "Seller rejected. Its listings cannot influence pricing.",
      });
    } catch (error) {
      return sendJson(res, 503, {
        message: "The competitor seller review could not be saved.",
        detail: error instanceof Error ? error.message : "Unknown storage error.",
      });
    }
  }

  const requestUrl = new URL(req.url || "/api/catalog/competitor-pricing", "https://internext.local");
  const productCode = requestUrl.searchParams.get("code")?.trim() || "";
  const encodedCode = encodeURIComponent(productCode);

  try {
    const [settingsRows, observations, recommendations, candidates, sellers, syncRuns, controlRows, productMatches] = await Promise.all([
      fetchRows(
        config,
        `${TABLES.settings}?select=enabled,undercut_amount_inc_gst,observation_max_age_hours,updated_at&id=eq.true&limit=1`,
      ),
      productCode
        ? fetchRows(
            config,
            `${TABLES.observations}?select=id,product_code,supplier_code,item_price_inc_gst,shipping_price_inc_gst,landed_price_inc_gst,in_stock,match_method,match_verified,observed_at,expires_at,competitor_product_url,seller:competitor_sellers(name,domain,verified,enabled)&product_code=eq.${encodedCode}&order=observed_at.desc&limit=25`,
          )
        : fetchRows(
            config,
            `${TABLES.observations}?select=id,product_code,supplier_code,item_price_inc_gst,shipping_price_inc_gst,landed_price_inc_gst,in_stock,match_method,match_verified,observed_at,expires_at,competitor_product_url,seller:competitor_sellers(name,domain,verified,enabled)&order=observed_at.desc&limit=100`,
          ),
      productCode
        ? fetchRows(
            config,
            `${TABLES.recommendations}?select=id,product_code,standard_price_inc_gst,minimum_allowed_price_inc_gst,competitor_price_inc_gst,recommended_price_inc_gst,status,decision_note,generated_at,expires_at&product_code=eq.${encodedCode}&order=generated_at.desc&limit=25`,
          )
        : fetchRows(
            config,
            `${TABLES.recommendations}?select=id,product_code,standard_price_inc_gst,minimum_allowed_price_inc_gst,competitor_price_inc_gst,recommended_price_inc_gst,status,decision_note,generated_at,expires_at&order=generated_at.desc&limit=100`,
          ),
      fetchRows(
        config,
        `${TABLES.candidates}?select=id,provider,product_code,seller_name,seller_domain,competitor_product_url,observed_price_inc_gst,observed_shipping_inc_gst,currency,in_stock,match_method,review_reason,status,last_seen_at${productCode ? `&product_code=eq.${encodedCode}` : "&status=eq.pending"}&order=last_seen_at.desc&limit=50`,
      ),
      fetchRows(
        config,
        `${TABLES.sellers}?select=id,name,domain,provider,verified,enabled,verified_at&order=name.asc&limit=250`,
      ),
      fetchRows(
        config,
        `${TABLES.syncRuns}?select=id,provider,status,products_read,listings_read,observations_stored,candidates_stored,requests_made,error_message,started_at,finished_at&order=started_at.desc&limit=10`,
      ),
      productCode
        ? fetchRows(
            config,
            `${TABLES.productControls}?select=product_code,mode,reason,updated_by,updated_at&product_code=eq.${encodedCode}&limit=1`,
          )
        : fetchRows(
            config,
            `${TABLES.productControls}?select=product_code,mode,reason,updated_by,updated_at&order=updated_at.desc&limit=500`,
          ),
      productCode
        ? fetchRows(
            config,
            `${TABLES.productMatches}?select=product_code,provider,provider_product_id,provider_product_name,match_method,verified,verified_at,last_seen_at&product_code=eq.${encodedCode}&order=last_seen_at.desc&limit=10`,
          )
        : fetchRows(
            config,
            `${TABLES.productMatches}?select=product_code,provider,provider_product_id,provider_product_name,match_method,verified,verified_at,last_seen_at&order=last_seen_at.desc&limit=250`,
          ),
    ]);
    const settings = settingsRows[0] || null;

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return sendJson(res, 200, {
      mode: getCompetitorPricingMode(),
      databaseEnabled: settings?.enabled === true,
      settings,
      observations,
      recommendations,
      candidates,
      sellers,
      syncRuns,
      productControl: productCode
        ? controlRows[0] || { product_code: productCode, mode: "monitor_only" }
        : null,
      productControls: productCode ? [] : controlRows,
      productMatches,
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
