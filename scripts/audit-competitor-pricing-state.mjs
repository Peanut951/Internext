import fs from "node:fs";
import path from "node:path";

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
};

loadEnvFile(path.resolve(".env.local"));
loadEnvFile(path.resolve(".env"));

const supabaseUrl = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_SECRET_KEY || "");
if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase service credentials are not configured.");

const fetchRows = async (query) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/${query}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) throw new Error(`${query} returned ${response.status}: ${await response.text()}`);
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
};

const [settings, active, recommendations, audit, observations, sellers, candidates, matches, runs] = await Promise.all([
  fetchRows("competitor_pricing_settings?select=enabled,observation_max_age_hours,updated_at&id=eq.true"),
  fetchRows("active_competitor_price_recommendations?select=product_code,recommended_price_inc_gst,standard_price_inc_gst,competitor_price_inc_gst,expires_at"),
  fetchRows("competitor_price_recommendations?select=product_code,status,recommended_price_inc_gst,generated_at,expires_at&order=generated_at.desc"),
  fetchRows("competitor_price_audit_log?select=product_code,event_type,previous_price_inc_gst,adjusted_price_inc_gst,created_at&order=created_at.desc&limit=500"),
  fetchRows("competitor_price_observations?select=product_code,observed_at,expires_at,match_verified,in_stock,price_includes_gst,shipping_verified&order=observed_at.desc&limit=500"),
  fetchRows("competitor_sellers?select=domain,verified,enabled"),
  fetchRows("competitor_discovery_candidates?select=status"),
  fetchRows("competitor_product_matches?select=product_code,verified"),
  fetchRows("competitor_provider_sync_runs?select=status,products_read,listings_read,observations_stored,candidates_stored,requests_made,error_message,started_at,finished_at&order=started_at.desc&limit=10"),
]);

const countBy = (rows, key) => rows.reduce((counts, row) => {
  const value = String(row[key] ?? "unknown");
  counts[value] = (counts[value] || 0) + 1;
  return counts;
}, {});
const now = Date.now();
const activatedEvents = audit.filter((row) => row.event_type === "activated");

console.log(JSON.stringify({
  settings: settings[0] || null,
  activeAdjustments: active.length,
  activeAdjustmentProducts: active.slice(0, 20),
  recommendationsByStatus: countBy(recommendations, "status"),
  activatedAuditEvents: activatedEvents.length,
  latestActivatedEvents: activatedEvents.slice(0, 20),
  auditEventsByType: countBy(audit, "event_type"),
  observationsReturned: observations.length,
  currentlyUnexpiredObservations: observations.filter((row) => Date.parse(row.expires_at) > now).length,
  fullyEligibleObservations: observations.filter((row) =>
    Date.parse(row.expires_at) > now &&
    row.match_verified === true &&
    row.in_stock === true &&
    row.price_includes_gst === true &&
    row.shipping_verified === true
  ).length,
  verifiedEnabledSellers: sellers.filter((row) => row.verified === true && row.enabled === true).length,
  sellerCount: sellers.length,
  candidatesByStatus: countBy(candidates, "status"),
  verifiedProductMatches: matches.filter((row) => row.verified === true).length,
  productMatchRows: matches.length,
  recentRuns: runs,
}, null, 2));
